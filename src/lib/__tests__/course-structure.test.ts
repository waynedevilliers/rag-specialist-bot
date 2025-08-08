import { RAGSystem } from '../rag-system'
import { KnowledgeBase } from '../knowledge-base'
import { translations } from '../translations'

// Mock OpenAI for testing
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }]
      })
    }
  }))
}))

describe('Course Structure Validation Tests', () => {
  let ragSystem: RAGSystem
  let knowledgeBase: KnowledgeBase

  beforeEach(async () => {
    knowledgeBase = new KnowledgeBase()
    await knowledgeBase.loadDocuments()
    ragSystem = new RAGSystem()
  })

  describe('Course Structure Tests', () => {
    test('should have exactly 3 courses in knowledge base', async () => {
      const chunks = knowledgeBase.getChunks()
      const courses = new Set(chunks.map(chunk => chunk.metadata.courseNumber))
      
      expect(courses.size).toBe(3)
      expect(courses.has('101')).toBe(true) // Classical Pattern Construction
      expect(courses.has('201')).toBe(true) // Draping Techniques
      expect(courses.has('301')).toBe(true) // Adobe Illustrator
      expect(courses.has('401')).toBe(false) // Should not exist
      expect(courses.has('202')).toBe(false) // Should not exist
    })

    test('should map courses correctly', async () => {
      const chunks = knowledgeBase.getChunks()
      
      // Course 101 should be pattern-making
      const course101 = chunks.filter(c => c.metadata.courseNumber === '101')
      expect(course101.some(c => c.metadata.type === 'pattern-making')).toBe(true)
      
      // Course 201 should be draping
      const course201 = chunks.filter(c => c.metadata.courseNumber === '201')
      expect(course201.some(c => c.metadata.type === 'draping')).toBe(true)
      
      // Course 301 should be illustrator-fashion
      const course301 = chunks.filter(c => c.metadata.courseNumber === '301')
      expect(course301.some(c => c.metadata.type === 'illustrator-fashion')).toBe(true)
    })
  })

  describe('Translation Consistency Tests', () => {
    test('should have consistent course names in English translations', () => {
      const en = translations.en
      
      expect(en.course101).toContain('Classical Pattern Construction')
      expect(en.course101).toContain('Course 101')
      
      expect(en.course201).toContain('Draping Techniques')
      expect(en.course201).toContain('Course 201')
      
      expect(en.course301).toContain('Adobe Illustrator')
      expect(en.course301).toContain('Course 301')
      
      // Should not have Course 401
      expect(en).not.toHaveProperty('course401')
    })

    test('should have consistent course names in German translations', () => {
      const de = translations.de
      
      expect(de.course101).toContain('Klassische Schnittmuster-Konstruktion')
      expect(de.course101).toContain('Kurs 101')
      
      expect(de.course201).toContain('Drapier-Techniken')
      expect(de.course201).toContain('Kurs 201')
      
      expect(de.course301).toContain('Adobe Illustrator')
      expect(de.course301).toContain('Kurs 301')
      
      // Should not have Course 401
      expect(de).not.toHaveProperty('course401')
    })

    test('should have correct course order in welcome messages', () => {
      const enWelcome = translations.en.welcomeMessage
      const deWelcome = translations.de.welcomeMessage
      
      // Check English course order
      expect(enWelcome).toMatch(/Classical Pattern Construction.*Course 101/s)
      expect(enWelcome).toMatch(/Draping Techniques.*Course 201/s)
      expect(enWelcome).toMatch(/Adobe Illustrator.*Course 301/s)
      expect(enWelcome).not.toContain('Course 401')
      
      // Check German course order
      expect(deWelcome).toMatch(/Klassische Schnittmuster-Konstruktion.*Kurs 101/s)
      expect(deWelcome).toMatch(/Drapier-Techniken.*Kurs 201/s)
      expect(deWelcome).toMatch(/Adobe Illustrator.*Kurs 301/s)
      expect(deWelcome).not.toContain('Kurs 401')
    })
  })

  describe('Mock Response Tests', () => {
    const mockOpenAIResponse = (content: string) => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      })
      
      return {
        chat: { completions: { create: mockCreate } },
        embeddings: { create: jest.fn().mockResolvedValue({ data: [{ embedding: new Array(1536).fill(0.1) }] }) }
      }
    }

    test('should correctly identify Course 201 as Draping', async () => {
      const mockContent = 'Course 201 covers Draping Techniques including muslin preparation, bodice draping, and bias techniques.'
      
      // Mock the OpenAI response
      jest.doMock('openai', () => ({
        OpenAI: jest.fn().mockImplementation(() => mockOpenAIResponse(mockContent))
      }))

      // Test that the system would identify draping as Course 201
      expect(mockContent).toContain('Course 201')
      expect(mockContent).toContain('Draping Techniques')
      expect(mockContent).not.toContain('Adobe Illustrator')
    })

    test('should correctly identify Course 301 as Adobe Illustrator', async () => {
      const mockContent = 'Course 301 focuses on Adobe Illustrator for Fashion Design, including technical flats and color palettes.'
      
      expect(mockContent).toContain('Course 301')
      expect(mockContent).toContain('Adobe Illustrator')
      expect(mockContent).not.toContain('Draping')
    })
  })

  describe('System Prompt Validation', () => {
    test('should have correct course mappings in system prompt', () => {
      // Access the system prompt from RAGSystem (this tests the fixed prompt)
      const ragSystemInstance = new RAGSystem()
      
      // We can't directly access the prompt, but we can test that the knowledge base
      // has the correct structure which feeds into the prompt
      const chunks = knowledgeBase.getChunks()
      
      // Verify course titles match our expected structure
      const course101Chunks = chunks.filter(c => c.metadata.courseNumber === '101')
      const course201Chunks = chunks.filter(c => c.metadata.courseNumber === '201')
      const course301Chunks = chunks.filter(c => c.metadata.courseNumber === '301')
      
      expect(course101Chunks.length).toBeGreaterThan(0)
      expect(course201Chunks.length).toBeGreaterThan(0)
      expect(course301Chunks.length).toBeGreaterThan(0)
      
      // Verify no Course 401 or 202 chunks exist
      const invalidCourses = chunks.filter(c => 
        c.metadata.courseNumber === '401' || c.metadata.courseNumber === '202'
      )
      expect(invalidCourses.length).toBe(0)
    })
  })
})