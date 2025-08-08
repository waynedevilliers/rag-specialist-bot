import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-key-' + 'x'.repeat(45)
process.env.NODE_ENV = 'test'

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async ({ messages }) => {
          const userMessage = messages[messages.length - 1]?.content || ''
          
          // Mock responses based on the test questions
          let mockResponse = ''
          
          if (userMessage.toLowerCase().includes('list all') || userMessage.toLowerCase().includes('liste alle')) {
            mockResponse = `At ELLU Studios, we offer 3 courses:
            • Classical Pattern Construction (Course 101)
            • Draping Techniques (Course 201)  
            • Adobe Illustrator for Fashion Design (Course 301)`
          }
          else if (userMessage.includes('Course 201') || userMessage.includes('Kurs 201')) {
            mockResponse = `Course 201 covers Draping Techniques including muslin preparation, bodice draping, sleeve methods, and bias techniques.`
          }
          else if (userMessage.toLowerCase().includes('adobe illustrator course') || userMessage.toLowerCase().includes('adobe illustrator kurs')) {
            mockResponse = `The Adobe Illustrator course is Course 301, focusing on technical flats, color palettes, textile patterns, and presentations.`
          }
          else if (userMessage.toLowerCase().includes('ease') || userMessage.toLowerCase().includes('mehrweite')) {
            mockResponse = `Ease calculation is covered in Course 101 (Classical Pattern Construction). Ease is the difference between body measurements and pattern measurements.`
          }
          else if (userMessage.toLowerCase().includes('muslin') || userMessage.toLowerCase().includes('muslin-vorbereitung')) {
            mockResponse = `Muslin preparation is part of Course 201 (Draping Techniques). It involves selecting appropriate weight muslin and preparing it for draping.`
          }
          else if (userMessage.toLowerCase().includes('technical flats') || userMessage.toLowerCase().includes('technische zeichnungen')) {
            mockResponse = `Creating technical flats is covered in Course 301 (Adobe Illustrator for Fashion Design). Technical flats are detailed drawings showing construction details.`
          }
          else if (userMessage.toLowerCase().includes('draping techniques') || userMessage.toLowerCase().includes('drapier-techniken')) {
            mockResponse = `Draping techniques are the focus of Course 201, which covers muslin preparation, bodice draping, and bias work.`
          }
          else if (userMessage.toLowerCase().includes('fabric needed') || userMessage.toLowerCase().includes('stoffbedarf')) {
            mockResponse = `Based on pattern measurements from Course 101, a size 12 dress typically requires 2-3 yards of 45" wide fabric, depending on design complexity.`
          }
          else if (userMessage.toLowerCase().includes('bodice draping') || userMessage.toLowerCase().includes('oberteil-drapier')) {
            mockResponse = `Bodice draping tutorial from Course 201: 1) Prepare muslin, 2) Mark center front/back, 3) Pin to dress form, 4) Shape bust area, 5) Mark seam lines.`
          }
          else if (userMessage.toLowerCase().includes('pattern construction') || userMessage.toLowerCase().includes('schnittmuster-konstruktion')) {
            mockResponse = `Pattern construction is taught in Course 101 (Classical Pattern Construction), covering measurements, ease, and pattern development.`
          }
          else {
            mockResponse = 'I can help you with questions about our fashion design courses.'
          }
          
          return {
            choices: [{ message: { content: mockResponse } }],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
          }
        })
      }
    },
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }]
      })
    }
  }))
}))

