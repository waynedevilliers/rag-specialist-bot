import { KnowledgeUpdateService, UpdateSource } from '../knowledge-update-service'
import { KnowledgeValidator } from '../knowledge-validator'
import { KnowledgeBase } from '../knowledge-base'
import { VectorStore } from '../vector-store'

// Mock the dependencies
jest.mock('../knowledge-base')
jest.mock('../vector-store')
jest.mock('../knowledge-validator')

describe('KnowledgeUpdateService', () => {
  let updateService: KnowledgeUpdateService
  let mockKnowledgeBase: jest.Mocked<KnowledgeBase>
  let mockVectorStore: jest.Mocked<VectorStore>

  beforeEach(() => {
    // Create mock instances
    mockKnowledgeBase = {
      getChunks: jest.fn().mockReturnValue([]),
      loadDocuments: jest.fn(),
      // Add other methods as needed
    } as any

    mockVectorStore = {
      addChunks: jest.fn(),
      removeChunks: jest.fn(),
      updateChunks: jest.fn(),
      synchronizeWithChunks: jest.fn(),
      getVectorCount: jest.fn().mockReturnValue(0),
      clearAllIndexes: jest.fn(),
      initializeVectors: jest.fn(),
    } as any

    updateService = new KnowledgeUpdateService(mockKnowledgeBase, mockVectorStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Content Validation', () => {
    it('should validate fashion-related content successfully', async () => {
      // Mock KnowledgeValidator to return positive validation
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        confidence: 0.85
      })

      const source: UpdateSource = {
        type: 'text',
        content: `Pattern making is a fundamental skill in fashion design that involves creating templates for garments using precise measurements and design specifications. Learn the essential techniques for professional pattern construction.

Key concepts include dart placement for fit, seam allowances for construction, and proper grain line alignment for fabric drape. Understanding these pattern making fundamentals is crucial for fashion designers.

When working with patterns, consider the ease requirements - the difference between body measurements and finished garment measurements. Different garment types require different amounts of ease for proper fit and comfort.

This technique involves using interfacing for structure, notches for construction alignment, and proper finishing methods. Pattern making is the foundation of all garment construction in fashion design.`,
        metadata: {
          title: 'Introduction to Pattern Making',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      const result = await updateService.addContent(source)

      expect(result.success).toBe(true)
      expect(result.confidence).toBe(0.85)
      expect(KnowledgeValidator.validateContent).toHaveBeenCalledWith(
        source.content,
        source.metadata.title,
        source.metadata.courseType,
        source.metadata.courseNumber
      )
    })

    it('should reject content that fails security validation', async () => {
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: false,
        errors: ['Security validation failed: Potentially harmful content detected'],
        warnings: [],
        suggestions: [],
        confidence: 0.1
      })

      const source: UpdateSource = {
        type: 'text',
        content: 'This content contains malicious scripts <script>alert("xss")</script>',
        metadata: {
          title: 'Malicious Content',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      const result = await updateService.addContent(source)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Security validation failed: Potentially harmful content detected')
    })

    it('should handle low-quality content with warnings', async () => {
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Low fashion term density: 1% (recommended: 2%)', 'Content quality score is low (65%)'],
        suggestions: ['Consider adding more fashion-specific terminology'],
        confidence: 0.65
      })

      const source: UpdateSource = {
        type: 'text',
        content: 'This is some generic content about things and stuff. It does not contain much relevant information.',
        metadata: {
          title: 'Generic Content',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      const result = await updateService.addContent(source)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Low fashion term density: 1% (recommended: 2%)')
      expect(result.suggestions).toContain('Consider adding more fashion-specific terminology')
      expect(result.confidence).toBe(0.65)
    })
  })

  describe('Content Addition', () => {
    beforeEach(() => {
      // Mock successful validation by default
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        confidence: 0.8
      })
    })

    it('should successfully add new content', async () => {
      const source: UpdateSource = {
        type: 'text',
        content: 'Draping is a technique used to create garments by manipulating fabric directly on a dress form.',
        metadata: {
          title: 'Draping Fundamentals',
          courseType: 'draping',
          courseNumber: '301'
        }
      }

      mockKnowledgeBase.getChunks.mockReturnValue([])
      mockVectorStore.addChunks.mockResolvedValue()

      const result = await updateService.addContent(source)

      expect(result.success).toBe(true)
      expect(result.chunksAdded).toBeGreaterThan(0)
      expect(mockVectorStore.addChunks).toHaveBeenCalled()
    })

    it('should create backup before adding content', async () => {
      const source: UpdateSource = {
        type: 'text',
        content: 'Fashion construction involves assembling pattern pieces into finished garments.',
        metadata: {
          title: 'Construction Basics',
          courseType: 'construction',
          courseNumber: '401'
        }
      }

      const result = await updateService.addContent(source)

      expect(result.success).toBe(true)
      expect(result.backupId).toBeDefined()
      expect(result.backupId).toMatch(/^backup_\d+_[a-z0-9]+$/)
    })

    it('should handle empty content gracefully', async () => {
      const source: UpdateSource = {
        type: 'text',
        content: '',
        metadata: {
          title: 'Empty Content',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      const result = await updateService.addContent(source)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Content cannot be empty')
    })
  })

  describe('Content Update', () => {
    beforeEach(() => {
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        confidence: 0.8
      })

      // Mock existing chunks
      mockKnowledgeBase.getChunks.mockReturnValue([
        {
          id: 'existing-1',
          content: 'Old content about patterns',
          source: 'pattern-basics',
          section: 'Introduction',
          metadata: {
            title: 'Pattern Basics',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 25
          }
        }
      ])
    })

    it('should successfully update existing content', async () => {
      const source: UpdateSource = {
        type: 'text',
        content: 'Updated content about pattern making with more detailed information.',
        metadata: {
          title: 'Pattern Basics',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      mockVectorStore.removeChunks.mockResolvedValue()
      mockVectorStore.addChunks.mockResolvedValue()

      const result = await updateService.updateContent('pattern-basics', source)

      expect(result.success).toBe(true)
      expect(result.chunksUpdated).toBeGreaterThan(0)
      expect(mockVectorStore.removeChunks).toHaveBeenCalled()
      expect(mockVectorStore.addChunks).toHaveBeenCalled()
    })

    it('should treat update as add when no existing content found', async () => {
      mockKnowledgeBase.getChunks.mockReturnValue([]) // No existing chunks

      const source: UpdateSource = {
        type: 'text',
        content: 'New content about fashion illustration',
        metadata: {
          title: 'Illustration Basics',
          courseType: 'illustrator-fashion',
          courseNumber: '201'
        }
      }

      const result = await updateService.updateContent('non-existent', source)

      expect(result.success).toBe(true)
      expect(result.chunksAdded).toBeGreaterThan(0)
    })
  })

  describe('Content Removal', () => {
    beforeEach(() => {
      mockKnowledgeBase.getChunks.mockReturnValue([
        {
          id: 'chunk-1',
          content: 'Content to be removed',
          source: 'old-source',
          section: 'Section 1',
          metadata: {
            title: 'Old Content',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 20
          }
        }
      ])
    })

    it('should successfully remove existing content', async () => {
      mockVectorStore.clearAllIndexes.mockResolvedValue()
      mockVectorStore.initializeVectors.mockResolvedValue()

      const result = await updateService.removeContent('old-source')

      expect(result.success).toBe(true)
      expect(result.chunksRemoved).toBe(1)
      expect(mockVectorStore.clearAllIndexes).toHaveBeenCalled()
    })

    it('should handle removal of non-existent content', async () => {
      const result = await updateService.removeContent('non-existent-source')

      expect(result.success).toBe(false)
      expect(result.message).toContain('No content found matching source ID')
    })
  })

  describe('Backup and Restore', () => {
    it('should create and restore backups', async () => {
      // Mock existing chunks for backup
      const existingChunks = [
        {
          id: 'chunk-1',
          content: 'Original content',
          source: 'source-1',
          section: 'Section 1',
          metadata: {
            title: 'Original Title',
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 16
          }
        }
      ]

      mockKnowledgeBase.getChunks.mockReturnValue(existingChunks)
      mockVectorStore.getVectorCount.mockReturnValue(1)

      // Add content to create a backup
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        confidence: 0.8
      })

      const source: UpdateSource = {
        type: 'text',
        content: 'New content',
        metadata: {
          title: 'New Title',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      const addResult = await updateService.addContent(source)
      expect(addResult.backupId).toBeDefined()

      // Get backups
      const backups = updateService.getBackups()
      expect(backups.length).toBe(1)
      expect(backups[0].description).toBe('Before adding new content')

      // Restore from backup
      mockVectorStore.clearAllIndexes.mockResolvedValue()
      mockVectorStore.initializeVectors.mockResolvedValue()

      const restoreResult = await updateService.restoreFromBackup(addResult.backupId!)
      expect(restoreResult.success).toBe(true)
    })

    it('should fail to restore from non-existent backup', async () => {
      const result = await updateService.restoreFromBackup('non-existent-backup')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Backup not found')
    })
  })

  describe('Statistics', () => {
    it('should return knowledge base statistics', () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          content: 'Content 1',
          source: 'source-1',
          section: 'Section 1',
          metadata: {
            title: 'Title 1',
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 9
          }
        },
        {
          id: 'chunk-2',
          content: 'Content 2',
          source: 'source-2',
          section: 'Section 2',
          metadata: {
            title: 'Title 2',
            type: 'draping' as const,
            courseNumber: '301',
            moduleNumber: '3.1',
            length: 9
          }
        }
      ]

      mockKnowledgeBase.getChunks.mockReturnValue(mockChunks)
      mockVectorStore.getVectorCount.mockReturnValue(2)

      const stats = updateService.getStatistics()

      expect(stats.totalChunks).toBe(2)
      expect(stats.vectorCount).toBe(2)
      expect(stats.courseTypes).toEqual({
        'pattern-making': 1,
        'draping': 1
      })
    })
  })

  describe('Concurrent Update Prevention', () => {
    it('should prevent concurrent updates', async () => {
      ;(KnowledgeValidator.validateContent as jest.Mock).mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
        confidence: 0.8
      })

      // Mock a slow operation
      mockVectorStore.addChunks.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      const source: UpdateSource = {
        type: 'text',
        content: 'Test content',
        metadata: {
          title: 'Test',
          courseType: 'pattern-making',
          courseNumber: '101'
        }
      }

      // Start first update
      const firstUpdate = updateService.addContent(source)

      // Try to start second update immediately
      const secondUpdate = updateService.addContent(source)

      const results = await Promise.all([firstUpdate, secondUpdate])

      // One should succeed, one should fail due to concurrent update
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success && r.message.includes('already in progress')).length

      expect(successful).toBe(1)
      expect(failed).toBe(1)
    })
  })
})