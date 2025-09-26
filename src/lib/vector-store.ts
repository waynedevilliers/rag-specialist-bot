import { OpenAIEmbeddings } from '@langchain/openai'
import { DocumentChunk } from './knowledge-base'
import { HNSWIndex } from './hnsw-index'
import { VectorQuantizer, QuantizedVector } from './vector-quantizer'
import { SecurityValidator, SecurityUtils } from './security-validator'
import { connectionPool } from './connection-pool'
import { chromaStore } from './chromadb-store'

export interface VectorMatch {
  chunk: DocumentChunk
  score: number
}

export class VectorStore {
  private embeddings: OpenAIEmbeddings
  private vectorIndex: Map<string, number[]> = new Map()
  private isInitialized = false

  // **Phase 3**: HNSW Index for O(log n) approximate nearest neighbor search
  private hnswIndex: HNSWIndex
  private useHNSW = true // Toggle for HNSW vs brute-force
  private readonly HNSW_THRESHOLD = 50 // Use HNSW when we have 50+ vectors

  // **Phase 3**: Vector Quantization for memory efficiency
  private quantizer: VectorQuantizer
  private quantizedIndex: Map<string, QuantizedVector> = new Map()
  private useQuantization = true // Toggle for quantization
  private readonly QUANTIZATION_THRESHOLD = 100 // Use quantization when we have 100+ vectors

  // **ChromaDB Integration**: Persistent vector storage
  private useChromaDB = true // Enable ChromaDB as persistent backend
  private chromaInitialized = false
  
  // Embedding cache for persistent storage
  private embeddingCache = new Map<string, { vector: number[], timestamp: number, checksum: string }>()
  private readonly EMBEDDING_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours
  private readonly CACHE_KEY_PREFIX = 'embedding_'
  private readonly CACHE_SALT = SecurityUtils.generateSecureRandom(32)

