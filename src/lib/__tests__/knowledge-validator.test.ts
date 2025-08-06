import { KnowledgeValidator } from '../knowledge-validator'
import { DocumentChunk } from '../knowledge-base'

describe('KnowledgeValidator', () => {
  describe('Content Validation', () => {
    it('should validate high-quality fashion content', async () => {
      const content = `
        Pattern making is a fundamental skill in fashion design that involves creating templates for garments. 
        The process begins with taking accurate measurements and understanding the relationship between the body 
        and the garment. Key elements include dart placement for fit, seam allowances for construction, 
        and proper grain line alignment for fabric drape.
        
        When working with patterns, consider the ease requirements - the difference between body measurements 
        and the finished garment measurements. Different garment types require different amounts of ease:
        - Close-fitting garments: 1-2 inches
        - Semi-fitted garments: 2-4 inches  
        - Loose-fitting garments: 4+ inches
        
        Understanding these fundamentals will help you create well-fitting, professional garments.
      `

      const result = await KnowledgeValidator.validateContent(
        content,
        'Pattern Making Fundamentals',
        'pattern-making',
        '101'
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should identify content that is too short', async () => {
      const content = 'Pattern making is important.'

      const result = await KnowledgeValidator.validateContent(
        content,
        'Short Content',
        'pattern-making',
        '101'
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(expect.stringContaining('Content too short'))
    })

    it('should detect low fashion term density', async () => {
      const content = `
        This is a generic article about various topics and subjects. It contains lots of words
        but none of them are specifically related to fashion design or garment construction.
        The content discusses general concepts and ideas without focusing on any particular
        domain or field of study. It uses common vocabulary and standard terminology
        that could apply to many different subjects or areas of interest.
      `

      const result = await KnowledgeValidator.validateContent(
        content,
        'Generic Content',
        'pattern-making',
        '101'
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('Low fashion term density'))
      expect(result.suggestions).toContainEqual(expect.stringContaining('fashion-specific terminology'))
    })

    it('should validate course type alignment', async () => {
      const illustratorContent = `
        Adobe Illustrator is essential for creating flat sketches and technical drawings in fashion design.
        The pen tool allows precise vector paths for clean lines. Color palettes and swatches help
        maintain consistency across designs. Using brushes and texture effects can add visual interest
        to fashion illustrations.
      `

      const result = await KnowledgeValidator.validateContent(
        illustratorContent,
        'Illustrator Basics',
        'pattern-making', // Wrong course type
        '101'
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('may not align well with course type'))
      expect(result.suggestions).toContainEqual(expect.stringContaining('illustrator-fashion'))
    })

    it('should validate course number consistency', async () => {
      const advancedContent = `
        Advanced draping techniques require mastery of complex bias manipulation and structural engineering
        principles. Professional couture methods involve sophisticated dart conversion techniques and
        advanced seaming methodologies that build upon fundamental pattern making principles.
      `

      const result = await KnowledgeValidator.validateContent(
        advancedContent,
        'Advanced Techniques',
        'pattern-making',
        '101' // Beginner course number for advanced content
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('High technical complexity for an introductory course'))
    })

    it('should detect mixed language content', async () => {
      const mixedContent = `
        Pattern making involves creating templates called "Schnittmuster" in German. 
        The process of draping or "drapieren" requires understanding fabric behavior.
        These techniques are fundamental to "Bekleidungskonstruktion" or garment construction.
      `

      const result = await KnowledgeValidator.validateContent(
        mixedContent,
        'Mixed Language Content',
        'pattern-making',
        '101'
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('Mixed language content detected'))
    })

    it('should validate title relevance', async () => {
      const content = `
        Draping is a fundamental technique in fashion design that involves manipulating fabric
        directly on a dress form to create three-dimensional garment shapes. This hands-on
        approach allows designers to see how fabric behaves and flows naturally.
      `

      const result = await KnowledgeValidator.validateContent(
        content,
        'Pattern Making Basics', // Title doesn't match content
        'draping',
        '301'
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('Title may not be representative'))
    })
  })

  describe('Content Analysis', () => {
    it('should analyze fashion term density correctly', async () => {
      const highFashionContent = `
        Pattern making involves creating accurate dart placements, proper seam allowances,
        and understanding grain lines. The muslin fitting process helps identify alterations
        needed for proper ease and silhouette. Notches mark important construction points.
      `

      const result = await KnowledgeValidator.validateContent(
        highFashionContent,
        'Fashion Terms Test',
        'pattern-making',
        '101'
      )

      // Should not have low fashion term density warning
      expect(result.warnings.filter(w => w.includes('Low fashion term density'))).toHaveLength(0)
    })

    it('should detect German fashion terminology', async () => {
      const germanContent = `
        Die technische Modezeichnung mit Adobe Illustrator erfordert präzise Schnittlinien
        und korrekte Proportionen. Verschiedene Werkzeuge wie das Zeichenstift-Tool ermöglichen
        die Erstellung professioneller Entwürfe für die Bekleidungsindustrie.
      `

      const result = await KnowledgeValidator.validateContent(
        germanContent,
        'Technische Modezeichnung',
        'illustrator-fashion',
        '202'
      )

      expect(result.confidence).toBeGreaterThan(0.5) // Should recognize German fashion terms
    })
  })

  describe('Chunk Validation', () => {
    it('should validate chunk consistency', () => {
      const chunks: DocumentChunk[] = [
        {
          id: 'chunk-1',
          content: 'Pattern making fundamentals involve understanding measurements and fit.',
          source: 'pattern-basics.md',
          section: 'Introduction',
          metadata: {
            title: 'Pattern Making Basics',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 67
          }
        },
        {
          id: 'chunk-2',
          content: 'Draping allows designers to work directly with fabric on a dress form.',
          source: 'draping-intro.md',
          section: 'Overview',
          metadata: {
            title: 'Draping Introduction',
            type: 'draping',
            courseNumber: '301',
            moduleNumber: '3.1',
            length: 67
          }
        }
      ]

      const result = KnowledgeValidator.validateChunks(chunks)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect duplicate content in chunks', () => {
      const chunks: DocumentChunk[] = [
        {
          id: 'chunk-1',
          content: 'This is identical content that appears in multiple chunks.',
          source: 'source-1.md',
          section: 'Section A',
          metadata: {
            title: 'Title 1',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 56
          }
        },
        {
          id: 'chunk-2',
          content: 'This is identical content that appears in multiple chunks.',
          source: 'source-2.md',
          section: 'Section B',
          metadata: {
            title: 'Title 2',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.2',
            length: 56
          }
        }
      ]

      const result = KnowledgeValidator.validateChunks(chunks)

      expect(result.warnings).toContainEqual(expect.stringContaining('Potential duplicate content'))
    })

    it('should detect size distribution issues', () => {
      const chunks: DocumentChunk[] = [
        // Very large chunk
        {
          id: 'chunk-1',
          content: 'A'.repeat(5000),
          source: 'large.md',
          section: 'Large Section',
          metadata: {
            title: 'Large Content',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.1',
            length: 5000
          }
        },
        // Normal sized chunks
        ...Array.from({ length: 8 }, (_, i) => ({
          id: `chunk-${i + 2}`,
          content: 'B'.repeat(1000),
          source: `normal-${i}.md`,
          section: `Section ${i}`,
          metadata: {
            title: `Normal Content ${i}`,
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: `1.${i + 2}`,
            length: 1000
          }
        })),
        // Very small chunk
        {
          id: 'chunk-11',
          content: 'Small',
          source: 'small.md',
          section: 'Small Section',
          metadata: {
            title: 'Small Content',
            type: 'pattern-making',
            courseNumber: '101',
            moduleNumber: '1.11',
            length: 5
          }
        }
      ]

      const result = KnowledgeValidator.validateChunks(chunks)

      expect(result.warnings).toContainEqual(expect.stringContaining('significantly larger than average'))
      expect(result.warnings).toContainEqual(expect.stringContaining('significantly smaller than average'))
    })

    it('should handle empty chunk array', () => {
      const result = KnowledgeValidator.validateChunks([])

      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual('No chunks provided for validation')
    })
  })

  describe('Edge Cases', () => {
    it('should handle validation errors gracefully', async () => {
      // Test with null/undefined content
      const result = await KnowledgeValidator.validateContent(
        null as any,
        'Test Title',
        'pattern-making',
        '101'
      )

      expect(result.isValid).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('should validate course number formats', async () => {
      const content = 'Valid fashion content with pattern making terminology and techniques.'

      // Invalid course number format
      const result1 = await KnowledgeValidator.validateContent(
        content,
        'Test',
        'pattern-making',
        '1' // Too short
      )

      expect(result1.warnings).toContainEqual(expect.stringContaining('should be a 3-digit number'))

      // Valid course number
      const result2 = await KnowledgeValidator.validateContent(
        content,
        'Test',
        'pattern-making',
        '101'
      )

      expect(result2.warnings.filter(w => w.includes('3-digit number'))).toHaveLength(0)
    })

    it('should handle very long content', async () => {
      const longContent = 'Fashion pattern making involves many techniques. '.repeat(500) // Very long content

      const result = await KnowledgeValidator.validateContent(
        longContent,
        'Long Content Test',
        'pattern-making',
        '101'
      )

      expect(result.warnings).toContainEqual(expect.stringContaining('Content is very long'))
      expect(result.suggestions).toContainEqual(expect.stringContaining('consider splitting'))
    })
  })
})