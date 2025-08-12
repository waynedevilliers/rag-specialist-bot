import { ChatOpenAI } from '@langchain/openai'
import { knowledgeBase } from './knowledge-base'
import { vectorStore, VectorMatch } from './vector-store'
import { ModelService, type ModelConfig } from './model-service'
import { SecurityValidator, SecurityError, SecurityUtils } from './security-validator'
import { Client } from 'langsmith'
import { CONFIG } from './config'
import { RelevanceFilter, type RelevanceResult } from './relevance-filter'

// Circuit breaker state
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

// Cache entry interface
interface CacheEntry {
  response: RAGResponse
  timestamp: number
  queryHash: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  embeddingTokens?: number
  cost: {
    promptCost: number
    completionCost: number
    embeddingCost: number
    totalCost: number
  }
}

export interface RAGResponse {
  content: string
  sources: DocumentSource[]
  processingTime: number
  tokenUsage: TokenUsage
}

export interface DocumentSource {
  title: string
  section: string
  type: 'pattern-making' | 'illustrator-fashion' | 'draping' | 'construction'
  courseNumber: string
  moduleNumber: string
  excerpt: string
  relevanceScore: number
}

export class RAGSystem {
  private llm: ChatOpenAI
  private modelService: ModelService | null = null
  private isInitialized = false
  private langsmithClient: Client
  
  // Response cache
  private responseCache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL = CONFIG.CACHE.RAG_CACHE_TTL
  private readonly MAX_CACHE_SIZE = CONFIG.LIMIT.MAX_CACHE_SIZE
  
