import { readFileSync, existsSync } from 'fs'
import { extname } from 'path'
import { SecurityValidator } from './security-validator'
import { DocumentChunk, KnowledgeBase } from './knowledge-base'
import { VectorStore } from './vector-store'
import { KnowledgeValidator } from './knowledge-validator'

export interface UpdateSource {
  type: 'file' | 'url' | 'text'
  content: string
  metadata: {
    title: string
    courseType: 'pattern-making' | 'illustrator-fashion' | 'draping' | 'construction'
    courseNumber: string
    source?: string
    author?: string
    lastModified?: string
  }
}

export interface UpdateResult {
  success: boolean
  chunksAdded: number
  chunksUpdated: number
  chunksRemoved: number
  vectorsUpdated: number
  message: string
  backupId?: string
  errors?: string[]
  warnings?: string[]
  suggestions?: string[]
  confidence?: number
}

export interface KnowledgeBackup {
  id: string
  timestamp: number
  chunks: DocumentChunk[]
  vectorCount: number
  description: string
  checksums: Map<string, string>
}

export class KnowledgeUpdateService {
  private knowledgeBase: KnowledgeBase
  private vectorStore: VectorStore
  private backups: Map<string, KnowledgeBackup> = new Map()
  private readonly MAX_BACKUPS = 5
  private readonly BACKUP_TTL = 24 * 60 * 60 * 1000 // 24 hours
  private isUpdating = false

  // Allowed file extensions for security
  private readonly ALLOWED_EXTENSIONS = ['.md', '.txt', '.json']
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly MAX_CHUNK_SIZE = 50000 // 50KB per chunk

  constructor(knowledgeBase: KnowledgeBase, vectorStore: VectorStore) {
    this.knowledgeBase = knowledgeBase
    this.vectorStore = vectorStore
  }

  /**
   * Add new content to the knowledge base
   */
  async addContent(source: UpdateSource): Promise<UpdateResult> {
    if (this.isUpdating) {
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: 'Update already in progress. Please wait for current operation to complete.'
      }
    }

    this.isUpdating = true

