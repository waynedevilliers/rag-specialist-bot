import { ChromaClient, CloudClient } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { DocumentChunk } from './knowledge-base'
import { SecurityValidator } from './security-validator'

export interface ChromaDocument {
  id: string
  content: string
  metadata: {
    section: string
    title: string
    type: string
    courseNumber: string
    moduleNumber: string
  }
}

export interface ChromaSearchResult {
  id: string
  content: string
  metadata: ChromaDocument['metadata']
  score: number
}

export class ChromaDBStore {
  private client: ChromaClient | CloudClient
  private embeddings: OpenAIEmbeddings
  private collection: any = null
  private isInitialized = false
  private readonly collectionName = 'fashion_design_knowledge'

  constructor() {
    // Initialize ChromaDB client - prefer CloudClient if credentials are available
    if (process.env.CHROMADB_API_KEY && process.env.CHROMADB_TENANT) {
      this.client = new CloudClient({
        apiKey: process.env.CHROMADB_API_KEY,
        tenant: process.env.CHROMADB_TENANT,
        database: process.env.CHROMADB_DATABASE || 'ellu-studios-chat-bot'
      })
      console.log('Using ChromaDB Cloud client')
    } else {
      // Fallback to local client
      const chromaUrl = process.env.CHROMADB_URL || 'http://localhost:8000'
      this.client = new ChromaClient({
        path: chromaUrl
      })
      console.log('Using ChromaDB local client')
    }

    // Initialize OpenAI embeddings
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'text-embedding-3-small',
      dimensions: 1536
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Validate API key
      SecurityValidator.validateApiKey(process.env.OPENAI_API_KEY || '')

      console.log('Initializing ChromaDB connection...')

      // Test connection
      await this.client.heartbeat()
      console.log('ChromaDB connection successful')

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        })
        const count = await this.collection.count()
        console.log(`Connected to existing collection: ${this.collectionName} with ${count} documents`)
      } catch (error) {
        console.log(`Collection ${this.collectionName} doesn't exist - ChromaDB integration requires existing collection`)
        throw new Error('ChromaDB collection not found. Please run populate script first.')
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize ChromaDB:', error)
      throw new Error(`ChromaDB initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (chunks.length === 0) return

    console.log(`Adding ${chunks.length} documents to ChromaDB...`)

    try {
      // Process in batches to avoid memory issues
      const batchSize = 100
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        await this.processBatch(batch)
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
      }

      console.log('Successfully added all documents to ChromaDB')
    } catch (error) {
      console.error('Error adding documents to ChromaDB:', error)
      throw error
    }
  }

  private async processBatch(chunks: DocumentChunk[]): Promise<void> {
    // Prepare documents for ChromaDB
    const documents = chunks.map(chunk => this.prepareTextForEmbedding(chunk))
    const ids = chunks.map(chunk => chunk.id)
    const metadatas = chunks.map(chunk => ({
      section: chunk.section,
      title: chunk.metadata.title,
      type: chunk.metadata.type,
      courseNumber: chunk.metadata.courseNumber,
      moduleNumber: chunk.metadata.moduleNumber,
      content: chunk.content // Store full content in metadata for retrieval
    }))

    // Generate embeddings
    const embeddings = await this.embeddings.embedDocuments(documents)

    // Add to ChromaDB collection
    await this.collection.upsert({
      ids,
      embeddings,
      documents,
      metadatas
    })
  }

  private prepareTextForEmbedding(chunk: DocumentChunk): string {
    return `Section: ${chunk.section}\n\nContent: ${chunk.content}`
  }

  async searchSimilar(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<ChromaSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query)

      // Search in ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        include: ['documents', 'metadatas', 'distances']
      })

      // Process results
      if (!results.ids?.[0] || !results.documents?.[0] || !results.metadatas?.[0] || !results.distances?.[0]) {
        return []
      }

      const searchResults: ChromaSearchResult[] = []
      const ids = results.ids[0]
      const documents = results.documents[0]
      const metadatas = results.metadatas[0]
      const distances = results.distances[0]

      for (let i = 0; i < ids.length; i++) {
        const distance = distances[i]
        const similarity = 1 - distance // Convert distance to similarity

        // Filter by threshold
        if (similarity >= threshold) {
          const metadata = metadatas[i] as any

          searchResults.push({
            id: ids[i],
            content: metadata.content || documents[i],
            metadata: {
              section: metadata.section,
              title: metadata.title,
              type: metadata.type,
              courseNumber: metadata.courseNumber,
              moduleNumber: metadata.moduleNumber
            },
            score: similarity
          })
        }
      }

      return searchResults.sort((a, b) => b.score - a.score)
    } catch (error) {
      console.error('Error searching ChromaDB:', error)
      throw error
    }
  }

  async getCollectionInfo(): Promise<{
    name: string
    count: number
    metadata?: any
  }> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      const collection = await this.client.getCollection({
        name: this.collectionName
      })

      const count = await this.collection.count()

      return {
        name: this.collectionName,
        count: count,
        metadata: collection.metadata
      }
    } catch (error) {
      console.error('Error getting collection info:', error)
      throw error
    }
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (ids.length === 0) return

    try {
      await this.collection.delete({
        ids
      })
      console.log(`Deleted ${ids.length} documents from ChromaDB`)
    } catch (error) {
      console.error('Error deleting documents from ChromaDB:', error)
      throw error
    }
  }

  async clearCollection(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Delete the entire collection
      await this.client.deleteCollection({
        name: this.collectionName
      })

      // Recreate empty collection
      this.collection = await this.client.createCollection({
        name: this.collectionName,
        metadata: {
          description: 'Fashion design knowledge base for ELLU Studios courses'
        }
      })

      console.log('ChromaDB collection cleared and recreated')
    } catch (error) {
      console.error('Error clearing ChromaDB collection:', error)
      throw error
    }
  }

  async updateDocument(chunk: DocumentChunk): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Delete existing document if it exists
      await this.deleteDocuments([chunk.id])

      // Add updated document
      await this.addDocuments([chunk])

      console.log(`Updated document ${chunk.id} in ChromaDB`)
    } catch (error) {
      console.error('Error updating document in ChromaDB:', error)
      throw error
    }
  }

  getConnectionStatus(): {
    isInitialized: boolean
    collectionName: string
    chromaUrl: string
  } {
    return {
      isInitialized: this.isInitialized,
      collectionName: this.collectionName,
      chromaUrl: process.env.CHROMADB_URL || 'http://localhost:8000'
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat()
      return true
    } catch (error) {
      console.error('ChromaDB health check failed:', error)
      return false
    }
  }
}

// Singleton instance
export const chromaStore = new ChromaDBStore()