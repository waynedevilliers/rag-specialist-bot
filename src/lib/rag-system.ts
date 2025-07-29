import { ChatOpenAI } from '@langchain/openai'
import { knowledgeBase, DocumentChunk } from './knowledge-base'
import { vectorStore, VectorMatch } from './vector-store'

export interface RAGResponse {
  content: string
  sources: DocumentSource[]
  processingTime: number
}

export interface DocumentSource {
  title: string
  section: string
  type: 'nextjs' | 'react' | 'troubleshooting'
  excerpt: string
  relevanceScore: number
}

export class RAGSystem {
  private llm: ChatOpenAI
  private isInitialized = false

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 2000
    })
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

  async query(userQuery: string): Promise<RAGResponse> {
    const startTime = Date.now()
    
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Step 1: Query translation and enhancement
      const enhancedQuery = await this.enhanceQuery(userQuery)
      
      // Step 2: Retrieve relevant documents
      const relevantChunks = await this.retrieveRelevantChunks(enhancedQuery, userQuery)
      
      // Step 3: Generate response with context
      const response = await this.generateResponse(userQuery, relevantChunks)
      
      // Step 4: Prepare sources
      const sources = this.prepareSources(relevantChunks)
      
      const processingTime = Date.now() - startTime
      
      return {
        content: response,
        sources,
        processingTime
      }
    } catch (error) {
      console.error('Error in RAG query:', error)
      
      // Fallback to basic response
      const fallbackResponse = await this.generateFallbackResponse(userQuery)
      
      return {
        content: fallbackResponse,
        sources: [],
        processingTime: Date.now() - startTime
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

  private async generateResponse(query: string, relevantChunks: VectorMatch[]): Promise<string> {
    const context = relevantChunks
      .map((match, index) => `[${index + 1}] ${match.chunk.section}: ${match.chunk.content}`)
      .join('\n\n')

    const systemPrompt = `You are a specialized technical documentation assistant for Next.js and React development. 

Your expertise includes:
- Next.js App Router, API routes, server/client components
- React hooks, state management, component patterns
- TypeScript integration and best practices
- Performance optimization and troubleshooting
- Modern development workflows and deployment

Guidelines:
1. Provide accurate, practical answers based on the provided context
2. Include code examples when relevant
3. Explain concepts clearly for developers of all levels
4. Reference the source material when applicable
5. If the context doesn't contain enough information, acknowledge this and provide general guidance
6. Always prioritize current best practices and modern patterns
7. Be concise but comprehensive in your explanations

Context from documentation:
${context}

User Question: ${query}

Provide a helpful, accurate response based on the context above. If you reference specific sections or concepts from the context, mention the source section.`

    try {
      const response = await this.llm.invoke(systemPrompt)
      return response.content as string
    } catch (error) {
      console.error('Error generating LLM response:', error)
      throw error
    }
  }

  private async generateFallbackResponse(query: string): Promise<string> {
    const fallbackPrompt = `You are a Next.js and React expert. The user asked: "${query}"

Provide a helpful response based on your general knowledge of Next.js and React development. Keep it practical and include code examples where appropriate.

Note: This response is based on general knowledge as the documentation system is temporarily unavailable.`

    try {
      const response = await this.llm.invoke(fallbackPrompt)
      return response.content as string
    } catch (error) {
      console.error('Error generating fallback response:', error)
      return "I'm sorry, I'm experiencing technical difficulties right now. Please try again later or check the official Next.js and React documentation for help with your question."
    }
  }

  private prepareSources(relevantChunks: VectorMatch[]): DocumentSource[] {
    return relevantChunks.map(match => ({
      title: match.chunk.metadata.title,
      section: match.chunk.section,
      type: match.chunk.metadata.type,
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
  } {
    return {
      initialized: this.isInitialized,
      vectorStoreReady: vectorStore.getInitializationStatus(),
      knowledgeBaseLoaded: knowledgeBase.getChunks().length > 0,
      totalChunks: knowledgeBase.getChunks().length,
      totalVectors: vectorStore.getVectorCount()
    }
  }
}

// Singleton instance
export const ragSystem = new RAGSystem()