    try {
      // Create backup before making changes
      const backupId = await this.createBackup('Before adding new content')

      // Validate the source
      const validationResult = await this.validateSource(source)
      if (!validationResult.valid) {
        return {
          success: false,
          chunksAdded: 0,
          chunksUpdated: 0,
          chunksRemoved: 0,
          vectorsUpdated: 0,
          message: `Validation failed: ${validationResult.errors?.join(', ')}`,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          confidence: validationResult.confidence
        }
      }

      // Process the content into chunks
      const newChunks = await this.processSource(source)
      
      if (newChunks.length === 0) {
        return {
          success: false,
          chunksAdded: 0,
          chunksUpdated: 0,
          chunksRemoved: 0,
          vectorsUpdated: 0,
          message: 'No valid chunks could be extracted from the source'
        }
      }

      // Add chunks to knowledge base
      const existingChunks = this.knowledgeBase.getChunks()
      const updatedChunks = [...existingChunks, ...newChunks]
      
      // Update knowledge base (simulate by replacing chunks)
      this.updateKnowledgeBaseChunks(updatedChunks)

      // Update vector store incrementally
      await this.vectorStore.addChunks(newChunks)

      return {
        success: true,
        chunksAdded: newChunks.length,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: newChunks.length,
        message: `Successfully added ${newChunks.length} new chunks to the knowledge base`,
        backupId,
        warnings: validationResult.warnings,
        suggestions: validationResult.suggestions,
        confidence: validationResult.confidence
      }
    } catch (error) {
      console.error('Error adding content:', error)
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Update existing content in the knowledge base
   */
  async updateContent(sourceId: string, source: UpdateSource): Promise<UpdateResult> {
    if (this.isUpdating) {
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: 'Update already in progress'
      }
    }

    this.isUpdating = true

    try {
      const backupId = await this.createBackup('Before updating content')

      // Validate the source
      const validationResult = await this.validateSource(source)
      if (!validationResult.valid) {
        return {
          success: false,
          chunksAdded: 0,
          chunksUpdated: 0,
          chunksRemoved: 0,
          vectorsUpdated: 0,
          message: `Validation failed: ${validationResult.errors?.join(', ')}`,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          confidence: validationResult.confidence
        }
      }

      // Find existing chunks to update
      const existingChunks = this.knowledgeBase.getChunks()
      const chunksToUpdate = existingChunks.filter(chunk => 
        chunk.source === sourceId || chunk.metadata.title === source.metadata.title
      )

      if (chunksToUpdate.length === 0) {
        // If no existing chunks found, treat as new content
        return await this.addContent(source)
      }

      // Remove old chunks
      const remainingChunks = existingChunks.filter(chunk => 
        chunk.source !== sourceId && chunk.metadata.title !== source.metadata.title
      )

      // Process new content
      const newChunks = await this.processSource(source)

      // Update chunks
      const updatedChunks = [...remainingChunks, ...newChunks]
      this.updateKnowledgeBaseChunks(updatedChunks)

      // Update vector store
      await this.updateVectorStore(newChunks, chunksToUpdate)

      return {
        success: true,
        chunksAdded: 0,
        chunksUpdated: newChunks.length,
        chunksRemoved: chunksToUpdate.length,
        vectorsUpdated: newChunks.length,
        message: `Successfully updated content: ${chunksToUpdate.length} chunks removed, ${newChunks.length} chunks added`,
        backupId
      }
    } catch (error) {
      console.error('Error updating content:', error)
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Remove content from the knowledge base
   */
  async removeContent(sourceId: string): Promise<UpdateResult> {
    if (this.isUpdating) {
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: 'Update already in progress'
      }
    }

    this.isUpdating = true

    try {
      const backupId = await this.createBackup('Before removing content')

      // Find chunks to remove
      const existingChunks = this.knowledgeBase.getChunks()
      const chunksToRemove = existingChunks.filter(chunk => 
        chunk.source === sourceId || chunk.metadata.title.includes(sourceId)
      )

      if (chunksToRemove.length === 0) {
        return {
          success: false,
          chunksAdded: 0,
          chunksUpdated: 0,
          chunksRemoved: 0,
          vectorsUpdated: 0,
          message: `No content found matching source ID: ${sourceId}`
        }
      }

      // Remove chunks
      const remainingChunks = existingChunks.filter(chunk => 
        chunk.source !== sourceId && !chunk.metadata.title.includes(sourceId)
      )

      this.updateKnowledgeBaseChunks(remainingChunks)

      // Remove from vector store (would need vector store modifications for true removal)
      // For now, we'll reinitialize the vector store with remaining chunks
      this.vectorStore.clearAllIndexes()
      await this.vectorStore.initializeVectors(remainingChunks)

      return {
        success: true,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: chunksToRemove.length,
        vectorsUpdated: remainingChunks.length,
        message: `Successfully removed ${chunksToRemove.length} chunks`,
        backupId
      }
    } catch (error) {
      console.error('Error removing content:', error)
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    } finally {
      this.isUpdating = false
    }
  }

  /**
   * Create a backup of current knowledge base state
   */
  private async createBackup(description: string): Promise<string> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const currentChunks = this.knowledgeBase.getChunks()
    
    // Calculate checksums for integrity verification
    const checksums = new Map<string, string>()
    currentChunks.forEach(chunk => {
      checksums.set(chunk.id, this.calculateChecksum(chunk))
    })

    const backup: KnowledgeBackup = {
      id: backupId,
      timestamp: Date.now(),
      chunks: JSON.parse(JSON.stringify(currentChunks)), // Deep clone
      vectorCount: this.vectorStore.getVectorCount(),
      description,
      checksums
    }

    this.backups.set(backupId, backup)

    // Clean old backups
    this.cleanOldBackups()

    return backupId
  }

  /**
   * Restore from a backup
   */
  async restoreFromBackup(backupId: string): Promise<UpdateResult> {
    const backup = this.backups.get(backupId)
    if (!backup) {
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: `Backup not found: ${backupId}`
      }
    }

