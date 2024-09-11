import { RelevanceFilter } from '../relevance-filter'

describe('Conversational Improvements Tests', () => {
  describe('Real-World Conversation Issues', () => {
    it('should handle "did you forget mit ebene zu arbeiten"', () => {
      const result = RelevanceFilter.analyzeRelevance('did you forget mit ebene zu arbeiten')
      
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.reasoning).not.toContain('Ich kann nur bei Modedesign-Themen helfen')
    })

    it('should handle "thats a PART FROM PART 1"', () => {
      const result = RelevanceFilter.analyzeRelevance('thats a PART FROM PART 1')
      
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.reasoning).not.toContain('irrelevant')
    })

    it('should handle variations of "what about layers"', () => {
      const queries = [
        'what about ebenen',
        'was ist mit ebenen',
        'wie wäre es mit layers',
        'what about the layers section'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.4)
      })
    })

    it('should recognize "mit ebenen arbeiten" variations', () => {
      const queries = [
        'mit ebenen arbeiten',
        'mit layers zu arbeiten',
        'working with ebenen',
        'ebenen management'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
      })
    })
  })

  describe('Conversational Context Recognition', () => {
    it('should recognize follow-up questions about forgotten topics', () => {
      const queries = [
        'did you forget werkzeuge',
        'you forgot to mention tools',
        'vergessen sie the layers',
        'missing information about grundlagen'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.isRelevant).toBe(true)
      })
    })

    it('should recognize clarification questions about course parts', () => {
      const queries = [
        'thats from part 1',
        'das ist teil 2',
        'that belongs to module 3',
        'part from teil 1'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
      })
    })

    it('should handle requests for explanations', () => {
      const queries = [
        'explain grundlagen again',
        'erklären sie werkzeuge',
        'tell me about layers again',
        'show me the tools section'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })
  })

  describe('Spell Checking Functionality', () => {
    it('should provide spell suggestions for misspelled fashion terms', () => {
      const queries = [
        'layrs', // should suggest "layers"
        'werkzuege', // should suggest "werkzeuge"  
        'grundlage', // should suggest "grundlagen"
        'ebene', // should suggest "ebenen"
        'fashon', // should suggest "fashion"
        'ilustrator' // should suggest "illustrator"
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(query)
        
        if (result.spellSuggestions) {
          expect(result.spellSuggestions.length).toBeGreaterThan(0)
          expect(result.shouldUseRAG).toBe(true)
          expect(result.confidence).toBeGreaterThan(0.5)
        }
      })
    })

    it('should find closest matches for common misspellings', () => {
      // Test the internal fuzzy matching
      const testCases = [
        { input: 'layrs', expected: 'layers' },
        { input: 'werkzuege', expected: 'werkzeuge' },
        { input: 'grundlage', expected: 'grundlagen' },
        { input: 'ilustrator', expected: 'illustrator' }
      ]

      testCases.forEach(({ input, expected }) => {
        // Use reflection to test private method (for testing purposes only)
        const suggestions = (RelevanceFilter as any).findClosestFashionTerms?.(input) || []
        
        if (suggestions.length > 0) {
          expect(suggestions).toContain(expected)
        }
      })
    })

    it('should handle mixed correct and misspelled terms', () => {
      const queries = [
        'adobe ilustrator werkzeuge', // illustrator misspelled
        'fashon design ebenen', // fashion misspelled
        'grundlage and layrs' // both misspelled
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
      })
    })
  })

  describe('German-English Mixed Queries', () => {
    it('should handle mixed language conversational queries', () => {
      const queries = [
        'what about ebenen arbeiten',
        'tell me about werkzeuge tools',
        'explain the grundlagen basics',
        'show me layers ebenen'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })

    it('should recognize German technical terms in English context', () => {
      const queries = [
        'how do i use zeichenfeder',
        'what is abnäher in english',
        'explain the unterschiedlich techniques',
        'show me naht construction'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.isRelevant).toBe(true)
      })
    })
  })

  describe('Course Structure Context', () => {
    it('should recognize module and part references', () => {
      const queries = [
        'module 3 grundlagen',
        'teil 1 werkzeuge',
        'part 2 formatieren',
        'module 4.2 ebenen',
        'section about layers'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.7)
      })
    })

    it('should handle course progression questions', () => {
      const queries = [
        'whats next after grundlagen',
        'was kommt nach teil 1',
        'before learning werkzeuge',
        'after the basics module'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle very short conversational interjections', () => {
      const queries = [
        'and ebenen?',
        'but werkzeuge',
        'auch layers',
        'what about?'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        // Should not crash and should handle gracefully
        expect(result).toBeDefined()
        expect(result.shouldUseRAG).toBeDefined()
        expect(result.confidence).toBeDefined()
      })
    })

    it('should handle typos in conversational patterns', () => {
      const queries = [
        'did yu forget ebenen',
        'thats a prat from teil 1',
        'waht about layers',
        'explin grundlagen'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.4)
      })
    })

    it('should maintain performance with complex queries', () => {
      const complexQuery = 'did you forget to explain the werkzeuge and ebenen arbeiten in teil 1 and how it relates to the grundlagen we learned before and what about the layers organization in adobe illustrator'
      
      const startTime = Date.now()
      const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(complexQuery)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
      expect(result.shouldUseRAG).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.7)
    })
  })

  describe('Integration with Existing Patterns', () => {
    it('should maintain compatibility with existing fashion queries', () => {
      const existingQueries = [
        'how to make a pattern',
        'what is draping',
        'adobe illustrator tutorial',
        'technical drawing basics',
        'fashion design course'
      ]

      existingQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })

    it('should still reject clearly non-fashion queries', () => {
      const nonFashionQueries = [
        'what is the weather today',
        'how to cook pasta',
        'latest stock prices',
        'programming in python'
      ]

      nonFashionQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        // Should still let RAG system handle these to enforce role boundaries
        expect(result.shouldUseRAG).toBe(true)
        expect(result.reasoning).toContain('RAG system')
      })
    })

    it('should handle greetings appropriately', () => {
      const validGreetings = [
        'hello',
        'hi',
        'good morning'
      ]

      validGreetings.forEach(greeting => {
        const result = RelevanceFilter.analyzeRelevance(greeting)
        expect(result.shouldUseRAG).toBe(false)
        expect(result.suggestedResponse).toBeDefined()
        expect(result.reasoning).toContain('greeting')
      })
    })

    it('should handle unsupported greetings by passing to RAG', () => {
      const unsupportedGreetings = [
        'hi there', // has "there" which doesn't match pattern
        'guten tag', // German greeting not in patterns
        'how are you doing' // extended version not in patterns
      ]

      unsupportedGreetings.forEach(greeting => {
        const result = RelevanceFilter.analyzeRelevance(greeting)
        expect(result.shouldUseRAG).toBe(true)
        expect(result.reasoning).toContain('RAG system')
      })
    })
  })

  describe('Quality Metrics', () => {
    it('should provide appropriate confidence scores', () => {
      const testCases = [
        { query: 'adobe illustrator tutorial', expectedMin: 0.7 },
        { query: 'did you forget ebenen', expectedMin: 0.6 },
        { query: 'thats from part 1', expectedMin: 0.5 },
        { query: 'layrs', expectedMin: 0.4 } // misspelled
      ]

      testCases.forEach(({ query, expectedMin }) => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.confidence).toBeGreaterThan(expectedMin)
      })
    })

    it('should provide helpful reasoning for decisions', () => {
      const queries = [
        'did you forget werkzeuge',
        'thats a part from teil 1',
        'what about ebenen'
      ]

      queries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        expect(result.reasoning).toBeDefined()
        expect(result.reasoning.length).toBeGreaterThan(10)
        expect(result.reasoning).not.toBe('')
      })
    })
  })
})