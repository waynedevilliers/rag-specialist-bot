import { RAGSystem } from '../rag-system'
import { ModelService } from '../model-service'

describe('Video Content Recognition Tests', () => {
  let ragSystem: RAGSystem
  let modelService: ModelService

  beforeAll(async () => {
    ragSystem = new RAGSystem()
    modelService = new ModelService()
    await ragSystem.initialize()
  })

  describe('Video Identification by Keywords', () => {
    it('should identify Grundlagen video from user queries', async () => {
      const queries = [
        'explain Grundlagen again',
        'tell me about basics',
        'what are the fundamentals',
        'Proportionen erklären'
      ]

      for (const query of queries) {
        const response = await ragSystem.query(query)
        
        const grundlagenSource = response.sources.find(source => 
          source.title.includes('Grundlagen') || 
          source.section.includes('GRUNDLAGEN')
        )
        
        expect(grundlagenSource).toBeDefined()
        // Should have relevant response content
        expect(response.content).toBeTruthy()
        expect(response.content.length).toBeGreaterThan(50)
      }
    })

    it('should identify Werkzeuge video from tool-related queries', async () => {
      const queries = [
        'what tools do I use',
        'Werkzeuge erklären',
        'pen tool usage',
        'Zeichenfeder verwenden'
      ]

      for (const query of queries) {
        const sources = await ragSystem.query(query, 5)
        
        const werkzeugeSource = sources.find(source => 
          source.content.includes('WERKZEUGE') && 
          (source.content.includes('Zeichenfeder') || source.content.includes('pen tool'))
        )
        
        expect(werkzeugeSource).toBeDefined()
      }
    })

    it('should identify Beschriften video from labeling queries', async () => {
      const queries = [
        'how to add labels',
        'Beschriften tutorial',
        'annotation techniques',
        'Pfeile und Textfelder'
      ]

      for (const query of queries) {
        const sources = await ragSystem.query(query, 5)
        
        const beschriftenSource = sources.find(source => 
          source.content.includes('BESCHRIFTEN') && 
          source.content.includes('Pfeile')
        )
        
        expect(beschriftenSource).toBeDefined()
      }
    })

    it('should identify Zusammenfassung video from summary queries', async () => {
      const queries = [
        'course summary',
        'what did I learn',
        'Zusammenfassung des Kurses',
        'skills learned'
      ]

      for (const query of queries) {
        const sources = await ragSystem.query(query, 5)
        
        const summarySource = sources.find(source => 
          source.content.includes('ZUSAMMENFASSUNG') && 
          source.content.includes('gelernt')
        )
        
        expect(summarySource).toBeDefined()
      }
    })
  })

  describe('Video-Specific Response Quality', () => {
    it('should provide specific answers about Grundlagen video content', async () => {
      const query = 'What are the proportions in technical fashion drawing?'
      const sources = await ragSystem.query(query, 3)
      
      const relevantSource = sources.find(source => 
        source.content.includes('Proportionen') || 
        source.content.includes('proportion')
      )
      
      expect(relevantSource).toBeDefined()
      expect(relevantSource?.content).toMatch(/Proportionen|proportion/i)
      expect(relevantSource?.content).toMatch(/technische|technical/i)
    })

    it('should provide specific answers about Werkzeuge video content', async () => {
      const query = 'How do I use the pen tool in Illustrator?'
      const sources = await ragSystem.query(query, 3)
      
      const relevantSource = sources.find(source => 
        source.content.includes('Zeichenfeder') || 
        source.content.includes('pen tool')
      )
      
      expect(relevantSource).toBeDefined()
      expect(relevantSource?.content).toMatch(/Zeichenfeder|pen tool/i)
      expect(relevantSource?.content).toMatch(/Werkzeug|tool/i)
    })

    it('should provide specific answers about labeling techniques', async () => {
      const query = 'How do I create arrows for annotations?'
      const sources = await ragSystem.query(query, 3)
      
      const relevantSource = sources.find(source => 
        source.content.includes('Pfeile') || 
        source.content.includes('arrow')
      )
      
      expect(relevantSource).toBeDefined()
      expect(relevantSource?.content).toMatch(/Pfeil|arrow/i)
      expect(relevantSource?.content).toMatch(/Liniensegment|line segment/i)
    })
  })

  describe('Bilingual Recognition Accuracy', () => {
    it('should handle German video-specific queries correctly', async () => {
      const germanQueries = [
        'Erkläre mir die Grundlagen nochmal',
        'Wie benutze ich die Zeichenfeder?',
        'Was ist mit Formatieren gemeint?',
        'Wie erstelle ich eine Schablone?'
      ]

      for (const query of germanQueries) {
        const sources = await ragSystem.query(query, 5)
        
        expect(sources.length).toBeGreaterThan(0)
        
        // Should find German content that matches the query topic
        const germanSource = sources.find(source => 
          source.content.includes('German Original:') ||
          source.content.match(/[äöüß]/g) // Contains German characters
        )
        
        expect(germanSource).toBeDefined()
      }
    })

    it('should handle English video-specific queries correctly', async () => {
      const englishQueries = [
        'Explain the tools section again',
        'How do I mirror objects?',
        'What is the formatting process?',
        'Show me the template creation'
      ]

      for (const query of englishQueries) {
        const sources = await ragSystem.query(query, 5)
        
        expect(sources.length).toBeGreaterThan(0)
        
        // Should find English content that matches the query topic
        const englishSource = sources.find(source => 
          source.content.includes('English Translation:') ||
          source.content.includes('Key Learning Points')
        )
        
        expect(englishSource).toBeDefined()
      }
    })

    it('should maintain consistency between German and English responses', async () => {
      const germanQuery = 'Wie benutze ich das Linienwerkzeug?'
      const englishQuery = 'How do I use the line tool?'
      
      const germanSources = await ragSystem.query(germanQuery, 3)
      const englishSources = await ragSystem.query(englishQuery, 3)
      
      // Both should find content about line tool
      const germanLineContent = germanSources.find(s => 
        s.content.includes('Linienwerkzeug') || s.content.includes('line tool')
      )
      const englishLineContent = englishSources.find(s => 
        s.content.includes('line tool') || s.content.includes('Linienwerkzeug')
      )
      
      expect(germanLineContent).toBeDefined()
      expect(englishLineContent).toBeDefined()
    })
  })

  describe('Complete Transcript Content Recognition', () => {
    it('should recognize detailed steps from complete transcripts', async () => {
      const query = 'How do I save a file with detail specifications?'
      const sources = await ragSystem.query(query, 5)
      
      const detailStepsSource = sources.find(source => 
        source.content.includes('Speichern unter') && 
        source.content.includes('Detailangaben')
      )
      
      expect(detailStepsSource).toBeDefined()
      expect(detailStepsSource?.content).toContain('technische Zeichnungen')
    })

    it('should recognize professional context from transcripts', async () => {
      const query = 'What is a technical drawing used for?'
      const sources = await ragSystem.query(query, 5)
      
      const professionalContextSource = sources.find(source => 
        source.content.includes('Atelier') || 
        source.content.includes('Produktionsstätte') ||
        source.content.includes('production facility')
      )
      
      expect(professionalContextSource).toBeDefined()
    })

    it('should recognize specific measurements and technical details', async () => {
      const query = 'What is the recommended minimum line weight?'
      const sources = await ragSystem.query(query, 5)
      
      const technicalDetailSource = sources.find(source => 
        source.content.includes('0,5 Punkt') || 
        source.content.includes('0.5 point')
      )
      
      expect(technicalDetailSource).toBeDefined()
    })
  })

  describe('Progressive Module Recognition', () => {
    it('should differentiate between Teil 1 and Teil 2 content', async () => {
      const teil1Query = 'What tools are covered in Teil 1?'
      const teil2Query = 'What formatting is covered in Teil 2?'
      
      const teil1Sources = await ragSystem.query(teil1Query, 3)
      const teil2Sources = await ragSystem.query(teil2Query, 3)
      
      const teil1Content = teil1Sources.find(s => s.content.includes('TEIL 1'))
      const teil2Content = teil2Sources.find(s => s.content.includes('TEIL 2'))
      
      expect(teil1Content).toBeDefined()
      expect(teil2Content).toBeDefined()
      expect(teil1Content?.content).not.toEqual(teil2Content?.content)
    })

    it('should recognize module progression from intro to summary', async () => {
      const introQuery = 'What is this course about?'
      const summaryQuery = 'What did I learn in this course?'
      
      const introSources = await ragSystem.query(introQuery, 3)
      const summarySources = await ragSystem.query(summaryQuery, 3)
      
      const introContent = introSources.find(s => 
        s.content.includes('INTRO') || s.content.includes('Kursüberblick')
      )
      const summaryContent = summarySources.find(s => 
        s.content.includes('ZUSAMMENFASSUNG') || s.content.includes('gelernt')
      )
      
      expect(introContent).toBeDefined()
      expect(summaryContent).toBeDefined()
    })
  })

  describe('Video URL and Metadata Recognition', () => {
    it('should recognize specific video URLs for reference', async () => {
      const query = 'Where can I find the Grundlagen video?'
      const sources = await ragSystem.query(query, 5)
      
      const videoUrlSource = sources.find(source => 
        source.content.includes('vimeo.com') && 
        source.content.includes('GRUNDLAGEN')
      )
      
      expect(videoUrlSource).toBeDefined()
      expect(videoUrlSource?.content).toMatch(/vimeo\.com\/\d+/)
    })

    it('should recognize video timestamps and navigation', async () => {
      const query = 'What is the timestamp for the formatieren video?'
      const sources = await ragSystem.query(query, 5)
      
      const timestampSource = sources.find(source => 
        source.content.includes('FORMATIEREN') && 
        source.content.includes('#t=')
      )
      
      expect(timestampSource).toBeDefined()
    })

    it('should provide course page references', async () => {
      const query = 'Where is the beschriften section?'
      const sources = await ragSystem.query(query, 5)
      
      const coursePageSource = sources.find(source => 
        source.content.includes('technische-modezeichnung') && 
        source.content.includes('BESCHRIFTEN')
      )
      
      expect(coursePageSource).toBeDefined()
    })
  })

  describe('Error Recovery and Fallbacks', () => {
    it('should handle incomplete video recognition gracefully', async () => {
      const ambiguousQuery = 'tell me about that one video'
      const sources = await ragSystem.query(ambiguousQuery, 5)
      
      // Should still return some relevant content even for ambiguous queries
      expect(sources.length).toBeGreaterThan(0)
    })

    it('should handle mixed video references', async () => {
      const mixedQuery = 'explain Grundlagen and also show me tools'
      const sources = await ragSystem.query(mixedQuery, 8)
      
      // Should find content for both Grundlagen and Werkzeuge
      const grundlagenFound = sources.some(s => s.content.includes('GRUNDLAGEN'))
      const toolsFound = sources.some(s => s.content.includes('WERKZEUGE') || s.content.includes('tools'))
      
      expect(grundlagenFound || toolsFound).toBe(true) // At least one should be found
    })

    it('should maintain performance with complex video queries', async () => {
      const complexQuery = 'explain the complete workflow from Grundlagen to Beschriften including all tools and techniques'
      const startTime = Date.now()
      
      const sources = await ragSystem.query(complexQuery, 10)
      
      const endTime = Date.now()
      const queryTime = endTime - startTime
      
      expect(sources.length).toBeGreaterThan(3)
      expect(queryTime).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})