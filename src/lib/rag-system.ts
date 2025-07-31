import { ChatOpenAI } from '@langchain/openai'
import { knowledgeBase } from './knowledge-base'
import { vectorStore, VectorMatch } from './vector-store'

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
  private isInitialized = false
  
  // Response cache
  private responseCache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL = 1000 * 60 * 30 // 30 minutes
  private readonly MAX_CACHE_SIZE = 100
  
  // Circuit breaker for API calls
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    state: 'closed'
  }
  private readonly MAX_FAILURES = 5
  private readonly CIRCUIT_BREAKER_TIMEOUT = 1000 * 60 * 5 // 5 minutes
  
  // OpenAI pricing (as of 2024/2025) per 1K tokens
  private readonly PRICING = {
    'gpt-4o-mini': {
      input: 0.00015,   // $0.15 per 1M tokens
      output: 0.0006    // $0.60 per 1M tokens
    },
    'text-embedding-3-small': {
      input: 0.00002    // $0.02 per 1M tokens
    }
  }

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000,
      timeout: 30000 // 30 second timeout
    })
  }

  // Utility methods for improvements
  private hashQuery(query: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
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
    baseDelay: number = 1000
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

  async query(userQuery: string, language: 'en' | 'de' = 'en'): Promise<RAGResponse> {
    const startTime = Date.now()
    const queryHash = this.hashQuery(userQuery + language)
    
    this.log('info', 'Query started', { query: userQuery.substring(0, 100), language })
    
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
      const enhancedQuery = await this.enhanceQuery(userQuery)
      
      // Step 2: Retrieve relevant documents
      const relevantChunks = await this.retrieveRelevantChunks(enhancedQuery, userQuery)
      
      // Step 3: Generate response with context and track tokens (with retry)
      const { response, tokenUsage } = await this.withRetry(
        () => this.generateResponse(userQuery, relevantChunks, language),
        3,
        1000
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
          () => this.generateFallbackResponse(userQuery, language),
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
  }

  private async enhanceQuery(query: string): Promise<string> {
    // Simple query enhancement - can be expanded with more sophisticated techniques
    const commonAbbreviations: Record<string, string> = {
      'jsx': 'JSX React JavaScript XML',
      'ssr': 'server-side rendering',
      'csr': 'client-side rendering',
      'ssg': 'static site generation',
      'isr': 'incremental static regeneration',
      'css': 'cascading style sheets styling',
      'api': 'application programming interface',
      'db': 'database',
      'auth': 'authentication authorization',
      'ui': 'user interface',
      'ux': 'user experience'
    }

    let enhancedQuery = query.toLowerCase()
    
    // Expand abbreviations
    Object.entries(commonAbbreviations).forEach(([abbr, expansion]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi')
      if (regex.test(enhancedQuery)) {
        enhancedQuery = enhancedQuery.replace(regex, `${abbr} ${expansion}`)
      }
    })

    return enhancedQuery
  }

  private async retrieveRelevantChunks(enhancedQuery: string, originalQuery: string): Promise<VectorMatch[]> {
    const chunks = knowledgeBase.getChunks()
    
    try {
      // Use hybrid search if vector store is available
      if (vectorStore.getInitializationStatus()) {
        return await vectorStore.hybridSearch(enhancedQuery, chunks, 0.7, 0.3, 8)
      } else {
        // Fallback to text-based search
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

  private async generateResponse(query: string, relevantChunks: VectorMatch[], language: 'en' | 'de' = 'en'): Promise<{ response: string; tokenUsage: TokenUsage }> {
    const context = relevantChunks
      .map((match, index) => `[${index + 1}] ${match.chunk.section}: ${match.chunk.content}`)
      .join('\n\n')

    const systemPrompt = language === 'de' ? 
      `Sie sind ein spezialisierter Modedesign-Studenten-Support-Assistent für ELLU Studios Kurse.

Ihre Aufgabe ist es, Modedesign-Studenten dabei zu helfen, Kursinhalte zu verstehen, Konzepte aus Videolektionen zu klären und zusätzliche Anleitung zu geben, wenn sie verwirrt sind oder Unterstützung brauchen.

Ihr Fachwissen umfasst:
- Schnittmuster-Grundlagen (Kurs 101): Maße, Zugaben, Nahtzugaben, Schnittmarkierungen
- Adobe Illustrator für Modedesign (Kurs 201): Technische Zeichnungen, Farbpaletten, Textilmuster, Präsentationen
- Drapier-Techniken (Kurs 301): Nesselstoff-Vorbereitung, Oberteil-Drapieren, Ärmel-Methoden, Bias-Techniken
- Mode-Konstruktionsmethoden (Kurs 401): Professionelles Nähen, Anpassungen, Änderungen, Veredelungstechniken

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

Geben Sie eine hilfreiche, lehrreiche Antwort, die das Lernen des Studenten unterstützt. Verweisen Sie auf spezifische Kursmodule oder Techniken aus dem Kontext, wenn zutreffend. Denken Sie daran, dass Sie Studenten helfen, die diese Fähigkeiten aktiv erlernen, seien Sie also ermutigend und gründlich in Ihren Erklärungen. Antworten Sie auf Deutsch.` :
      `You are a specialized fashion design student support assistant for ELLU Studios courses.

Your role is to help fashion design students understand course content, clarify concepts from video lessons, and provide additional guidance when they're stuck or confused.

Your expertise includes:
- Pattern Making Fundamentals (Course 101): Measurements, ease, seam allowances, pattern markings
- Adobe Illustrator for Fashion Design (Course 201): Technical flats, color palettes, textile patterns, presentations
- Draping Techniques (Course 301): Muslin preparation, bodice draping, sleeve methods, bias techniques
- Fashion Construction Methods (Course 401): Professional sewing, fitting, alterations, finishing techniques

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

Provide a helpful, educational response that supports the student's learning. Reference specific course modules or techniques from the context when applicable. Remember, you're helping students who are actively learning these skills, so be encouraging and thorough in your explanations.`

    try {
      const response = await this.llm.invoke(systemPrompt)
      
      // Try multiple ways to extract token usage from LangChain response
      let usage = null
      if (response.response_metadata?.tokenUsage) {
        usage = response.response_metadata.tokenUsage
      } else if (response.usage_metadata) {
        usage = response.usage_metadata
      } else if (response.additional_kwargs?.usage) {
        usage = response.additional_kwargs.usage
      } else if (response.response_metadata?.usage) {
        usage = response.response_metadata.usage
      }
      
      const promptTokens = usage?.prompt_tokens || usage?.input_tokens || usage?.promptTokens || 0
      const completionTokens = usage?.completion_tokens || usage?.output_tokens || usage?.completionTokens || 0
      const totalTokens = usage?.total_tokens || usage?.totalTokens || promptTokens + completionTokens
      
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
        response: response.content as string,
        tokenUsage
      }
    } catch (error) {
      console.error('Error generating LLM response:', error)
      throw error
    }
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

Hinweis: Diese Antwort basiert auf allgemeinem Modedesign-Wissen, da die spezifische Kursdokumentation vorübergehend nicht verfügbar ist. Ermutigen Sie den Studenten, auch ihre Kursmaterialien und Videos zu konsultieren. Antworten Sie auf Deutsch.` :
      `You are a fashion design instructor helping ELLU Studios students. The student asked: "${query}"

Provide a helpful response based on your general knowledge of fashion design, pattern making, Adobe Illustrator for fashion, draping techniques, and garment construction. 

Focus on:
- Clear, educational explanations appropriate for students
- Step-by-step guidance when possible
- Common techniques and best practices
- Encouragement and reassurance

Note: This response is based on general fashion design knowledge as the specific course documentation is temporarily unavailable. Encourage the student to also refer to their course materials and videos.`

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