    try {
      // Verify backup integrity
      const integrityCheck = this.verifyBackupIntegrity(backup)
      if (!integrityCheck) {
        return {
          success: false,
          chunksAdded: 0,
          chunksUpdated: 0,
          chunksRemoved: 0,
          vectorsUpdated: 0,
          message: 'Backup integrity check failed'
        }
      }

      // Restore chunks
      this.updateKnowledgeBaseChunks(backup.chunks)

      // Restore vectors
      this.vectorStore.clearAllIndexes()
      await this.vectorStore.initializeVectors(backup.chunks)

      return {
        success: true,
        chunksAdded: 0,
        chunksUpdated: backup.chunks.length,
        chunksRemoved: 0,
        vectorsUpdated: backup.chunks.length,
        message: `Successfully restored from backup: ${backup.description}`
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      return {
        success: false,
        chunksAdded: 0,
        chunksUpdated: 0,
        chunksRemoved: 0,
        vectorsUpdated: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Validate update source with comprehensive content analysis
   */
  private async validateSource(source: UpdateSource): Promise<{valid: boolean, errors?: string[], warnings?: string[], suggestions?: string[], confidence?: number}> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      // Basic validation
      if (!source.content || source.content.trim().length === 0) {
        errors.push('Content cannot be empty')
      }

      if (source.content.length > this.MAX_FILE_SIZE) {
        errors.push(`Content too large: ${source.content.length} bytes (max: ${this.MAX_FILE_SIZE})`)
      }

      // Validate metadata
      if (!source.metadata.title || source.metadata.title.trim().length === 0) {
        errors.push('Title is required')
      }

      if (!source.metadata.courseType) {
        errors.push('Course type is required')
      }

      if (!source.metadata.courseNumber) {
        errors.push('Course number is required')
      }

      // Early return if basic validation fails
      if (errors.length > 0) {
        return { valid: false, errors }
      }

      // Security validation
      try {
        SecurityValidator.validateQuery(source.content)
        if (source.metadata.title) {
          SecurityValidator.validateQuery(source.metadata.title)
        }
      } catch (securityError) {
        errors.push(`Security validation failed: ${securityError instanceof Error ? securityError.message : 'Unknown security error'}`)
      }

      // Type-specific validation
      if (source.type === 'file') {
        const ext = extname(source.content).toLowerCase()
        if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
          errors.push(`File extension not allowed: ${ext}`)
        }
      } else if (source.type === 'url') {
        try {
          new URL(source.content)
        } catch {
          errors.push('Invalid URL format')
        }
      }

      // Comprehensive content validation using KnowledgeValidator
      const contentValidation = await KnowledgeValidator.validateContent(
        source.content,
        source.metadata.title,
        source.metadata.courseType,
        source.metadata.courseNumber
      )

      // Merge validation results
      errors.push(...contentValidation.errors)
      warnings.push(...contentValidation.warnings)
      suggestions.push(...contentValidation.suggestions)

      // Add quality warnings based on confidence
      if (contentValidation.confidence < 0.7) {
        warnings.push(`Content quality score is low (${Math.round(contentValidation.confidence * 100)}%)`)
      }

      if (contentValidation.confidence < 0.5) {
        suggestions.push('Consider reviewing and improving the content before adding to knowledge base')
      }

      return { 
        valid: errors.length === 0, 
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        confidence: contentValidation.confidence
      }
    } catch (error) {
      console.error('Error validating source:', error)
      return { valid: false, errors: ['Validation error occurred'] }
    }
  }

