import { FunctionCallingSystem } from '../function-calling-system'
import { ragSystem } from '../rag-system'

describe('Enhanced Function Calling System', () => {
  const functionSystem = new FunctionCallingSystem()

  // Test query analysis
  describe('Query Analysis for Function Detection', () => {
    test('Should detect measurement calculation queries', async () => {
      const queries = [
        "How much fabric do I need for a size 12 dress?",
        "Calculate yardage for a skirt with 28 inch waist and 36 inch hips",
        "What are the pattern pieces for a blouse?"
      ]

      for (const query of queries) {
        const analysis = await functionSystem.analyzeQueryForFunctions(query, '')
        expect(analysis.shouldUseFunctions).toBe(true)
        expect(analysis.suggestedFunctions).toContain('calculate_measurements')
        expect(analysis.confidence).toBeGreaterThan(0.6)
      }
    })

    test('Should detect technique guide queries', async () => {
      const queries = [
        "How do I set a sleeve properly?",
        "Step by step instructions for bust darts",
        "I'm having trouble with bias draping"
      ]

      for (const query of queries) {
        const analysis = await functionSystem.analyzeQueryForFunctions(query, '')
        expect(analysis.shouldUseFunctions).toBe(true)
        expect(analysis.suggestedFunctions).toContain('get_technique_guide')
        expect(analysis.confidence).toBeGreaterThan(0.6)
      }
    })

    test('Should detect Illustrator help queries', async () => {
      const queries = [
        "How do I create technical flats in Illustrator?",
        "Adobe Illustrator color palette help",
        "Fashion illustration pen tool techniques"
      ]

      for (const query of queries) {
        const analysis = await functionSystem.analyzeQueryForFunctions(query, '')
        expect(analysis.shouldUseFunctions).toBe(true)
        expect(analysis.suggestedFunctions).toContain('get_illustrator_help')
        expect(analysis.confidence).toBeGreaterThan(0.6)
      }
    })

    test('Should NOT detect functions for general questions', async () => {
      const queries = [
        "What is fashion design?",
        "Tell me about ELLU Studios",
        "Hello, how are you?"
      ]

      for (const query of queries) {
        const analysis = await functionSystem.analyzeQueryForFunctions(query, '')
        expect(analysis.shouldUseFunctions).toBe(false)
        expect(analysis.confidence).toBeLessThan(0.6)
      }
    })
  })

  // Test function execution
  describe('Function Execution', () => {
    test('Should calculate measurements correctly', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI function calling test - no API key')
        return
      }

      const messages = [
        { role: 'system' as const, content: 'You are a fashion design assistant.' },
        { role: 'user' as const, content: 'I need to calculate fabric for a dress. My measurements are bust 36, waist 28, hip 38 inches, and I want a 36 inch long dress.' }
      ]

      const result = await functionSystem.callWithFunctions(messages, ['calculate_measurements'])

      expect(result.functionCalls).toHaveLength(1)
      expect(result.functionCalls[0].name).toBe('calculate_measurements')
      expect(result.functionCalls[0].result.fabricYardage).toBeGreaterThan(0)
      expect(result.functionCalls[0].result.patternPieces).toBeDefined()
      expect(result.content).toContain('fabric')
    }, 30000)

    test('Should provide technique guidance', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI function calling test - no API key')
        return
      }

      const messages = [
        { role: 'system' as const, content: 'You are a fashion design assistant.' },
        { role: 'user' as const, content: 'I need step-by-step help setting a sleeve. I\'m a beginner.' }
      ]

      const result = await functionSystem.callWithFunctions(messages, ['get_technique_guide'])

      expect(result.functionCalls).toHaveLength(1)
      expect(result.functionCalls[0].name).toBe('get_technique_guide')
      expect(result.functionCalls[0].result.steps).toBeDefined()
      expect(result.functionCalls[0].result.steps.length).toBeGreaterThan(0)
      expect(result.content).toContain('sleeve')
    }, 30000)
  })

  // Test RAG system integration
  describe('RAG System Integration', () => {
    test('Should integrate function calling with RAG responses', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping RAG integration test - no API key')
        return
      }

      // Test measurement calculation
      const measurementQuery = "I'm making a skirt with 30 inch waist, 40 inch hips, 26 inch length. How much fabric do I need?"
      const response = await ragSystem.query(measurementQuery, 'en')

      expect(response.content).toContain('fabric')
      expect(response.processingTime).toBeGreaterThan(0)
      expect(response.tokenUsage.totalTokens).toBeGreaterThan(0)

      // Should include function call indicator or results
      expect(
        response.content.includes('Function Calls:') ||
        response.content.includes('yards') ||
        response.content.includes('pattern')
      ).toBe(true)
    }, 45000)

    test('Should handle technique questions with functions', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping RAG integration test - no API key')
        return
      }

      const techniqueQuery = "I'm having trouble with my bust darts. Can you give me step-by-step instructions?"
      const response = await ragSystem.query(techniqueQuery, 'en')

      expect(response.content).toBeDefined()
      expect(response.content.length).toBeGreaterThan(50)
      expect(response.processingTime).toBeGreaterThan(0)

      // Should contain technique-related content
      expect(
        response.content.toLowerCase().includes('dart') ||
        response.content.toLowerCase().includes('step') ||
        response.content.toLowerCase().includes('bust')
      ).toBe(true)
    }, 45000)
  })

  // Performance and reliability tests
  describe('Performance and Reliability', () => {
    test('Should handle function calling errors gracefully', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping error handling test - no API key')
        return
      }

      const messages = [
        { role: 'system' as const, content: 'You are a fashion design assistant.' },
        { role: 'user' as const, content: 'Calculate measurements for invalid garment type.' }
      ]

      // Should not throw error, but handle gracefully
      const result = await functionSystem.callWithFunctions(messages, ['calculate_measurements'])
      expect(result).toBeDefined()
      expect(result.content).toBeDefined()
    }, 30000)

    test('Should fallback to regular responses when functions not detected', async () => {
      const generalQuery = "What is the history of fashion design?"
      const response = await ragSystem.query(generalQuery, 'en')

      expect(response.content).toBeDefined()
      expect(response.content.length).toBeGreaterThan(20)
      expect(response.processingTime).toBeGreaterThan(0)

      // Should NOT include function call indicators
      expect(response.content.includes('Function Calls:')).toBe(false)
    }, 30000)
  })

  // Multi-language support
  describe('Multi-language Function Calling', () => {
    test('Should detect functions in German queries', async () => {
      const germanQueries = [
        "Wieviel Stoff brauche ich für ein Kleid?",
        "Wie setze ich einen Ärmel richtig ein?",
        "Hilfe mit Adobe Illustrator für technische Zeichnungen"
      ]

      for (const query of germanQueries) {
        const analysis = await functionSystem.analyzeQueryForFunctions(query, '')
        // Should detect functions regardless of language
        expect(analysis.confidence).toBeGreaterThan(0.3) // Lower threshold for cross-language
      }
    })
  })
})

// Integration test for complete workflow
describe('Complete Function Calling Workflow', () => {
  test('End-to-end function calling with RAG', async () => {
    if (!process.env.OPENAI_API_KEY) {
      console.log('Skipping end-to-end test - no API key')
      return
    }

    const complexQuery = "I'm making a blouse for someone with 38 inch bust, 30 inch waist. I also need help with setting the sleeves properly since I'm a beginner. Can you help with both the fabric calculation and technique?"

    const response = await ragSystem.query(complexQuery, 'en')

    expect(response.content).toBeDefined()
    expect(response.content.length).toBeGreaterThan(100)
    expect(response.tokenUsage.totalTokens).toBeGreaterThan(0)

    // Should address both aspects of the query
    const content = response.content.toLowerCase()
    expect(content.includes('fabric') || content.includes('yard')).toBe(true)
    expect(content.includes('sleeve') || content.includes('step')).toBe(true)

  }, 60000)
})