import { RelevanceFilter } from '../relevance-filter-simple'

describe('Course Information Queries', () => {
  describe('Course Offering Questions', () => {
    it('should handle German course offering questions', () => {
      const germanQueries = [
        'welche kurse bieten Sie an',
        'welche kurse biten Sie an', // with typo
        'was für kurse haben Sie',
        'welche modedesign kurse gibt es',
        'zeigen Sie mir die verfügbaren kurse'
      ]

      germanQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
        expect(result.reasoning).toContain('RAG system')
        
        console.log(`✓ German: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })

    it('should handle English course offering questions', () => {
      const englishQueries = [
        'what courses do you offer',
        'which courses are available',
        'show me the available courses',
        'what fashion design courses do you have',
        'list your courses'
      ]

      englishQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
        expect(result.reasoning).toContain('RAG system')
        
        console.log(`✓ English: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Specific Course Information Questions', () => {
    it('should handle questions about specific courses', () => {
      const specificQueries = [
        'was lerne ich in kurs 101',
        'what will I learn in course 201',
        'tell me about the illustrator course',
        'erkläre mir kurs 301',
        'what is course 101 about'
      ]

      specificQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.7)
        
        console.log(`✓ Specific: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Course Content Questions', () => {
    it('should handle course content and module questions', () => {
      const contentQueries = [
        'welche module gibt es in dem kurs',
        'what modules are in the course',
        'course structure',
        'kurs aufbau',
        'what topics are covered'
      ]

      contentQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
        
        console.log(`✓ Content: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })

    it('should handle specific Adobe Illustrator course structure questions', () => {
      const illustratorQueries = [
        'what is the course structure of Adobe Illustrator für Modedesign (Kurs 301)',
        'was ist der aufbau von kurs 301',
        'welche module hat der illustrator kurs',
        'show me the modules in the adobe illustrator course',
        'mit ebenen arbeiten module',
        'grundlagen werkzeuge module'
      ]

      illustratorQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.7)
        
        console.log(`✓ Illustrator Structure: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Meta Questions About Education', () => {
    it('should handle educational meta questions', () => {
      const metaQueries = [
        'how long does the course take',
        'wie lange dauert der kurs',
        'what level is this course',
        'is this for beginners',
        'für wen ist dieser kurs'
      ]

      metaQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.5)
        
        console.log(`✓ Meta: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })

  describe('Spell Check for Course Queries', () => {
    it('should handle misspelled course queries with suggestions', () => {
      const misspelledQueries = [
        'welche kurse biten Sie an', // bieten misspelled
        'wat courses do you offer', // what misspelled
        'cours information', // course misspelled
        'kurs angebot' // should work even with uncommon terms
      ]

      misspelledQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevanceWithSpellCheck(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.4)
        
        console.log(`✓ Misspelled: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
        if (result.spellSuggestions && result.spellSuggestions.length > 0) {
          console.log(`  Suggestions: ${result.spellSuggestions.join(', ')}`)
        }
      })
    })
  })

  describe('Integration with Conversational Patterns', () => {
    it('should handle course questions in conversational context', () => {
      const conversationalQueries = [
        'tell me about your courses',
        'erzähl mir über die kurse',
        'what can I learn here',
        'was kann ich hier lernen',
        'show me what you offer'
      ]

      conversationalQueries.forEach(query => {
        const result = RelevanceFilter.analyzeRelevance(query)
        
        expect(result.shouldUseRAG).toBe(true)
        expect(result.confidence).toBeGreaterThan(0.6)
        
        console.log(`✓ Conversational: "${query}"`)
        console.log(`  Should use RAG: ${result.shouldUseRAG}`)
        console.log(`  Confidence: ${result.confidence}`)
      })
    })
  })
})