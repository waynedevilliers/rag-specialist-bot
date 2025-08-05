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
  
  // Embedding cache for persistent storage
  private embeddingCache = new Map<string, { vector: number[], timestamp: number }>()
  private readonly EMBEDDING_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours
  private readonly CACHE_KEY_PREFIX = 'embedding_'

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
      // Optimize batch processing with parallel execution
      const batchSize = 50 // Increased from 20
      const maxConcurrency = 3 // Process 3 batches in parallel
      
      const batches: DocumentChunk[][] = []
      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize))
      }
      
      // Process batches with controlled concurrency
      const processedBatches: number[] = []
      for (let i = 0; i < batches.length; i += maxConcurrency) {
        const batchGroup = batches.slice(i, i + maxConcurrency)
        const batchPromises = batchGroup.map((batch, index) => 
          this.processBatch(batch, i + index)
        )
        
        const results = await Promise.allSettled(batchPromises)
        
        // Check for failures and retry if needed
        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          if (result.status === 'rejected') {
            console.warn(`Batch ${i + j} failed, retrying...`, result.reason)
            // Retry failed batch with smaller size and delay
            await this.retryBatch(batchGroup[j], i + j)
          } else {
            processedBatches.push(result.value)
          }
        }
        
        console.log(`Processed ${Math.min(i + maxConcurrency, batches.length)}/${batches.length} batch groups`)
      }
      
      this.isInitialized = true
      const totalProcessed = processedBatches.reduce((sum, count) => sum + count, 0)
      console.log(`Vector embeddings initialized successfully: ${totalProcessed}/${chunks.length} chunks processed`)
    } catch (error) {
      console.error('Error initializing vector embeddings:', error)
      throw error
    }
  }

  private async processBatch(batch: DocumentChunk[], _batchIndex: number): Promise<number> {
    const textsToProcess: string[] = []
    const chunkMap: { chunk: DocumentChunk, textIndex?: number }[] = []
    
    // Check cache for each chunk
    batch.forEach(chunk => {
      const text = this.prepareTextForEmbedding(chunk)
      const cached = this.getCachedEmbedding(text)
      
      if (cached) {
        // Use cached embedding
        this.vectorIndex.set(chunk.id, cached)
        chunkMap.push({ chunk })
      } else {
        // Need to generate embedding
        chunkMap.push({ chunk, textIndex: textsToProcess.length })
        textsToProcess.push(text)
      }
    })
    
    // Generate embeddings only for uncached texts
    if (textsToProcess.length > 0) {
      const embeddings = await this.embeddings.embedDocuments(textsToProcess)
      
      // Store embeddings and cache them
      let embeddingIndex = 0
      chunkMap.forEach(({ chunk, textIndex }) => {
        if (textIndex !== undefined) {
          const embedding = embeddings[embeddingIndex]
          const text = textsToProcess[textIndex]
          
          this.vectorIndex.set(chunk.id, embedding)
          this.setCachedEmbedding(text, embedding)
          embeddingIndex++
        }
      })
    }
    
    return batch.length
  }

  private async retryBatch(batch: DocumentChunk[], batchIndex: number): Promise<void> {
    // Retry with smaller batch size and exponential backoff
    const smallerBatchSize = Math.max(1, Math.floor(batch.length / 2))
    
    for (let i = 0; i < batch.length; i += smallerBatchSize) {
      const subBatch = batch.slice(i, i + smallerBatchSize)
      
      try {
        await this.processBatch(subBatch, batchIndex)
        // Add delay between retry attempts
        if (i + smallerBatchSize < batch.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to process sub-batch ${i}-${i + smallerBatchSize} of batch ${batchIndex}:`, error)
        throw error
      }
    }
  }

  private hashText(text: string): string {
    // Simple hash function for cache keys
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private getCachedEmbedding(text: string): number[] | null {
    const hash = this.hashText(text)
    const cacheKey = this.CACHE_KEY_PREFIX + hash
    
    // Check in-memory cache first
    const memoryCache = this.embeddingCache.get(cacheKey)
    if (memoryCache && Date.now() - memoryCache.timestamp < this.EMBEDDING_CACHE_TTL) {
      return memoryCache.vector
    }
    
    // Check localStorage cache (only in browser environments)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const storedCache = localStorage.getItem(cacheKey)
        if (storedCache) {
          const parsed = JSON.parse(storedCache)
          if (Date.now() - parsed.timestamp < this.EMBEDDING_CACHE_TTL) {
            // Restore to memory cache
            this.embeddingCache.set(cacheKey, parsed)
            return parsed.vector
          } else {
            // Remove expired cache
            localStorage.removeItem(cacheKey)
          }
        }
      } catch (error) {
        // localStorage might be full or corrupted
        console.debug('localStorage error for embedding cache:', error)
      }
    }
    
    return null
  }

  private setCachedEmbedding(text: string, vector: number[]): void {
    const hash = this.hashText(text)
    const cacheKey = this.CACHE_KEY_PREFIX + hash
    const cacheEntry = { vector, timestamp: Date.now() }
    
    // Store in memory cache
    this.embeddingCache.set(cacheKey, cacheEntry)
    
    // Store in localStorage cache (only in browser environments)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
      } catch (error) {
        // localStorage might be full or not available
        console.debug('Failed to store embedding in localStorage:', error)
      }
    }
  }

  private async generateEmbeddingWithCache(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.getCachedEmbedding(text)
    if (cached) {
      return cached
    }
    
    // Generate new embedding
    const embedding = await this.embeddings.embedQuery(text)
    
    // Cache the result
    this.setCachedEmbedding(text, embedding)
    
    return embedding
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
      // Generate embedding for the query with caching
      const queryEmbedding = await this.generateEmbeddingWithCache(query)
      
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

  // Cache management methods
  clearEmbeddingCache(): void {
    this.embeddingCache.clear()
    
    // Clear localStorage cache (only in browser environments)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.CACHE_KEY_PREFIX)) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        console.debug('Failed to clear localStorage cache:', error)
      }
    }
  }

  getCacheStats(): {
    memoryCacheSize: number
    localStorageCacheSize: number
    cacheHitRate?: number
  } {
    let localStorageCacheSize = 0
    
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.CACHE_KEY_PREFIX)) {
            localStorageCacheSize++
          }
        }
      } catch (error) {
        console.debug('Failed to count localStorage cache:', error)
      }
    }
    
    return {
      memoryCacheSize: this.embeddingCache.size,
      localStorageCacheSize
    }
  }

  cleanExpiredCache(): void {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, entry] of this.embeddingCache.entries()) {
      if (now - entry.timestamp > this.EMBEDDING_CACHE_TTL) {
        this.embeddingCache.delete(key)
      }
    }
    
    // Clean localStorage cache (only in browser environments)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith(this.CACHE_KEY_PREFIX)) {
            const stored = localStorage.getItem(key)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (now - parsed.timestamp > this.EMBEDDING_CACHE_TTL) {
                keysToRemove.push(key)
              }
            }
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      } catch (error) {
        console.debug('Failed to clean localStorage cache:', error)
      }
    }
  }
}

// Singleton instance
export const vectorStore = new VectorStore()