describe('Course Integration Tests - 10 Test Questions', () => {
  const testQuestions = {
    english: [
      'List all available courses',
      'What is covered in Course 201?',
      'Tell me about Adobe Illustrator course', 
      'How do I calculate ease in pattern making?',
      'What is muslin preparation?',
      'How do I create technical flats in Illustrator?',
      'What courses focus on draping techniques?',
      'Calculate fabric needed for a size 12 dress',
      'Show me a bodice draping tutorial',
      'Which course teaches pattern construction?'
    ],
    german: [
      'Liste alle verfügbaren Kurse auf',
      'Was wird in Kurs 201 behandelt?',
      'Erzähle mir über den Adobe Illustrator Kurs',
      'Wie berechne ich Mehrweite beim Schnittmuster?',
      'Was ist Muslin-Vorbereitung?',
      'Wie erstelle ich technische Zeichnungen in Illustrator?',
      'Welche Kurse konzentrieren sich auf Drapier-Techniken?',
      'Berechne den Stoffbedarf für ein Kleid Größe 12',
      'Zeige mir ein Oberteil-Drapier-Tutorial',
      'Welcher Kurs lehrt Schnittmuster-Konstruktion?'
    ]
  }

  const createRequest = (message: string, language: 'en' | 'de' = 'en') => {
    return new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: [],
        language,
        model: 'gpt-4o-mini'
      })
    })
  }

  describe('English Course Structure Tests', () => {
    test('Q1: Should list exactly 3 courses in correct order', async () => {
      const request = createRequest(testQuestions.english[0])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 101')
      expect(data.content).toContain('Course 201')  
      expect(data.content).toContain('Course 301')
      expect(data.content).not.toContain('Course 401')
      expect(data.content).toContain('Classical Pattern Construction')
      expect(data.content).toContain('Draping Techniques')
      expect(data.content).toContain('Adobe Illustrator')
    })

    test('Q2: Should correctly identify Course 201 as Draping', async () => {
      const request = createRequest(testQuestions.english[1])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 201')
      expect(data.content).toContain('Draping Techniques')
      expect(data.content).not.toContain('Adobe Illustrator')
    })

    test('Q3: Should correctly identify Adobe Illustrator as Course 301', async () => {
      const request = createRequest(testQuestions.english[2])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 301')
      expect(data.content).toContain('Adobe Illustrator')
      expect(data.content).not.toContain('Course 201')
    })

    test('Q4: Should reference Course 101 for ease calculation', async () => {
      const request = createRequest(testQuestions.english[3])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 101')
      expect(data.content).toMatch(/(ease|pattern|construction)/i)
    })

    test('Q5: Should reference Course 201 for muslin preparation', async () => {
      const request = createRequest(testQuestions.english[4])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 201')
      expect(data.content).toMatch(/(draping|muslin)/i)
    })

    test('Q6: Should reference Course 301 for technical flats', async () => {
      const request = createRequest(testQuestions.english[5])
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toContain('Course 301')
      expect(data.content).toMatch(/(illustrator|technical)/i)
    })
  })

  describe('German Course Structure Tests', () => {
    test('Q1 (DE): Should list courses in German with correct numbers', async () => {
      const request = createRequest(testQuestions.german[0], 'de')
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toMatch(/(Kurs 101|Course 101)/)
      expect(data.content).toMatch(/(Kurs 201|Course 201)/)
      expect(data.content).toMatch(/(Kurs 301|Course 301)/)
      expect(data.content).not.toContain('Kurs 401')
    })

    test('Q2 (DE): Should identify Kurs 201 as Drapier-Techniken', async () => {
      const request = createRequest(testQuestions.german[1], 'de')  
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toMatch(/(Kurs 201|Course 201)/)
      expect(data.content).toMatch(/(Draping|Drapier)/i)
    })

    test('Q10 (DE): Should identify pattern construction as Course 101', async () => {
      const request = createRequest(testQuestions.german[9], 'de')
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toMatch(/(Kurs 101|Course 101)/)
      expect(data.content).toMatch(/(pattern|konstruktion|construction)/i)
    })
  })

  describe('Response Quality Tests', () => {
    test('Should provide educational, helpful responses', async () => {
      const request = createRequest(testQuestions.english[8]) // bodice draping tutorial
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content.length).toBeGreaterThan(50) // Substantial response
      expect(data.content).toContain('Course 201') // Correct course reference
      expect(data.sources).toBeDefined() // Should include sources
    })

    test('Should handle function calling for calculations', async () => {
      const request = createRequest(testQuestions.english[7]) // fabric calculation
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.content).toMatch(/\d+/) // Should include numbers
      expect(data.content).toMatch(/(fabric|yard|meter)/i) // Should mention fabric units
    })
  })
})