  /**
   * Process source into document chunks
   */
  private async processSource(source: UpdateSource): Promise<DocumentChunk[]> {
    let content = source.content

    // Handle different source types
    if (source.type === 'file') {
      // If it's a file path, read the file
      if (existsSync(source.content)) {
        content = readFileSync(source.content, 'utf-8')
      }
    } else if (source.type === 'url') {
      // For URLs, we'd need to fetch content (placeholder for now)
      throw new Error('URL fetching not implemented yet')
    }

    // Use knowledge base chunking logic
    const knowledgeBase = new KnowledgeBase()
    const chunks = (knowledgeBase as any).chunkDocument(
      content,
      source.metadata.source || `update_${Date.now()}`,
      source.metadata.title,
      source.metadata.courseType,
      source.metadata.courseNumber
    )

    // Add additional metadata
    return chunks.map((chunk: DocumentChunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        ...source.metadata,
        lastModified: source.metadata.lastModified || new Date().toISOString()
      }
    }))
  }

  /**
   * Update knowledge base chunks (simulated - in practice would modify the actual knowledge base)
   */
  private updateKnowledgeBaseChunks(chunks: DocumentChunk[]): void {
    // In a real implementation, this would update the knowledge base
    // For now, we'll update the internal chunks array via reflection
    (this.knowledgeBase as any)['chunks'] = chunks;
    (this.knowledgeBase as any)['isLoaded'] = true
  }

  /**
   * Update vector store with new chunks
   */
  private async updateVectorStore(newChunks: DocumentChunk[], removedChunks: DocumentChunk[]): Promise<void> {
    // Remove old chunks first
    if (removedChunks.length > 0) {
      const removedIds = removedChunks.map(chunk => chunk.id)
      await this.vectorStore.removeChunks(removedIds)
    }
    
    // Add new chunks
    if (newChunks.length > 0) {
      await this.vectorStore.addChunks(newChunks)
    }
  }

  /**
   * Calculate checksum for chunk integrity
   */
  private calculateChecksum(chunk: DocumentChunk): string {
    const chunkString = JSON.stringify(chunk)
    // Use a simple hash for demonstration (in production, use crypto)
    let hash = 0
    for (let i = 0; i < chunkString.length; i++) {
      const char = chunkString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Verify backup integrity
   */
  private verifyBackupIntegrity(backup: KnowledgeBackup): boolean {
    try {
      // Check if backup is too old
      if (Date.now() - backup.timestamp > this.BACKUP_TTL) {
        return false
      }

      // Verify checksums
      for (const chunk of backup.chunks) {
        const expectedChecksum = backup.checksums.get(chunk.id)
        const actualChecksum = this.calculateChecksum(chunk)
        if (expectedChecksum !== actualChecksum) {
          console.warn(`Checksum mismatch for chunk ${chunk.id}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error('Error verifying backup integrity:', error)
      return false
    }
  }

  /**
   * Clean old backups
   */
  private cleanOldBackups(): void {
    const backupEntries = Array.from(this.backups.entries())
    
    // Sort by timestamp (newest first)
    backupEntries.sort((a, b) => b[1].timestamp - a[1].timestamp)

    // Keep only the most recent backups
    const toKeep = backupEntries.slice(0, this.MAX_BACKUPS)
    const toRemove = backupEntries.slice(this.MAX_BACKUPS)

    // Remove old backups
    toRemove.forEach(([id]) => {
      this.backups.delete(id)
    })

    // Remove expired backups
    const now = Date.now()
    for (const [id, backup] of this.backups.entries()) {
      if (now - backup.timestamp > this.BACKUP_TTL) {
        this.backups.delete(id)
      }
    }
  }

  /**
   * Get available backups
   */
  getBackups(): Array<{id: string, timestamp: number, description: string, chunkCount: number}> {
    return Array.from(this.backups.values())
      .map(backup => ({
        id: backup.id,
        timestamp: backup.timestamp,
        description: backup.description,
        chunkCount: backup.chunks.length
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Get update status
   */
  isUpdateInProgress(): boolean {
    return this.isUpdating
  }

  /**
   * Get knowledge base statistics
   */
  getStatistics(): {
    totalChunks: number
    vectorCount: number
    backupCount: number
    lastUpdate?: number
    courseTypes: Record<string, number>
  } {
    const chunks = this.knowledgeBase.getChunks()
    const courseTypes: Record<string, number> = {}

    chunks.forEach(chunk => {
      const type = chunk.metadata.type
      courseTypes[type] = (courseTypes[type] || 0) + 1
    })

    return {
      totalChunks: chunks.length,
      vectorCount: this.vectorStore.getVectorCount(),
      backupCount: this.backups.size,
      courseTypes
    }
  }
}