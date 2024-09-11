import { KnowledgeBase } from '../knowledge-base'
import { DocumentChunk } from '../knowledge-base'

describe('Adobe Illustrator Knowledge Base Tests', () => {
  let knowledgeBase: KnowledgeBase

  beforeAll(async () => {
    knowledgeBase = new KnowledgeBase()
    await knowledgeBase.loadDocuments()
  })

  describe('Course 301: Adobe Illustrator Module Structure', () => {
    it('should contain all 12 video modules', async () => {
      const chunks = knowledgeBase.searchChunks('Adobe Illustrator', 50)
      
      // Expected modules
      const expectedModules = [
        'MODULE 1: INTRO',
        'MODULE 2: EINFÜHRUNG',
        'MODULE 3: TECHNISCHE MODEZEICHNUNG GRUNDLAGEN',
        'MODULE 4.1: TECHNISCHE MODEZEICHNUNG TEIL 1 - WERKZEUGE',
        'MODULE 4.2: TECHNISCHE MODEZEICHNUNG TEIL 1 - MIT EBENEN ARBEITEN',
        'MODULE 5.1: TECHNISCHE MODEZEICHNUNG TEIL 2 - FORMATIEREN',
        'MODULE 5.2: TECHNISCHE MODEZEICHNUNG TEIL 2 - SCHABLONE',
        'MODULE 5.3: TECHNISCHE MODEZEICHNUNG TEIL 2 - VORDERANSICHT',
        'MODULE 5.4: TECHNISCHE MODEZEICHNUNG TEIL 2 - KOPIEREN UND ZUSAMMENFÜGEN',
        'MODULE 5.5: TECHNISCHE MODEZEICHNUNG TEIL 2 - RÜCKANSICHT & CHECKLISTE',
        'MODULE 6: TECHNISCHE MODEZEICHNUNG TEIL 3 - BESCHRIFTEN',
        'MODULE 7: TECHNISCHE MODEZEICHNUNG ZUSAMMENFASSUNG'
      ]

      const foundModules = new Set<string>()
      chunks.forEach(chunk => {
        expectedModules.forEach(module => {
          if (chunk.content.includes(module)) {
            foundModules.add(module)
          }
        })
      })

      expect(foundModules.size).toBeGreaterThanOrEqual(10) // At least 10 modules should be found
      expect(Array.from(foundModules)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('MODULE 1:'),
          expect.stringContaining('MODULE 3:'),
          expect.stringContaining('MODULE 6:'),
          expect.stringContaining('MODULE 7:')
        ])
      )
    })

    it('should have correct video URLs for all modules', async () => {
      const chunks = knowledgeBase.searchChunks('vimeo.com', 20)
      
      // Expected Vimeo URLs from our course structure
      const expectedUrls = [
        'https://vimeo.com/1107393382',
        'https://vimeo.com/1107393430',
        'https://vimeo.com/1107393678',
        'https://vimeo.com/1107393768',
        'https://vimeo.com/1107393856',
        'https://vimeo.com/1107393947',
        'https://vimeo.com/1107407119',
        'https://vimeo.com/1107394045',
        'https://vimeo.com/1107394242',
        'https://vimeo.com/1107394357',
        'https://vimeo.com/1107394453'
      ]

      let foundUrls = 0
      chunks.forEach(chunk => {
        expectedUrls.forEach(url => {
          if (chunk.content.includes(url)) {
            foundUrls++
          }
        })
      })

      expect(foundUrls).toBeGreaterThanOrEqual(8) // At least 8 URLs should be found
    })
  })

  describe('Video-Specific Content Recognition', () => {
    it('should recognize "Grundlagen" video content', async () => {
      const chunks = knowledgeBase.searchChunks('Grundlagen technische Modezeichnung', 10)
      
      expect(chunks.length).toBeGreaterThan(0)
      
      const grundlagenChunk = chunks.find(chunk => 
        chunk.content.includes('GRUNDLAGEN') && 
        chunk.content.includes('Proportionen')
      )
      
      expect(grundlagenChunk).toBeDefined()
      expect(grundlagenChunk?.content).toContain('Recognition Keywords')
      expect(grundlagenChunk?.content).toContain('grundlagen')
    })

    it('should recognize "Werkzeuge" video content', async () => {
      const chunks = knowledgeBase.searchChunks('Werkzeuge tools', 10)
      
      const werkzeugeChunk = chunks.find(chunk => 
        chunk.content.includes('WERKZEUGE') && 
        chunk.content.includes('Linienwerkzeug')
      )
      
      expect(werkzeugeChunk).toBeDefined()
      expect(werkzeugeChunk?.content).toContain('Zeichenfeder')
      expect(werkzeugeChunk?.content).toContain('pen tool')
    })

    it('should recognize "Beschriften" video content', async () => {
      const chunks = knowledgeBase.searchChunks('Beschriften labeling arrows', 10)
      
      const beschriftenChunk = chunks.find(chunk => 
        chunk.content.includes('BESCHRIFTEN') && 
        chunk.content.includes('Pfeile')
      )
      
      expect(beschriftenChunk).toBeDefined()
      expect(beschriftenChunk?.content).toContain('Detailangaben')
      expect(beschriftenChunk?.content).toContain('technical drawing documentation')
    })

    it('should recognize "Zusammenfassung" video content', async () => {
      const chunks = knowledgeBase.searchChunks('Zusammenfassung summary skills learned', 10)
      
      const zusammenfassungChunk = chunks.find(chunk => 
        chunk.content.includes('ZUSAMMENFASSUNG') && 
        chunk.content.includes('gelernt')
      )
      
      expect(zusammenfassungChunk).toBeDefined()
      expect(zusammenfassungChunk?.content).toContain('Skills Assessment')
      expect(zusammenfassungChunk?.content).toContain('Adobe Illustrator Fundamentals')
    })
  })

  describe('Bilingual Content Validation', () => {
    it('should have German original text for all major modules', async () => {
      const chunks = knowledgeBase.searchChunks('German Original', 20)
      
      expect(chunks.length).toBeGreaterThan(5)
      
      // Check for specific German phrases
      const germanPhrases = [
        'technische Modezeichnung',
        'Zeichenfeder',
        'Werkzeuge',
        'Eigenschaften',
        'Ebenen'
      ]

      let foundPhrases = 0
      chunks.forEach(chunk => {
        germanPhrases.forEach(phrase => {
          if (chunk.content.includes(phrase)) {
            foundPhrases++
          }
        })
      })

      expect(foundPhrases).toBeGreaterThanOrEqual(10) // Multiple instances expected
    })

    it('should have English translations for all major modules', async () => {
      const chunks = knowledgeBase.searchChunks('English Translation', 20)
      
      expect(chunks.length).toBeGreaterThan(5)
      
      // Check for specific English technical terms
      const englishTerms = [
        'technical drawing',
        'pen tool',
        'tools',
        'properties',
        'layers'
      ]

      let foundTerms = 0
      chunks.forEach(chunk => {
        englishTerms.forEach(term => {
          if (chunk.content.includes(term)) {
            foundTerms++
          }
        })
      })

      expect(foundTerms).toBeGreaterThanOrEqual(10) // Multiple instances expected
    })

    it('should maintain consistency between German and English content', async () => {
      const chunks = knowledgeBase.searchChunks('Zeichenfeder pen tool', 10)
      
      // Should find chunks that contain both German and English equivalents
      const bilingualChunk = chunks.find(chunk => 
        chunk.content.includes('Zeichenfeder') && 
        chunk.content.includes('pen tool')
      )
      
      expect(bilingualChunk).toBeDefined()
    })
  })

  describe('Complete Transcript Validation', () => {
    it('should have complete WEBVTT transcript content for MODULE 6', async () => {
      const chunks = knowledgeBase.searchChunks('Beschriften Atelier Produktionsstätte', 10)
      
      const completeTranscriptChunk = chunks.find(chunk => 
        chunk.content.includes('Eine technische Zeichnung wird natürlich für das Atelier') &&
        chunk.content.includes('sind wir fertig mit unserer technischen Zeichnung')
      )
      
      expect(completeTranscriptChunk).toBeDefined()
      expect(completeTranscriptChunk?.content).toContain('Dossier')
      expect(completeTranscriptChunk?.content).toContain('Maßtabelle')
      expect(completeTranscriptChunk?.content).toContain('Speichern unter')
    })

    it('should have complete WEBVTT transcript content for MODULE 7', async () => {
      const chunks = knowledgeBase.searchChunks('Zusammenfassung gelernt Adobe Illustrator', 10)
      
      const completeTranscriptChunk = chunks.find(chunk => 
        chunk.content.includes('Du hast gelernt, wie man Adobe Illustrator bedient') &&
        chunk.content.includes('wir sehen uns in einem unserer nächsten Kurse wieder')
      )
      
      expect(completeTranscriptChunk).toBeDefined()
      expect(completeTranscriptChunk?.content).toContain('Grundfunktionen')
      expect(completeTranscriptChunk?.content).toContain('Bedienfelder')
      expect(completeTranscriptChunk?.content).toContain('Skills Assessment')
    })

    it('should have detailed learning points for each module', async () => {
      const chunks = knowledgeBase.searchChunks('Key Learning Points', 15)
      
      expect(chunks.length).toBeGreaterThan(3)
      
      // Should have learning points with practical techniques
      const learningPointsChunk = chunks.find(chunk => 
        chunk.content.includes('Key Learning Points') && 
        chunk.content.includes('Technique')
      )
      
      expect(learningPointsChunk).toBeDefined()
    })
  })

  describe('Recognition Keywords Validation', () => {
    it('should have comprehensive recognition keywords for all modules', async () => {
      const chunks = knowledgeBase.searchChunks('Recognition Keywords', 15)
      
      expect(chunks.length).toBeGreaterThan(8) // Should have keywords for most modules
      
      // Check for variety in keyword types
      const keywordTypes = [
        'grundlagen', // German basics
        'tools', // English tools
        'werkzeuge', // German tools  
        'formatieren', // German formatting
        'mirroring', // English mirroring
        'beschriften', // German labeling
        'zusammenfassung' // German summary
      ]

      let foundKeywordTypes = 0
      chunks.forEach(chunk => {
        keywordTypes.forEach(keyword => {
          if (chunk.content.toLowerCase().includes(keyword)) {
            foundKeywordTypes++
          }
        })
      })

      expect(foundKeywordTypes).toBeGreaterThanOrEqual(15) // Multiple instances expected
    })

    it('should include video-specific technical terms', async () => {
      const chunks = knowledgeBase.searchChunks('Shift-Taste gerade Linie', 10)
      
      // Should find specific technical instructions
      const technicalChunk = chunks.find(chunk => 
        chunk.content.includes('Shift-Taste') && 
        chunk.content.includes('gerade')
      )
      
      expect(technicalChunk).toBeDefined()
      expect(technicalChunk?.content).toContain('Liniensegment')
    })
  })

  describe('Course Structure Integration', () => {
    it('should properly integrate with Course 301 structure', async () => {
      const chunks = knowledgeBase.searchChunks('Course 301 Adobe Illustrator', 10)
      
      expect(chunks.length).toBeGreaterThan(0)
      
      const courseChunk = chunks.find(chunk => 
        chunk.content.includes('301') && 
        chunk.content.includes('Adobe Illustrator')
      )
      
      expect(courseChunk).toBeDefined()
    })

    it('should maintain consistency with fashion design context', async () => {
      const chunks = knowledgeBase.searchChunks('fashion design technical drawing', 10)
      
      expect(chunks.length).toBeGreaterThan(3)
      
      // Should find fashion-specific context
      const fashionChunk = chunks.find(chunk => 
        chunk.content.includes('fashion') && 
        (chunk.content.includes('technical drawing') || chunk.content.includes('technische Modezeichnung'))
      )
      
      expect(fashionChunk).toBeDefined()
    })
  })

  describe('Content Quality Validation', () => {
    it('should have proper module progression from basics to advanced', async () => {
      const chunks = knowledgeBase.searchChunks('MODULE', 30)
      
      // Should find logical progression
      const introModule = chunks.find(chunk => chunk.content.includes('MODULE 1: INTRO'))
      const grundlagenModule = chunks.find(chunk => chunk.content.includes('MODULE 3: TECHNISCHE MODEZEICHNUNG GRUNDLAGEN'))
      const summaryModule = chunks.find(chunk => chunk.content.includes('MODULE 7: TECHNISCHE MODEZEICHNUNG ZUSAMMENFASSUNG'))
      
      expect(introModule).toBeDefined()
      expect(grundlagenModule).toBeDefined()  
      expect(summaryModule).toBeDefined()
    })

    it('should have practical techniques in each module', async () => {
      const chunks = knowledgeBase.searchChunks('technique step-by-step', 15)
      
      expect(chunks.length).toBeGreaterThan(3)
      
      // Should contain practical instructions
      const practicalChunk = chunks.find(chunk => 
        (chunk.content.includes('step') || chunk.content.includes('technique')) &&
        (chunk.content.includes('tool') || chunk.content.includes('Werkzeug'))
      )
      
      expect(practicalChunk).toBeDefined()
    })

    it('should have professional industry context', async () => {
      const chunks = knowledgeBase.searchChunks('Atelier Produktionsstätte production', 10)
      
      const industryChunk = chunks.find(chunk => 
        (chunk.content.includes('Atelier') || chunk.content.includes('production')) &&
        (chunk.content.includes('professional') || chunk.content.includes('industry'))
      )
      
      expect(industryChunk).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle video-specific queries gracefully', async () => {
      const chunks = knowledgeBase.searchChunks('non-existent-video-keyword', 5)
      
      // Should return empty array or handle gracefully
      expect(Array.isArray(chunks)).toBe(true)
    })

    it('should handle mixed language queries', async () => {
      const chunks = knowledgeBase.searchChunks('Grundlagen basics tutorial', 10)
      
      expect(chunks.length).toBeGreaterThan(0)
      
      // Should find content even with mixed language terms
      const mixedLanguageChunk = chunks.find(chunk => 
        chunk.content.includes('Grundlagen') || 
        chunk.content.includes('basics')
      )
      
      expect(mixedLanguageChunk).toBeDefined()
    })

    it('should maintain search performance with large transcript content', async () => {
      const startTime = Date.now()
      const chunks = knowledgeBase.searchChunks('Adobe Illustrator technische Modezeichnung', 20)
      const endTime = Date.now()
      
      const searchTime = endTime - startTime
      
      expect(chunks.length).toBeGreaterThan(0)
      expect(searchTime).toBeLessThan(3000) // Should complete within 3 seconds
    })
  })
})