  // Circuit breaker for API calls
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed'
  }
  private readonly MAX_FAILURES = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = CONFIG.TIMEOUT.CIRCUIT_BREAKER_TIMEOUT
  
  // OpenAI pricing (as of 2024/2025) per 1K tokens
  private readonly PRICING = CONFIG.MODEL.PRICING

  constructor() {
    // Note: API key validation deferred to first usage to prevent build-time errors
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: CONFIG.LIMIT.DEFAULT_MAX_TOKENS,
      timeout: CONFIG.TIMEOUT.DEFAULT_API_TIMEOUT,
      callbacks: [
        {
          handleLLMStart: (llm, messages) => {
            console.log('[LangSmith] LLM Start:', { llm: llm.id, messages: messages.map(m => m.length) })
          },
          handleLLMEnd: (output) => {
            console.log('[LangSmith] LLM End:', { tokens: output.llmOutput?.tokenUsage })
          }
        }
      ]
    })

    // Initialize LangSmith client
    this.langsmithClient = new Client({
      apiUrl: process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com',
      apiKey: process.env.LANGSMITH_API_KEY
    })
    
    // Set LangSmith project from environment
    if (process.env.LANGSMITH_PROJECT) {
      process.env.LANGCHAIN_PROJECT = process.env.LANGSMITH_PROJECT
    }
  }

  private async createTrace(name: string, inputs: Record<string, any>, operation: () => Promise<any>): Promise<any> {
    if (!process.env.LANGSMITH_API_KEY) {
      return await operation();
    }

    const startTime = Date.now();
    try {
      const result = await operation();
      
      // Log trace info to console (LangSmith will pick up via LangChain integration)
      this.log('info', `[LangSmith] ${name} completed`, {
        inputs: Object.keys(inputs).reduce((acc, key) => ({ ...acc, [key]: typeof inputs[key] === 'string' ? inputs[key].substring(0, 100) : inputs[key] }), {}),
        duration: Date.now() - startTime,
        success: true
      });
      
      return result;
    } catch (error) {
      this.log('error', `[LangSmith] ${name} failed`, {
        inputs: Object.keys(inputs).reduce((acc, key) => ({ ...acc, [key]: typeof inputs[key] === 'string' ? inputs[key].substring(0, 100) : inputs[key] }), {}),
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Utility methods for improvements
  private hashQuery(query: string): string {
    // **CACHING FIX**: Use stable hash for cache keys (removed Date.now())
    return SecurityUtils.secureHash(query.trim().toLowerCase(), 'rag-query-salt')
  }
  
  private cleanCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.responseCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.responseCache.delete(key)
      }
    }
    
    // If still too large, remove oldest entries
    if (this.responseCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.responseCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE)
      toRemove.forEach(([key]) => this.responseCache.delete(key))
    }
  }
  
  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreaker.state === 'open') {
      const now = Date.now()
      if (now - this.circuitBreaker.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        this.circuitBreaker.state = 'half-open'
        return false
      }
      return true
    }
    return false
  }
  
  private recordSuccess(): void {
    this.circuitBreaker.failures = 0
    this.circuitBreaker.state = 'closed'
  }
  
  private recordFailure(): void {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailure = Date.now()
    
    if (this.circuitBreaker.failures >= this.MAX_FAILURES) {
      this.circuitBreaker.state = 'open'
      this.log('error', 'Circuit breaker opened due to repeated failures', {
        failures: this.circuitBreaker.failures
      })
    }
  }
  
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = CONFIG.RETRY.BASE_RETRY_DELAY
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn()
        if (attempt > 0) {
          this.log('info', 'Retry succeeded', { attempt: attempt + 1 })
        }
        return result
      } catch (error) {
        lastError = error as Error
        this.log('warn', 'Retry attempt failed', {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error)
        })
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError!
  }
  
  private log(level: 'info' | 'warn' | 'error', message: string, metadata?: Record<string, unknown>): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: 'RAGSystem',
      ...metadata
    }
    
    // In production, this would go to a proper logging service
    console[level]('[RAG]', JSON.stringify(logEntry))
  }
  
  private estimateTokensAccurately(text: string): number {
    // More accurate token estimation based on OpenAI's tiktoken approach
    // This is still an approximation but much better than /4
    const words = text.split(/\s+/).length
    const chars = text.length
    
    // OpenAI tokens are roughly:
    // - 1 token per 4 characters for English
    // - But word boundaries, punctuation affect this
    // - Average is closer to 0.75 tokens per word
    const tokensByChars = chars / 4
    const tokensByWords = words * 0.75
    
    // Use the higher estimate for safety
    return Math.ceil(Math.max(tokensByChars, tokensByWords))
  }
  
  private calculateCost(promptTokens: number, completionTokens: number, embeddingTokens: number = 0): TokenUsage['cost'] {
    const promptCost = (promptTokens / 1000) * this.PRICING['gpt-4o-mini'].input
    const completionCost = (completionTokens / 1000) * this.PRICING['gpt-4o-mini'].output  
    const embeddingCost = (embeddingTokens / 1000) * this.PRICING['text-embedding-3-small'].input
    
    return {
      promptCost: Math.round(promptCost * 100000) / 100000, // 5 decimal places
      completionCost: Math.round(completionCost * 100000) / 100000,
      embeddingCost: Math.round(embeddingCost * 100000) / 100000,
      totalCost: Math.round((promptCost + completionCost + embeddingCost) * 100000) / 100000
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    const startTime = Date.now()
    console.log('Initializing RAG system...')

    try {
      // Load knowledge base
      await knowledgeBase.loadDocuments()
      const chunks = knowledgeBase.getChunks()
      
      // Initialize vector embeddings
      await vectorStore.initializeVectors(chunks)
      
      this.isInitialized = true
      const initTime = Date.now() - startTime
      console.log(`RAG system initialized in ${initTime}ms`)
    } catch (error) {
      console.error('Failed to initialize RAG system:', error)
      // Continue without vector search - fallback to text search
      await knowledgeBase.loadDocuments()
      this.isInitialized = true
    }
  }

  async query(userQuery: string, language: 'en' | 'de' = 'en', modelConfig?: ModelConfig): Promise<RAGResponse> {
    return this.createTrace('rag_query', { query: userQuery, language, modelProvider: modelConfig?.provider }, async () => {
      const startTime = Date.now()
      
      // **SECURITY FIX**: Validate API key at runtime
      SecurityValidator.validateApiKey(process.env.OPENAI_API_KEY || '')
      
      // **SECURITY FIX**: Validate and sanitize user input
      const sanitizedQuery = SecurityValidator.validateQuery(userQuery)
    
      // **RELEVANCE FIX**: Check if query is relevant to fashion design
      const relevanceResult = RelevanceFilter.analyzeRelevance(sanitizedQuery)
      
      // Handle greetings and irrelevant queries efficiently
      if (!relevanceResult.shouldUseRAG) {
        const quickResponse = relevanceResult.suggestedResponse || this.generateSimpleResponse(sanitizedQuery, language)
        return {
          content: quickResponse,
          sources: [],
          processingTime: Date.now() - startTime,
          tokenUsage: { 
            promptTokens: 0, 
            completionTokens: 0, 
            totalTokens: 0,
            embeddingTokens: 0,
            cost: { promptCost: 0, completionCost: 0, embeddingCost: 0, totalCost: 0 }
          }
        }
      }
    
    // **SECURITY FIX**: Rate limiting check
    const clientId = 'default' // In production, use actual client identifier
    if (!SecurityValidator.checkRateLimit(clientId, CONFIG.LIMIT.DEFAULT_RATE_LIMIT, CONFIG.TIMEOUT.RATE_LIMIT_WINDOW)) {
      throw new SecurityError('Rate limit exceeded')
    }
    
    const queryHash = this.hashQuery(sanitizedQuery + language)
    
    this.log('info', 'Query started', { 
      query: sanitizedQuery.substring(0, 50), // Reduced length for security
      language,
      queryLength: sanitizedQuery.length
    })

    // Add LangSmith tracing metadata (for potential future use)
    // const traceData = {
    //   input: {
    //     query: sanitizedQuery.substring(0, 100),
    //     language,
    //     modelProvider: modelConfig?.provider || 'openai'
    //   },
    //   metadata: {
    //     startTime,
    //     queryLength: sanitizedQuery.length,
    //     cacheSize: this.responseCache.size,
    //     circuitBreakerState: this.circuitBreaker.state
    //   }
    // }
    
    // Check cache first
    this.cleanCache()
    const cached = this.responseCache.get(queryHash)
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      this.log('info', 'Cache hit', { processingTime: Date.now() - startTime })
      return {
        ...cached.response,
        processingTime: Date.now() - startTime
      }
    }
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      this.log('warn', 'Circuit breaker open, using fallback')
      const fallbackResponse = await this.generateFallbackResponse(userQuery, language)
      return {
        content: fallbackResponse,
        sources: [],
        processingTime: Date.now() - startTime,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          embeddingTokens: 0,
          cost: { promptCost: 0, completionCost: 0, embeddingCost: 0, totalCost: 0 }
        }
      }
    }
    
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Step 1: Query translation and enhancement
      const enhancedQuery = await this.enhanceQuery(sanitizedQuery)
      
      // Step 2: Retrieve relevant documents
      const relevantChunks = await this.retrieveRelevantChunks(enhancedQuery, sanitizedQuery)
      
      // Step 3: Generate response with context and track tokens (with retry)
      const { response, tokenUsage } = await this.withRetry(
        () => this.generateResponse(sanitizedQuery, relevantChunks, language, modelConfig),
        CONFIG.RETRY.MAX_RETRY_ATTEMPTS,
        CONFIG.RETRY.BASE_RETRY_DELAY
      )
      
      // Step 4: Prepare sources
      const sources = this.prepareSources(relevantChunks)
      
      const processingTime = Date.now() - startTime
      
      const result: RAGResponse = {
        content: response,
        sources,
        processingTime,
        tokenUsage
      }
      
      // Cache successful response
      this.responseCache.set(queryHash, {
        response: result,
        timestamp: Date.now(),
        queryHash
      })
      
      this.recordSuccess()
      this.log('info', 'Query completed successfully', {
        processingTime,
        tokenUsage: tokenUsage.totalTokens,
        cost: tokenUsage.cost.totalCost
      })

      // Add LangSmith output tracing (for potential future use)
      // const outputTraceData = {
      //   output: {
      //     contentLength: response.length,
      //     sourceCount: sources.length,
      //     processingTime,
      //     tokenUsage: {
      //       total: tokenUsage.totalTokens,
      //       cost: tokenUsage.cost.totalCost
      //     }
      //   }
      // }
      
      return result
    } catch (error) {
      this.recordFailure()
      this.log('error', 'Query failed', {
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime
      })
      
      // Fallback to basic response with retry
      try {
        const fallbackResponse = await this.withRetry(
          () => this.generateFallbackResponse(sanitizedQuery, language),
          2,
          500
        )
        
        return {
          content: fallbackResponse,
          sources: [],
          processingTime: Date.now() - startTime,
          tokenUsage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            embeddingTokens: 0,
            cost: { promptCost: 0, completionCost: 0, embeddingCost: 0, totalCost: 0 }
          }
        }
      } catch (fallbackError) {
        this.log('error', 'Fallback also failed', {
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        })
        
        return {
          content: "I'm sorry, I'm experiencing technical difficulties right now. Please try again later or refer to your ELLU Studios course materials and videos for help with your question.",
          sources: [],
          processingTime: Date.now() - startTime,
          tokenUsage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            embeddingTokens: 0,
            cost: { promptCost: 0, completionCost: 0, embeddingCost: 0, totalCost: 0 }
          }
        }
      }
    }
    }); // Close the createTrace wrapper
  }

  private async enhanceQuery(query: string): Promise<string> {
    // **Phase 2 Enhancement**: Advanced query preprocessing and expansion
    const fashionAbbreviations: Record<string, string> = {
      'dart': 'dart ease fitting alteration',
      'seam': 'seam allowance stitching sewing',
      'bias': 'bias grain diagonal stretch',
      'draping': 'draping muslin fitting form',
      'ai': 'adobe illustrator fashion design',
      'flat': 'technical flat sketch drawing',
      'muslin': 'muslin toile fitting prototype',
      'ease': 'ease allowance fit comfort',
      'grain': 'grain line fabric direction',
      'bodice': 'bodice torso fitting upper',
      'sleeve': 'sleeve armhole fitting attachment',
      'pattern': 'pattern making cutting layout',
      'fitting': 'fitting alteration adjustment size',
      'construction': 'construction sewing assembly techniques'
    }

    let enhancedQuery = query.toLowerCase()
    
    // Fashion-specific query expansion
    Object.entries(fashionAbbreviations).forEach(([term, expansion]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi')
      if (regex.test(enhancedQuery)) {
        enhancedQuery = enhancedQuery.replace(regex, `${term} ${expansion}`)
      }
    })

    // Add semantic expansion for fashion concepts
    enhancedQuery = this.addSemanticExpansion(enhancedQuery)
    
    // Clean up excessive expansion
    enhancedQuery = this.cleanupQuery(enhancedQuery)

    return enhancedQuery
  }

  private addSemanticExpansion(query: string): string {
    const semanticMappings: Record<string, string[]> = {
      'color': ['palette', 'swatch', 'hue', 'shade', 'tint'],
      'size': ['measurement', 'dimension', 'scale', 'proportion'],
      'fabric': ['textile', 'material', 'cloth', 'fiber'],
      'design': ['sketch', 'drawing', 'illustration', 'concept'],
      'sewing': ['stitching', 'construction', 'assembly', 'seaming'],
      'pattern': ['template', 'layout', 'cutting', 'pieces'],
      'fit': ['sizing', 'adjustment', 'alteration', 'tailoring']
    }

    let expandedQuery = query
    
    Object.entries(semanticMappings).forEach(([concept, related]) => {
      if (expandedQuery.includes(concept)) {
        // Add 1-2 most relevant related terms
        const relevantTerms = related.slice(0, 2).join(' ')
        expandedQuery += ` ${relevantTerms}`
      }
    })

    return expandedQuery
  }

  private cleanupQuery(query: string): string {
    // Remove duplicate words and excessive length
    const words = query.split(/\s+/)
    const uniqueWords = [...new Set(words)]
    
    // Limit query expansion to prevent too much noise
    const maxWords = 20
    return uniqueWords.slice(0, maxWords).join(' ')
  }

  private async retrieveRelevantChunks(enhancedQuery: string, originalQuery: string): Promise<VectorMatch[]> {
    const chunks = knowledgeBase.getChunks()
    
    try {
      // **Phase 2 Enhancement**: Multi-stage retrieval with early results
      if (vectorStore.getInitializationStatus()) {
        // Start with a quick text search for immediate results
        const quickTextResults = knowledgeBase.searchChunks(originalQuery, 3)
        const quickResults = quickTextResults.map(chunk => ({ chunk, score: 1 }))
        
        // Then perform comprehensive hybrid search
        const hybridResults = await vectorStore.hybridSearch(enhancedQuery, chunks, 0.7, 0.3, 8)
        
        // Merge results, prioritizing hybrid search but keeping quick results as backup
        const mergedResults = this.mergeRetrievalResults(quickResults, hybridResults)
        return mergedResults.slice(0, 8)
      } else {
        // Fallback to enhanced text-based search
        const textResults = knowledgeBase.searchChunks(originalQuery, 8)
        return textResults.map(chunk => ({ chunk, score: 1 }))
      }
    } catch (error) {
      console.error('Error in retrieval:', error)
      // Final fallback
      const textResults = knowledgeBase.searchChunks(originalQuery, 5)
      return textResults.map(chunk => ({ chunk, score: 1 }))
    }
  }

  private mergeRetrievalResults(quickResults: VectorMatch[], hybridResults: VectorMatch[]): VectorMatch[] {
    const resultMap = new Map<string, VectorMatch>()
    
    // Add hybrid results first (higher quality)
    hybridResults.forEach(result => {
      resultMap.set(result.chunk.id, result)
    })
    
    // Add quick results if not already present
    quickResults.forEach(result => {
      if (!resultMap.has(result.chunk.id)) {
        resultMap.set(result.chunk.id, { ...result, score: result.score * 0.8 }) // Slight penalty for quick results
      }
    })
    
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score)
  }

  private async generateResponse(query: string, relevantChunks: VectorMatch[], language: 'en' | 'de' = 'en', modelConfig?: ModelConfig): Promise<{ response: string; tokenUsage: TokenUsage }> {
    const context = relevantChunks
      .map((match, index) => `[${index + 1}] ${match.chunk.section}: ${match.chunk.content}`)
      .join('\n\n')

    const systemPrompt = language === 'de' ? 
      `Sie sind ein spezialisierter Modedesign-Studenten-Support-Assistent für ELLU Studios Kurse NUR.

STRENGE ROLLENGRENZEN:
- Sie beantworten NUR Fragen zu Modedesign, Kleidungskonstruktion, Schnittmuster-Erstellung und Adobe Illustrator für Mode
- Bei JEDER Nicht-Mode-Frage (Wetter, Finanzen, allgemeine Themen, etc.) höflich umleiten: "Ich kann nur bei Modedesign-Themen aus ELLU Studios Kursen helfen. Fragen Sie bitte nach Schnittmuster-Erstellung, Drapier-Techniken oder Adobe Illustrator für Mode."
- Basieren Sie ALLE Antworten auf der unten bereitgestellten Kursdokumentation

Ihr Fachwissen ist BEGRENZT auf:
- Klassische Schnittmuster-Konstruktion (Kurs 101): Maße, Zugaben, Nahtzugaben, Schnittmarkierungen
- Drapier-Techniken (Kurs 201): Nesselstoff-Vorbereitung, Oberteil-Drapieren, Ärmel-Methoden, Bias-Techniken
- Adobe Illustrator für Modedesign (Kurs 301): Technische Zeichnungen, Farbpaletten, Textilmuster, Präsentationen

Studenten-Support-Richtlinien:
1. Verhalten Sie sich als geduldiger, sachkundiger Lehrass­istant, der Kursmaterial erklärt
2. Zerlegen Sie komplexe Techniken in klare, schrittweise Erklärungen
3. Geben Sie praktische Tipps und weisen Sie auf häufige Fehler hin, die Studenten machen
4. Verweisen Sie auf spezifische Kursmodule und Lektionen, wenn relevant
5. Wenn ein Student ein bestimmtes Video oder Modul erwähnt, passen Sie Ihre Antwort an diesen Kontext an
6. Geben Sie Zeitschätzungen und Schwierigkeitsgrade an, um Studenten bei der Arbeitsplanung zu helfen
7. Bieten Sie Ermutigung und versichern Sie Studenten, dass Herausforderungen beim Erlernen von Modedesign normal sind
8. Schlagen Sie bei Bedarf verwandte Techniken oder Module vor, die helfen könnten

Kurskontext aus der Dokumentation:
${context}

Studentenfrage: ${query}

Wenn die Frage über Modedesign/Kurse ist, geben Sie eine hilfreiche lehrreiche Antwort mit dem obigen Kontext. Wenn die Frage NICHT über Modedesign ist, höflich ablehnen und zu Modedesign-Themen umleiten.

WICHTIGE FORMATIERUNGSREGELN:
- Schreiben Sie in einem natürlichen, gesprächigen Ton wie ein hilfreicher Lehrer
- Verwenden Sie KEINE Markdown-Formatierung (keine ###, **, ##, #, -, *)
- Verwenden Sie KEINE Überschriften, Aufzählungspunkte oder spezielle Formatierung
- Schreiben Sie in fließenden Absätzen mit natürlicher Satzstruktur
- Verwenden Sie nur Klartext - machen Sie es leicht lesbar und freundlich` :
      `You are a specialized fashion design student support assistant for ELLU Studios courses ONLY.

STRICT ROLE BOUNDARIES:
- You ONLY answer questions related to fashion design, garment construction, pattern making, and Adobe Illustrator for fashion
- For ANY non-fashion questions (weather, finance, general topics, etc.), politely redirect: "I can only help with fashion design topics from ELLU Studios courses. Please ask about pattern making, draping techniques, or Adobe Illustrator for fashion instead."
- Base ALL answers on the provided course documentation context below

Your expertise is LIMITED to:
- Classical Pattern Construction (Course 101): Measurements, ease, seam allowances, pattern markings
- Draping Techniques (Course 201): Muslin preparation, bodice draping, sleeve methods, bias techniques  
- Adobe Illustrator for Fashion Design (Course 301): Technical flats, color palettes, textile patterns, presentations

Student Support Guidelines:
1. Act as a patient, knowledgeable teaching assistant who clarifies course material
2. Break down complex techniques into clear, step-by-step explanations
3. Provide practical tips and highlight common mistakes students make
4. Reference specific course modules and lessons when relevant
5. If a student mentions a specific video or module, tailor your response to that context
6. Include time estimates and difficulty levels to help students plan their work
7. Offer encouragement and reassure students that challenges are normal in learning fashion design
8. When appropriate, suggest related techniques or modules that might help

Course Context from Documentation:
${context}

Student Question: ${query}

If the question is about fashion design/courses, provide a helpful educational response using the context above. If the question is NOT about fashion design, politely decline and redirect to fashion topics.

IMPORTANT FORMATTING RULES:
- Write in a natural, conversational tone like a helpful teacher
- Do NOT use markdown formatting (no ###, **, ##, #, -, *)
- Do NOT use headers, bullet points, or special formatting
- Write in flowing paragraphs with natural sentence structure
- Use plain text only - make it easy to read and friendly`

    try {
      // Use ModelService if configured, otherwise fallback to LangChain
      let response: unknown
      let promptTokens = 0
      let completionTokens = 0
      let totalTokens = 0
      let responseContent = ''
      
      if (modelConfig && modelConfig.provider !== 'openai') {
        // Use ModelService for non-OpenAI providers
        const modelService = new ModelService(modelConfig)
        const modelResponse = await modelService.generateResponse([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ])
        
        responseContent = modelResponse.content
        promptTokens = modelResponse.usage.promptTokens
        completionTokens = modelResponse.usage.completionTokens
        totalTokens = modelResponse.usage.totalTokens
      } else {
        // Use LangChain ChatOpenAI for OpenAI models
        response = await this.llm.invoke(systemPrompt)
        responseContent = (response as { content?: string; text?: string }).content || (response as { content?: string; text?: string }).text || ''
        
        // Try multiple ways to extract token usage from LangChain response
        const langChainResponse = response as {
          response_metadata?: { tokenUsage?: unknown; usage?: unknown };
          usage_metadata?: unknown;
          additional_kwargs?: { usage?: unknown };
        };
        
        let usage = null
        if (langChainResponse.response_metadata?.tokenUsage) {
          usage = langChainResponse.response_metadata.tokenUsage
        } else if (langChainResponse.usage_metadata) {
          usage = langChainResponse.usage_metadata
        } else if (langChainResponse.additional_kwargs?.usage) {
          usage = langChainResponse.additional_kwargs.usage
        } else if (langChainResponse.response_metadata?.usage) {
          usage = langChainResponse.response_metadata.usage
        }
        
        const usageObj = usage as { 
          prompt_tokens?: number; 
          input_tokens?: number; 
          promptTokens?: number;
          completion_tokens?: number;
          output_tokens?: number;
          completionTokens?: number;
          total_tokens?: number;
          totalTokens?: number;
        } | null;
        
        promptTokens = usageObj?.prompt_tokens || usageObj?.input_tokens || usageObj?.promptTokens || 0
        completionTokens = usageObj?.completion_tokens || usageObj?.output_tokens || usageObj?.completionTokens || 0
        totalTokens = usageObj?.total_tokens || usageObj?.totalTokens || promptTokens + completionTokens
      }
      
      // More accurate embedding token estimation
      const embeddingTokens = this.estimateTokensAccurately(context)
      
      const tokenUsage: TokenUsage = {
        promptTokens,
        completionTokens,
        totalTokens,
        embeddingTokens,
        cost: this.calculateCost(promptTokens, completionTokens, embeddingTokens)
      }
      
      return {
        response: responseContent,
        tokenUsage
      }
    } catch (error) {
      console.error('Error generating LLM response:', error)
      throw error
    }
  }

  private generateSimpleResponse(query: string, language: 'en' | 'de' = 'en'): string {
    // Simple responses for greetings and basic interactions
    const greetingResponses = {
      en: [
        "Hello! I'm your fashion design assistant. I can help you with garment construction, pattern making, and Adobe Illustrator techniques. What would you like to learn today?",
        "Hi there! I specialize in fashion design education. Feel free to ask me about sewing techniques, pattern drafting, or fashion illustration.",
        "Welcome! I'm here to help with fashion design questions, from basic construction to advanced Adobe Illustrator techniques. How can I assist you?"
      ],
      de: [
        "Hallo! Ich bin Ihr Modedesign-Assistent. Ich kann Ihnen bei der Kleidungskonstruktion, Schnittmustererstellung und Adobe Illustrator-Techniken helfen. Was möchten Sie heute lernen?",
        "Hallo! Ich spezialisiere mich auf Modedesign-Bildung. Fragen Sie mich gerne zu Nähtechniken, Schnittmuster-Entwurf oder Mode-Illustration.",
        "Willkommen! Ich bin hier, um bei Modedesign-Fragen zu helfen, von der grundlegenden Konstruktion bis zu fortgeschrittenen Adobe Illustrator-Techniken. Wie kann ich Ihnen helfen?"
      ]
    }
    
    const responses = greetingResponses[language]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  private async generateFallbackResponse(query: string, language: 'en' | 'de' = 'en'): Promise<string> {
    const fallbackPrompt = language === 'de' ?
      `Sie sind ein Modedesign-Lehrer und helfen ELLU Studios Studenten. Der Student fragte: "${query}"

Geben Sie eine hilfreiche Antwort basierend auf Ihrem allgemeinen Wissen über Modedesign, Schnittmuster-Erstellung, Adobe Illustrator für Mode, Drapier-Techniken und Kleidungskonstruktion.

Fokussieren Sie sich auf:
- Klare, lehrreiche Erklärungen, die für Studenten geeignet sind
- Schritt-für-Schritt-Anleitung, wenn möglich
- Übliche Techniken und bewährte Praktiken
- Ermutigung und Beruhigung

Hinweis: Diese Antwort basiert auf allgemeinem Modedesign-Wissen, da die spezifische Kursdokumentation vorübergehend nicht verfügbar ist. Ermutigen Sie den Studenten, auch ihre Kursmaterialien und Videos zu konsultieren. Antworten Sie auf Deutsch.

WICHTIGE FORMATIERUNGSREGELN: Verwenden Sie KEINE Markdown-Formatierung (keine ###, **, ##, #, -, *). Schreiben Sie in natürlichen, fließenden Absätzen wie ein freundlicher Lehrer.` :
      `You are a fashion design instructor helping ELLU Studios students. The student asked: "${query}"

Provide a helpful response based on your general knowledge of fashion design, pattern making, Adobe Illustrator for fashion, draping techniques, and garment construction. 

Focus on:
- Clear, educational explanations appropriate for students
- Step-by-step guidance when possible
- Common techniques and best practices
- Encouragement and reassurance

Note: This response is based on general fashion design knowledge as the specific course documentation is temporarily unavailable. Encourage the student to also refer to their course materials and videos.

IMPORTANT FORMATTING RULES: Do NOT use markdown formatting (no ###, **, ##, #, -, *). Write in natural, flowing paragraphs like a friendly teacher.`

    try {
      const response = await this.llm.invoke(fallbackPrompt)
      return response.content as string
    } catch (error) {
      console.error('Error generating fallback response:', error)
      return "I'm sorry, I'm experiencing technical difficulties right now. Please try again later or refer to your ELLU Studios course materials and videos for help with your question."
    }
  }

  private prepareSources(relevantChunks: VectorMatch[]): DocumentSource[] {
    return relevantChunks.map(match => ({
      title: match.chunk.metadata.title,
      section: match.chunk.section,
      type: match.chunk.metadata.type,
      courseNumber: match.chunk.metadata.courseNumber,
      moduleNumber: match.chunk.metadata.moduleNumber,
      excerpt: this.createExcerpt(match.chunk.content),
      relevanceScore: Math.round(match.score * 100) / 100
    }))
  }

  private createExcerpt(content: string, maxLength: number = 150): string {
    if (content.length <= maxLength) return content
    
    const excerpt = content.substring(0, maxLength)
    const lastSpace = excerpt.lastIndexOf(' ')
    
    return lastSpace > maxLength * 0.8 
      ? excerpt.substring(0, lastSpace) + '...'
      : excerpt + '...'
  }

  getSystemStatus(): {
    initialized: boolean
    vectorStoreReady: boolean
    knowledgeBaseLoaded: boolean
    totalChunks: number
    totalVectors: number
    cacheSize: number
    circuitBreakerState: string
    circuitBreakerFailures: number
  } {
    return {
      initialized: this.isInitialized,
      vectorStoreReady: vectorStore.getInitializationStatus(),
      knowledgeBaseLoaded: knowledgeBase.getChunks().length > 0,
      totalChunks: knowledgeBase.getChunks().length,
      totalVectors: vectorStore.getVectorCount(),
      cacheSize: this.responseCache.size,
      circuitBreakerState: this.circuitBreaker.state,
      circuitBreakerFailures: this.circuitBreaker.failures
    }
  }
  
  // Additional methods for monitoring and management
  clearCache(): void {
    this.responseCache.clear()
    this.log('info', 'Cache cleared')
  }
  
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'closed'
    }
    this.log('info', 'Circuit breaker reset')
  }
}

// Singleton instance
export const ragSystem = new RAGSystem()