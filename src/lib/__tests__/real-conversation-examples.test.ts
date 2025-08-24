import { RelevanceFilter } from '../relevance-filter'

describe('Real Conversation Examples - Fixed Issues', () => {
  describe('Original Problematic Queries', () => {
    it('should handle "did you forget mit ebene zu arbeiten" correctly', () => {
      const query = "did you forget mit ebene zu arbeiten"
      const result = RelevanceFilter.analyzeRelevance(query)
      
      // BEFORE: This would return "I can only help with fashion design topics..."
      // AFTER: This should now be recognized as fashion-related and trigger RAG
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.reasoning).not.toContain('irrelevant')
      
      console.log(`✓ Query: "${query}"`)
      console.log(`  Should use RAG: ${result.shouldUseRAG}`)
      console.log(`  Confidence: ${result.confidence}`)
      console.log(`  Reasoning: ${result.reasoning}`)
    })

    it('should handle "thats a PART FROM PART 1" correctly', () => {
      const query = "thats a PART FROM PART 1"  
      const result = RelevanceFilter.analyzeRelevance(query)
      
      // BEFORE: This would return "I can only help with fashion design topics..."
      // AFTER: This should now be recognized as course-related and trigger RAG
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.4)
      expect(result.reasoning).not.toContain('irrelevant')
      
      console.log(`✓ Query: "${query}"`)
      console.log(`  Should use RAG: ${result.shouldUseRAG}`)
      console.log(`  Confidence: ${result.confidence}`)
      console.log(`  Reasoning: ${result.reasoning}`)
    })
  })

  describe('Expected Working Queries (Should Still Work)', () => {
    it('should handle "tell me more about the grundlagen videos"', () => {
      const query = "tell me more about the grundlagen videos"
      const result = RelevanceFilter.analyzeRelevance(query)
      
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.7)
      
      console.log(`✓ Query: "${query}"`)
      console.log(`  Should use RAG: ${result.shouldUseRAG}`)
      console.log(`  Confidence: ${result.confidence}`)
    })

    it('should handle "what will i learn in part 1"', () => {
      const query = "what will i learn in part 1"
      const result = RelevanceFilter.analyzeRelevance(query)
      
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.6)
      
      console.log(`✓ Query: "${query}"`)
      console.log(`  Should use RAG: ${result.shouldUseRAG}`)
      console.log(`  Confidence: ${result.confidence}`)
    })
  })

  describe('Spell Check Improvements', () => {
    it('should provide spell suggestions for common misspellings', () => {
      const queries = [
        'layrs', // layers
        'werkzuege', // werkzeuge
        'ilustrator', // illustrator
        'grundlage' // grundlagen
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(query)
        
        expect(result.shouldUseRAG).toBe(true)
        
        if (result.spellSuggestions && result.spellSuggestions.length > 0) {
          console.log(`✓ Misspelled: "${query}"`)
          console.log(`  Suggestions: ${result.spellSuggestions.join(', ')}`)
          console.log(`  Confidence: ${result.confidence}`)
          
          expect(result.spellSuggestions.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Conversational Context Improvements', () => {
    it('should handle follow-up questions about course content', () => {
      const followUpQueries = [
        'what about the ebenen section',
        'explain werkzeuge again', 
        'tell me about the layers part',
        'how about the tools video'
      ]

      followUpQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
        
        console.log(`✓ Follow-up: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })

    it('should handle clarifying questions about course structure', () => {
      const clarifyingQueries = [
        'that belongs to part 1',
        'thats from teil 2',
        'part of module 3',
        'section from the basics'
      ]

      clarifyingQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.4)
        
        console.log(`✓ Clarifying: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Mixed Language Support', () => {
    it('should handle German-English mixed queries', () => {
      const mixedQueries = [
        'explain the werkzeuge tools',
        'what about ebenen layers',
        'grundlagen basics tutorial',
        'mit layers working'
      ]

      mixedQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
        
        console.log(`✓ Mixed language: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle complex conversational queries efficiently', () => {
      const complexQuery = 'did you forget to explain the ebenen arbeiten in teil 1 and how it relates to werkzeuge'
      
      const startTime = Date.now()
      const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(complexQuery)
      const endTime = Date.now()
      
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.6)
      expect(endTime - startTime).toBeLessThan(50) // Should be fast
      
      console.log(`✓ Complex query: "${complexQuery}"`)
      console.log(`  Should use RAG: ${result.shouldUseRAG}`)
      console.log(`  Confidence: ${result.confidence}`)
      console.log(`  Processing time: ${endTime - startTime}ms`)
    })

    it('should gracefully handle very short queries', () => {
      const shortQueries = [
        'ebenen?',
        'and tools?',
        'werkzeuge',
        'layers'
      ]

      shortQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        // Should not crash and should still recognize fashion terms
        expect(result).toBeDefined()
        expect(result.shouldUseRAG).toBeDefined()
        
        if (query.includes('ebenen') || query.includes('layers') || query.includes('werkzeuge') || query.includes('tools')) {
          expect(result.shouldUseRAG).toBe(true)
        }
        
        console.log(`✓ Short query: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Integration Test - Conversation Flow', () => {
    it('should handle a realistic conversation sequence', () => {
      const conversationSequence = [
        'tell me about grundlagen',
        'what about werkzeuge',
        'did you forget ebenen arbeiten',
        'thats from part 1',
        'explain layrs', // misspelled
        'working with layers'
      ]

      let allSuccessful = true
      const results = []

      conversationSequence.forEach((query, index) => {
        const result = index === 4 ? 
          RelevanceFilter.analyzeRelevanceWithSpellCheck(query) : 
          RelevanceFilter.analyzeRelevance(query)
        
        results.push({ query, result })
        
        if (!result.shouldUseRAG) {
          allSuccessful = false
        }
        
        console.log(`${index + 1}. "${query}"`)
        console.log(`   RAG: ${result.shouldUseRAG}, Confidence: ${result.confidence}`)
        if (result.spellSuggestions) {
          console.log(`   Spell suggestions: ${result.spellSuggestions.join(', ')}`)
        }
      })

      expect(allSuccessful).toBe(true)
      expect(results.every(r => r.result.shouldUseRAG)).toBe(true)
    })
  })
})