  constructor() {
    // Note: API key validation deferred to first usage to prevent build-time errors
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'text-embedding-3-small', // More cost-effective than ada-002
      dimensions: 1536,
      // Use connection pooling for better performance
      // configuration: {
      //   httpAgent: connectionPool.getHttpAgent(false),  // HTTP agent
      //   httpsAgent: connectionPool.getHttpAgent(true), // HTTPS agent
      // }
    })
    
    // Initialize HNSW index with optimized parameters for fashion content
    this.hnswIndex = new HNSWIndex({
      maxConnections: 16,        // M parameter - good balance for 1536D vectors
      maxConnectionsLayer0: 32,  // M_L parameter - denser connections at base layer
      efConstruction: 200,       // Higher quality construction
      maxLayers: 5              // Reasonable depth for ~100 chunks
    })
    
    // Initialize vector quantizer
    this.quantizer = new VectorQuantizer()
  }

  async initializeVectors(chunks?: DocumentChunk[]): Promise<void> {
    if (this.isInitialized) return

    // **SECURITY FIX**: Validate API key at runtime
    SecurityValidator.validateApiKey(process.env.OPENAI_API_KEY || '')

    // **ChromaDB Integration**: Initialize persistent storage FIRST
    await this.initializeChromaDB(chunks || [])

    // If ChromaDB is initialized successfully, we don't need local embeddings
    if (this.chromaInitialized && this.useChromaDB) {
      console.log('✅ ChromaDB initialized - using persistent vector storage')
      this.isInitialized = true
      return
    }

    // Fallback: Initialize local vectors if ChromaDB is not available
    if (!chunks || chunks.length === 0) {
      console.log('⚠️  No chunks provided and ChromaDB not available - loading from knowledge base')
      // Load chunks if not provided
      const knowledgeBase = new (await import('./knowledge-base')).KnowledgeBase()
      await knowledgeBase.loadDocuments()
      chunks = knowledgeBase.getChunks()
    }

    // **PERFORMANCE**: Try to load from persistent cache first
    const cacheLoaded = await this.loadEmbeddingsFromCache(chunks)
    if (cacheLoaded) {
      console.log(`Loaded ${chunks.length} embeddings from cache in <1s`)
      this.isInitialized = true
      return
    }

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
        const batchPromises = batchGroup.map((batch) => 
          this.processBatch(batch)
        )
        
        const results = await Promise.allSettled(batchPromises)
        
        // Check for failures and retry if needed
        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          if (result.status === 'rejected') {
            console.warn(`Batch ${i + j} failed, retrying...`, result.reason)
            // Retry failed batch with smaller size and delay
            await this.retryBatch(batchGroup[j])
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

  private async processBatch(batch: DocumentChunk[]): Promise<number> {
    // **SECURITY FIX**: Validate batch parameters
    SecurityValidator.validateBatchParams(batch.length)
    
    const textsToProcess: string[] = []
    const chunkMap: { chunk: DocumentChunk, textIndex?: number }[] = []
    
    // Check cache for each chunk
    batch.forEach(chunk => {
      const text = this.prepareTextForEmbedding(chunk)
      const cached = this.getCachedEmbedding(text)
      
      if (cached) {
        // Use cached embedding
        this.vectorIndex.set(chunk.id, cached)
        
        // **Phase 3**: Add cached vector to HNSW index
        this.hnswIndex.insert(chunk.id, cached)
        
        // **Phase 3**: Store quantized version for memory efficiency
        if (this.useQuantization) {
          const quantized = this.quantizer.quantize(cached)
          this.quantizedIndex.set(chunk.id, quantized)
        }
        
        chunkMap.push({ chunk })
      } else {
        // Need to generate embedding
        chunkMap.push({ chunk, textIndex: textsToProcess.length })
        textsToProcess.push(text)
      }
    })
    
    // Generate embeddings only for uncached texts
    if (textsToProcess.length > 0) {
      // Use connection pool with automatic retry and rate limiting
      const embeddings = await connectionPool.queueRequest('openai', async () => {
        return await this.embeddings.embedDocuments(textsToProcess)
      }, 3)
      
      // Store embeddings and cache them
      let embeddingIndex = 0
      chunkMap.forEach(({ chunk, textIndex }) => {
        if (textIndex !== undefined) {
          const embedding = embeddings[embeddingIndex]
          const text = textsToProcess[textIndex]
          
          this.vectorIndex.set(chunk.id, embedding)
          this.setCachedEmbedding(text, embedding)
          
          // **Phase 3**: Add vector to HNSW index
          this.hnswIndex.insert(chunk.id, embedding)
          
          // **SECURITY FIX**: Validate vector before processing
          SecurityValidator.validateVector(embedding)
          
          // **Phase 3**: Store quantized version for memory efficiency
          if (this.useQuantization) {
            const quantized = this.quantizer.quantize(embedding)
            this.quantizedIndex.set(chunk.id, quantized)
          }
          
          embeddingIndex++
        }
      })
    }
    
    return batch.length
  }

  private async retryBatch(batch: DocumentChunk[]): Promise<void> {
    // Retry with smaller batch size and exponential backoff
    const smallerBatchSize = Math.max(1, Math.floor(batch.length / 2))
    
    for (let i = 0; i < batch.length; i += smallerBatchSize) {
      const subBatch = batch.slice(i, i + smallerBatchSize)
      
      try {
        await this.processBatch(subBatch)
        // Add delay between retry attempts
        if (i + smallerBatchSize < batch.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Failed to process sub-batch ${i}-${i + smallerBatchSize}:`, error)
        throw error
      }
    }
  }

  private hashText(text: string): string {
    // **SECURITY FIX**: Use cryptographic hash instead of simple hash
    return SecurityUtils.secureHash(text, this.CACHE_SALT)
  }

  private getCachedEmbedding(text: string): number[] | null {
    const hash = this.hashText(text)
    const cacheKey = this.CACHE_KEY_PREFIX + hash
    
    // Check in-memory cache first
    const memoryCache = this.embeddingCache.get(cacheKey)
    if (memoryCache && Date.now() - memoryCache.timestamp < this.EMBEDDING_CACHE_TTL) {
      // **SECURITY FIX**: Verify cache integrity
      const expectedChecksum = SecurityUtils.secureHash(JSON.stringify(memoryCache.vector))
      if (SecurityUtils.constantTimeEquals(memoryCache.checksum, expectedChecksum)) {
        return memoryCache.vector
      } else {
        // Cache corrupted, remove it
        this.embeddingCache.delete(cacheKey)
      }
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
    // **SECURITY FIX**: Implement cache size limits and integrity checking
    if (this.embeddingCache.size >= SecurityValidator.MAX_CACHE_SIZE) {
      this.cleanOldestCacheEntries()
    }
    
    const hash = this.hashText(text)
    const cacheKey = this.CACHE_KEY_PREFIX + hash
    const checksum = SecurityUtils.secureHash(JSON.stringify(vector))
    const cacheEntry = { vector, timestamp: Date.now(), checksum }
    
    // Store in memory cache
    this.embeddingCache.set(cacheKey, cacheEntry)
    
    // Store in localStorage cache (only in browser environments)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        // Check storage usage before storing
        const storageUsed = this.calculateStorageUsage()
        if (storageUsed < 5 * 1024 * 1024) { // 5MB limit
          localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
        }
      } catch {
        // localStorage might be full or not available - don't expose details
        console.debug('Storage unavailable for embedding cache')
      }
    }
  }

  private cleanOldestCacheEntries(): void {
    const entries = Array.from(this.embeddingCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toRemove = entries.slice(0, entries.length - SecurityValidator.MAX_CACHE_SIZE + 10)
    toRemove.forEach(([key]) => this.embeddingCache.delete(key))
  }

  private calculateStorageUsage(): number {
    try {
      let total = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(this.CACHE_KEY_PREFIX)) {
          const value = localStorage.getItem(key)
          total += (key.length + (value?.length || 0)) * 2 // UTF-16 encoding
        }
      }
      return total
    } catch {
      return 0
    }
  }

  private async generateEmbeddingWithCache(text: string): Promise<number[]> {
    // Check cache first
    const cached = this.getCachedEmbedding(text)
    if (cached) {
      return cached
    }
    
    // Generate new embedding with connection pooling
    const embedding = await connectionPool.queueRequest('openai', async () => {
      return await this.embeddings.embedQuery(text)
    }, 3)
    
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

    // **SECURITY FIX**: Validate API key at runtime
    SecurityValidator.validateApiKey(process.env.OPENAI_API_KEY || '')

    try {
      // Generate embedding for the query with caching
      const queryEmbedding = await this.generateEmbeddingWithCache(query)
      
      // **Phase 3**: Use HNSW index for large datasets, brute-force for small ones
      if (this.useHNSW && this.vectorIndex.size >= this.HNSW_THRESHOLD) {
        return this.searchWithHNSW(queryEmbedding, chunks, limit)
      } else {
        return this.searchBruteForce(queryEmbedding, chunks, limit)
      }
    } catch (error) {
      console.error('Error searching similar chunks:', error)
      throw error
    }
  }

  private searchWithHNSW(queryEmbedding: number[], chunks: DocumentChunk[], limit: number): VectorMatch[] {
    // Search using HNSW index with higher ef for better recall
    const ef = Math.max(limit * 2, 50) // Search more candidates for better quality
    const hnswResults = this.hnswIndex.search(queryEmbedding, limit, ef)
    
    // Convert HNSW results to VectorMatch format
    const chunkMap = new Map(chunks.map(chunk => [chunk.id, chunk]))
    
    return hnswResults
      .map(result => ({
        chunk: chunkMap.get(result.id)!,
        score: 1 - result.distance // Convert cosine distance back to similarity
      }))
      .filter(match => match.chunk) // Remove any missing chunks
      .sort((a, b) => b.score - a.score)
  }

  private searchBruteForce(queryEmbedding: number[], chunks: DocumentChunk[], limit: number): VectorMatch[] {
    // Original brute-force implementation for small datasets or fallback
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

  // Hybrid search combining vector similarity and text search with parallel execution
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
      // **ChromaDB Primary**: If ChromaDB is initialized, prioritize it
      if (this.chromaInitialized && this.useChromaDB) {
        const [chromaResults, textResults] = await Promise.all([
          this.searchWithChromaDB(query, limit * 2), // Get more results from ChromaDB
          Promise.resolve(this.textSearch(query, chunks))
        ])

        // Use primarily ChromaDB results
        return this.reciprocalRankFusion(chromaResults, textResults, vectorWeight, textWeight, limit)
      }

      // **Fallback to Local Hybrid Search**: Run local vector and text search
      const [vectorResults, textResults] = await Promise.all([
        this.searchSimilar(query, chunks, chunks.length),
        Promise.resolve(this.textSearch(query, chunks))
      ])

      // **Phase 2 Enhancement**: Reciprocal Rank Fusion for better score combination
      return this.reciprocalRankFusion(vectorResults, textResults, vectorWeight, textWeight, limit)
    } catch (error) {
      console.error('Error in hybrid search:', error)
      // Fallback to text search
      return this.fallbackTextSearch(query, chunks, limit)
    }
  }

  /**
   * **ChromaDB Integration**: Remove duplicate results by chunk ID, keeping highest score
   */
  private deduplicateResults(results: VectorMatch[]): VectorMatch[] {
    const resultMap = new Map<string, VectorMatch>()

    results.forEach(result => {
      const existing = resultMap.get(result.chunk.id)
      if (!existing || result.score > existing.score) {
        resultMap.set(result.chunk.id, result)
      }
    })

    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score)
  }

  private reciprocalRankFusion(
    vectorResults: VectorMatch[], 
    textResults: VectorMatch[], 
    vectorWeight: number, 
    textWeight: number, 
    limit: number,
    k: number = 60
  ): VectorMatch[] {
    const scores = new Map<string, { chunk: DocumentChunk, score: number }>()
    
    // RRF for vector results
    vectorResults.forEach((result, rank) => {
      const rrfScore = vectorWeight / (k + rank + 1)
      scores.set(result.chunk.id, {
        chunk: result.chunk,
        score: rrfScore
      })
    })
    
    // RRF for text results  
    textResults.forEach((result, rank) => {
      const rrfScore = textWeight / (k + rank + 1)
      const existing = scores.get(result.chunk.id)
      if (existing) {
        existing.score += rrfScore
      } else {
        scores.set(result.chunk.id, {
          chunk: result.chunk,
          score: rrfScore
        })
      }
    })
    
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({ chunk: item.chunk, score: item.score }))
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

  /**
   * **Phase 3**: Clear all indexes and reset the vector store
   */
  clearAllIndexes(): void {
    this.vectorIndex.clear()
    this.quantizedIndex.clear()
    this.hnswIndex.clear()
    this.clearEmbeddingCache()
    this.isInitialized = false
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

  /**
   * **Phase 3**: Get comprehensive performance and optimization statistics
   */
  getOptimizationStats(): {
    vectorCount: number
    indexType: 'HNSW' | 'BruteForce'
    quantizationEnabled: boolean
    chromaDBEnabled: boolean
    chromaDBStatus: string
    memoryUsage: {
      originalVectors: number
      quantizedVectors: number
      memorySaved: number
      compressionRatio: number
    }
    hnswStats: {
      nodeCount: number
      avgConnectionsLayer0: number
      maxLevel: number
      entryPointLevel: number
    }
    cacheStats: {
      memoryCacheSize: number
      localStorageCacheSize: number
    }
    performance: {
      expectedSpeedup: string
      searchComplexity: string
    }
  } {
    const vectorCount = this.vectorIndex.size
    const usingHNSW = this.useHNSW && vectorCount >= this.HNSW_THRESHOLD
    const usingQuantization = this.useQuantization && vectorCount >= this.QUANTIZATION_THRESHOLD

    // Calculate memory usage
    const originalMemory = vectorCount * 1536 * 4 // 32-bit floats
    const quantizedMemory = this.quantizedIndex.size * (1536 * 1 + 8) // 8-bit + scale/offset
    const memorySaved = originalMemory - quantizedMemory
    const compressionRatio = originalMemory > 0 ? originalMemory / quantizedMemory : 1

    return {
      vectorCount,
      indexType: usingHNSW ? 'HNSW' : 'BruteForce',
      quantizationEnabled: usingQuantization,
      chromaDBEnabled: this.useChromaDB,
      chromaDBStatus: this.chromaInitialized ? 'Connected' : (this.useChromaDB ? 'Initializing' : 'Disabled'),
      memoryUsage: {
        originalVectors: originalMemory,
        quantizedVectors: quantizedMemory,
        memorySaved,
        compressionRatio
      },
      hnswStats: this.hnswIndex.getStats(),
      cacheStats: this.getCacheStats(),
      performance: {
        expectedSpeedup: usingHNSW ? 'O(log n) vs O(n)' : 'Linear search',
        searchComplexity: usingHNSW ? `O(log ${vectorCount})` : `O(${vectorCount})`
      }
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

  /**
   * **ChromaDB Integration**: Initialize persistent vector storage
   */
  private async initializeChromaDB(chunks: DocumentChunk[]): Promise<void> {
    if (!this.useChromaDB || this.chromaInitialized) return

    try {
      console.log('Initializing ChromaDB persistent storage...')

      // Initialize ChromaDB connection
      await chromaStore.initialize()

      // Check if documents already exist in ChromaDB
      const collectionInfo = await chromaStore.getCollectionInfo()
      console.log(`ChromaDB collection "${collectionInfo.name}" has ${collectionInfo.count} documents`)

      // If ChromaDB has documents, use it as the primary source
      if (collectionInfo.count > 0) {
        console.log(`✅ Using ChromaDB as primary vector store with ${collectionInfo.count} documents`)
        this.chromaInitialized = true
        console.log('ChromaDB integration initialized successfully')
        // Force this to be the initialized state
        this.isInitialized = true
        return // Skip local vector initialization
      }

      // Only populate if empty and we have chunks
      if (collectionInfo.count === 0 && chunks.length > 0) {
        console.log('Populating ChromaDB with initial documents...')
        await chromaStore.addDocuments(chunks)
        console.log('ChromaDB populated successfully')
      }

      this.chromaInitialized = true
      console.log('ChromaDB integration initialized successfully')
    } catch (error) {
      console.warn('ChromaDB initialization failed, continuing without persistent storage:', error)
      this.useChromaDB = false // Disable ChromaDB if initialization fails
    }
  }

  /**
   * **ChromaDB Integration**: Search using persistent vector storage
   */
  private async searchWithChromaDB(query: string, limit: number): Promise<VectorMatch[]> {
    if (!this.useChromaDB || !this.chromaInitialized) {
      return []
    }

    try {
      const chromaResults = await chromaStore.searchSimilar(query, limit, 0.3) // Lower threshold for more results

      // Convert ChromaDB results to VectorMatch format
      return chromaResults.map(result => ({
        chunk: {
          id: result.id,
          content: result.content,
          section: result.metadata.section,
          metadata: {
            title: result.metadata.title,
            type: result.metadata.type as any,
            courseNumber: result.metadata.courseNumber,
            moduleNumber: result.metadata.moduleNumber
          }
        } as DocumentChunk,
        score: result.score
      }))
    } catch (error) {
      console.warn('ChromaDB search failed, falling back to local search:', error)
      return []
    }
  }

  /**
   * Add new chunks to the vector store incrementally
   */
  async addChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return

    console.log(`Adding ${chunks.length} chunks to vector store...`)

    try {
      // Process in batches for efficiency
      const batchSize = 20
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize)
        await this.processBatch(batch)
      }

      console.log(`Successfully added ${chunks.length} chunks to vector store`)
    } catch (error) {
      console.error('Error adding chunks to vector store:', error)
      throw error
    }
  }

  /**
   * Remove chunks from the vector store
   */
  async removeChunks(chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) return

    console.log(`Removing ${chunkIds.length} chunks from vector store...`)

    try {
      for (const chunkId of chunkIds) {
        // Remove from vector index
        this.vectorIndex.delete(chunkId)
        
        // Remove from quantized index
        this.quantizedIndex.delete(chunkId)
        
        // Remove from HNSW index
        this.hnswIndex.remove(chunkId)
      }

      console.log(`Successfully removed ${chunkIds.length} chunks from vector store`)
    } catch (error) {
      console.error('Error removing chunks from vector store:', error)
      throw error
    }
  }

  /**
   * Update existing chunks in the vector store
   */
  async updateChunks(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return

    console.log(`Updating ${chunks.length} chunks in vector store...`)

    try {
      // Remove old versions first
      const chunkIds = chunks.map(chunk => chunk.id)
      await this.removeChunks(chunkIds)
      
      // Add new versions
      await this.addChunks(chunks)

      console.log(`Successfully updated ${chunks.length} chunks in vector store`)
    } catch (error) {
      console.error('Error updating chunks in vector store:', error)
      throw error
    }
  }

  /**
   * Check if chunk exists in vector store
   */
  hasChunk(chunkId: string): boolean {
    return this.vectorIndex.has(chunkId)
  }

  /**
   * Get chunk IDs currently in the vector store
   */
  getChunkIds(): string[] {
    return Array.from(this.vectorIndex.keys())
  }

  /**
   * Synchronize vector store with provided chunks
   */
  async synchronizeWithChunks(targetChunks: DocumentChunk[]): Promise<{
    added: number
    updated: number
    removed: number
  }> {
    const currentIds = new Set(this.getChunkIds())
    const targetIds = new Set(targetChunks.map(chunk => chunk.id))
    
    // Find chunks to add (in target but not in current)
    const chunksToAdd = targetChunks.filter(chunk => !currentIds.has(chunk.id))
    
    // Find chunks to remove (in current but not in target)
    const idsToRemove = Array.from(currentIds).filter(id => !targetIds.has(id))
    
    // Find chunks to update (in both, but we'll update to ensure consistency)
    const chunksToUpdate = targetChunks.filter(chunk => currentIds.has(chunk.id))

    try {
      // Perform operations
      if (idsToRemove.length > 0) {
        await this.removeChunks(idsToRemove)
      }
      
      if (chunksToAdd.length > 0) {
        await this.addChunks(chunksToAdd)
      }
      
      if (chunksToUpdate.length > 0) {
        await this.updateChunks(chunksToUpdate)
      }

      return {
        added: chunksToAdd.length,
        updated: chunksToUpdate.length,
        removed: idsToRemove.length
      }
    } catch (error) {
      console.error('Error synchronizing vector store:', error)
      throw error
    }
  }

  /**
   * Rebuild vector store indices for optimization
   */
  async rebuildIndices(): Promise<void> {
    console.log('Rebuilding vector store indices...')
    
    try {
      // Get all current vectors
      const vectors = Array.from(this.vectorIndex.entries())
      
      // Clear indices
      this.hnswIndex.clear()
      this.quantizedIndex.clear()
      
      // Rebuild HNSW index
      for (const [chunkId, vector] of vectors) {
        this.hnswIndex.insert(chunkId, vector)
        
        // Rebuild quantized index
        if (this.useQuantization && vectors.length >= this.QUANTIZATION_THRESHOLD) {
          const quantized = this.quantizer.quantize(vector)
          this.quantizedIndex.set(chunkId, quantized)
        }
      }
      
      console.log('Successfully rebuilt vector store indices')
    } catch (error) {
      console.error('Error rebuilding indices:', error)
      throw error
    }
  }

  private async loadEmbeddingsFromCache(chunks: DocumentChunk[]): Promise<boolean> {
    try {
      // Check if we can restore all embeddings from existing cache
      let restoredCount = 0

      for (const chunk of chunks) {
        const text = this.prepareTextForEmbedding(chunk)
        const cached = this.getCachedEmbedding(text)

        if (cached) {
          this.vectorIndex.set(chunk.id, cached)
          this.hnswIndex.insert(chunk.id, cached)
          restoredCount++
        }
      }

      // Only consider successful if we restored all chunks
      return restoredCount === chunks.length
    } catch (error) {
      console.warn('Failed to load embeddings from cache:', error)
      return false
    }
  }

  /**
   * Check if ChromaDB is initialized and being used
   */
  isChromaInitialized(): boolean {
    return this.chromaInitialized && this.useChromaDB
  }

  /**
   * Get all chunks from the vector store
   */
  getAllChunks(): DocumentChunk[] {
    // This method is not needed for ChromaDB integration
    return []
  }
}

// Singleton instance
export const vectorStore = new VectorStore()