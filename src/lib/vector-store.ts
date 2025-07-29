import { OpenAIEmbeddings } from '@langchain/openai'
import { DocumentChunk } from './knowledge-base'

export interface VectorMatch {
  chunk: DocumentChunk
  score: number
}

export class VectorStore {
  private embeddings: OpenAIEmbeddings
  private vectorIndex: Map<string, number[]> = new Map()
  private isInitialized = false

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small', // More cost-effective than ada-002
      dimensions: 1536
    })
  }

  async initializeVectors(chunks: DocumentChunk[]): Promise<void> {
    if (this.isInitialized) return

    console.log(`Generating embeddings for ${chunks.length} chunks...`)
    
    try {
      // Process chunks in batches to avoid rate limits
      const batchSize = 20
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        const texts = batch.map(chunk => this.prepareTextForEmbedding(chunk))
        
        const embeddings = await this.embeddings.embedDocuments(texts)
        
        batch.forEach((chunk, index) => {
          this.vectorIndex.set(chunk.id, embeddings[index])
        })
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`)
        
        // Small delay to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      this.isInitialized = true
      console.log('Vector embeddings initialized successfully')
    } catch (error) {
      console.error('Error initializing vector embeddings:', error)
      throw error
    }
  }

  private prepareTextForEmbedding(chunk: DocumentChunk): string {
    // Combine section title and content for better context
    return `Section: ${chunk.section}\n\nContent: ${chunk.content}`
  }

  async searchSimilar(query: string, chunks: DocumentChunk[], limit: number = 5): Promise<VectorMatch[]> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized')
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddings.embedQuery(query)
      
      // Calculate similarities
      const similarities: VectorMatch[] = []
      
      for (const chunk of chunks) {
        const chunkEmbedding = this.vectorIndex.get(chunk.id)
        if (!chunkEmbedding) continue
        
        const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding)
        
        similarities.push({
          chunk,
          score: similarity
        })
      }
      
      // Sort by similarity score (highest first) and return top results
      return similarities
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error('Error searching similar chunks:', error)
      throw error
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  // Hybrid search combining vector similarity and text search
  async hybridSearch(
    query: string, 
    chunks: DocumentChunk[], 
    vectorWeight: number = 0.7,
    textWeight: number = 0.3,
    limit: number = 5
  ): Promise<VectorMatch[]> {
    if (!this.isInitialized) {
      // Fallback to text search if vectors not available
      return this.fallbackTextSearch(query, chunks, limit)
    }

    try {
      // Get vector similarities
      const vectorResults = await this.searchSimilar(query, chunks, chunks.length)
      
      // Get text-based scores
      const textResults = this.textSearch(query, chunks)
      
      // Combine scores
      const combinedResults = new Map<string, VectorMatch>()
      
      // Add vector scores
      vectorResults.forEach(result => {
        combinedResults.set(result.chunk.id, {
          chunk: result.chunk,
          score: result.score * vectorWeight
        })
      })
      
      // Add text scores
      textResults.forEach(result => {
        const existing = combinedResults.get(result.chunk.id)
        if (existing) {
          existing.score += result.score * textWeight
        } else {
          combinedResults.set(result.chunk.id, {
            chunk: result.chunk,
            score: result.score * textWeight
          })
        }
      })
      
      // Sort and return top results
      return Array.from(combinedResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    } catch (error) {
      console.error('Error in hybrid search:', error)
      // Fallback to text search
      return this.fallbackTextSearch(query, chunks, limit)
    }
  }

  private textSearch(query: string, chunks: DocumentChunk[]): VectorMatch[] {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2)
    
    return chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase()
      const sectionLower = chunk.section.toLowerCase()
      
      let score = 0
      
      // Exact phrase matching
      if (contentLower.includes(queryLower)) score += 2
      if (sectionLower.includes(queryLower)) score += 3
      
      // Individual word matching
      queryWords.forEach(word => {
        const contentMatches = (contentLower.match(new RegExp(word, 'g')) || []).length
        const sectionMatches = (sectionLower.match(new RegExp(word, 'g')) || []).length
        
        score += contentMatches * 0.5
        score += sectionMatches * 1
      })
      
      // Normalize score by content length
      score = score / Math.log(chunk.content.length + 1)
      
      return { chunk, score }
    }).filter(result => result.score > 0)
  }

  private fallbackTextSearch(query: string, chunks: DocumentChunk[], limit: number): VectorMatch[] {
    const results = this.textSearch(query, chunks)
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  getInitializationStatus(): boolean {
    return this.isInitialized
  }

  getVectorCount(): number {
    return this.vectorIndex.size
  }
}

// Singleton instance
export const vectorStore = new VectorStore()