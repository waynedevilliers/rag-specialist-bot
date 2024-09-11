import fs from 'fs'
import path from 'path'

describe('Transcript Completeness Validation', () => {
  const knowledgeBasePath = path.join(__dirname, '../../data/illustrator-fashion-design.md')
  let knowledgeBaseContent: string

  beforeAll(() => {
    knowledgeBaseContent = fs.readFileSync(knowledgeBasePath, 'utf-8')
  })

  describe('Complete Video Transcript Presence', () => {
    it('should have complete German transcripts for all updated modules', () => {
      const updatedModules = [
        'MODULE 5.5: TECHNISCHE MODEZEICHNUNG TEIL 2 - RÜCKANSICHT & CHECKLISTE',
        'MODULE 6: TECHNISCHE MODEZEICHNUNG TEIL 3 - BESCHRIFTEN', 
        'MODULE 7: TECHNISCHE MODEZEICHNUNG ZUSAMMENFASSUNG'
      ]

      updatedModules.forEach(moduleTitle => {
        expect(knowledgeBaseContent).toContain(moduleTitle)
        
        // Each module should have German Original section
        const moduleIndex = knowledgeBaseContent.indexOf(moduleTitle)
        const nextModuleIndex = knowledgeBaseContent.indexOf('## MODULE', moduleIndex + 1)
        const moduleSection = nextModuleIndex > -1 ? 
          knowledgeBaseContent.slice(moduleIndex, nextModuleIndex) :
          knowledgeBaseContent.slice(moduleIndex)
        
        expect(moduleSection).toContain('**German Original:**')
        expect(moduleSection).toContain('**English Translation:**')
      })
    })

    it('should have substantial German content for MODULE 5.5', () => {
      const module5_5_start = knowledgeBaseContent.indexOf('MODULE 5.5: TECHNISCHE MODEZEICHNUNG TEIL 2 - RÜCKANSICHT & CHECKLISTE')
      const module6_start = knowledgeBaseContent.indexOf('MODULE 6: TECHNISCHE MODEZEICHNUNG TEIL 3 - BESCHRIFTEN')
      
      expect(module5_5_start).toBeGreaterThan(-1)
      expect(module6_start).toBeGreaterThan(-1)
      
      const module5_5_content = knowledgeBaseContent.slice(module5_5_start, module6_start)
      
      // Should contain key German phrases from the transcript
      expect(module5_5_content).toContain('Rückansicht')
      expect(module5_5_content).toContain('spiegeln')
      expect(module5_5_content).toContain('neue Zeichenfläche')
      expect(module5_5_content).toContain('Checkliste')
      
      // Should contain substantial content (at least 1000 characters for German section)
      const germanSection = module5_5_content.match(/\*\*German Original:\*\*(.*?)\*\*English Translation:\*\*/s)?.[1] || ''
      expect(germanSection.length).toBeGreaterThan(1000)
    })

    it('should have substantial German content for MODULE 6', () => {
      const module6_start = knowledgeBaseContent.indexOf('MODULE 6: TECHNISCHE MODEZEICHNUNG TEIL 3 - BESCHRIFTEN')
      const module7_start = knowledgeBaseContent.indexOf('MODULE 7: TECHNISCHE MODEZEICHNUNG ZUSAMMENFASSUNG')
      
      expect(module6_start).toBeGreaterThan(-1)
      expect(module7_start).toBeGreaterThan(-1)
      
      const module6_content = knowledgeBaseContent.slice(module6_start, module7_start)
      
      // Should contain key German phrases from the transcript
      expect(module6_content).toContain('Eine technische Zeichnung wird natürlich für das Atelier')
      expect(module6_content).toContain('Produktionsstätte')
      expect(module6_content).toContain('Dossier')
      expect(module6_content).toContain('Speichern unter')
      expect(module6_content).toContain('Detailangaben')
      expect(module6_content).toContain('Pfeile verwenden')
      
      // Should contain substantial content
      const germanSection = module6_content.match(/\*\*German Original:\*\*(.*?)\*\*English Translation:\*\*/s)?.[1] || ''
      expect(germanSection.length).toBeGreaterThan(2000) // MODULE 6 has longest transcript
    })

    it('should have substantial German content for MODULE 7', () => {
      const module7_start = knowledgeBaseContent.indexOf('MODULE 7: TECHNISCHE MODEZEICHNUNG ZUSAMMENFASSUNG')
      const endOfFile = knowledgeBaseContent.length
      
      expect(module7_start).toBeGreaterThan(-1)
      
      const module7_content = knowledgeBaseContent.slice(module7_start, endOfFile)
      
      // Should contain key German phrases from the transcript
      expect(module7_content).toContain('Du hast gelernt, wie man Adobe Illustrator bedient')
      expect(module7_content).toContain('Grundfunktionen des Programmes')
      expect(module7_content).toContain('Bedienfelder')
      expect(module7_content).toContain('Werkzeuge kennengelernt')
      expect(module7_content).toContain('wir sehen uns in einem unserer nächsten Kurse wieder')
      
      // Should contain substantial content
      const germanSection = module7_content.match(/\*\*German Original:\*\*(.*?)\*\*English Translation:\*\*/s)?.[1] || ''
      expect(germanSection.length).toBeGreaterThan(500)
    })
  })

  describe('English Translation Completeness', () => {
    it('should have complete English translations for all updated modules', () => {
      const updatedModules = [
        'MODULE 5.5', 'MODULE 6', 'MODULE 7'
      ]

      updatedModules.forEach(modulePrefix => {
        const moduleStart = knowledgeBaseContent.indexOf(modulePrefix)
        expect(moduleStart).toBeGreaterThan(-1)
        
        // Find the next module or end of file
        const nextModuleStart = knowledgeBaseContent.indexOf('## MODULE', moduleStart + modulePrefix.length)
        const moduleSection = nextModuleStart > -1 ? 
          knowledgeBaseContent.slice(moduleStart, nextModuleStart) :
          knowledgeBaseContent.slice(moduleStart)
        
        // Should have English translation section
        expect(moduleSection).toContain('**English Translation:**')
        
        // English section should be substantial
        const englishMatch = moduleSection.match(/\*\*English Translation:\*\*(.*?)(\*\*[^*]+\*\*|$)/s)
        const englishContent = englishMatch?.[1]?.trim() || ''
        expect(englishContent.length).toBeGreaterThan(300) // Minimum English content
      })
    })

    it('should have accurate English translations for key technical terms', () => {
      const translations = [
        { german: 'Zeichenfeder', english: 'pen tool' },
        { german: 'Linienwerkzeug', english: 'line tool' },
        { german: 'Eigenschaften', english: 'Properties' },
        { german: 'Ebenen', english: 'Layers' },
        { german: 'spiegeln', english: 'mirror' },
        { german: 'Werkzeuge', english: 'tools' },
        { german: 'technische Zeichnung', english: 'technical drawing' },
        { german: 'Beschriften', english: 'labeling' },
        { german: 'Pfeile', english: 'arrows' }
      ]

      translations.forEach(({ german, english }) => {
        if (knowledgeBaseContent.includes(german)) {
          // If German term exists, English equivalent should also exist
          expect(knowledgeBaseContent.toLowerCase()).toContain(english.toLowerCase())
        }
      })
    })

    it('should maintain context consistency between German and English', () => {
      // Test specific contextual translations
      if (knowledgeBaseContent.includes('Atelier oder die Produktionsstätte')) {
        expect(knowledgeBaseContent).toContain('atelier or production facility')
      }
      
      if (knowledgeBaseContent.includes('Dossier mit verschiedenen Papieren')) {
        expect(knowledgeBaseContent).toContain('dossier with various papers')
      }
      
      if (knowledgeBaseContent.includes('Maßtabelle')) {
        expect(knowledgeBaseContent).toContain('size table')
      }
    })
  })

  describe('Learning Points and Structure Validation', () => {
    it('should have comprehensive Key Learning Points for all updated modules', () => {
      const updatedModules = ['MODULE 5.5', 'MODULE 6', 'MODULE 7']

      updatedModules.forEach(modulePrefix => {
        const moduleStart = knowledgeBaseContent.indexOf(modulePrefix)
        expect(moduleStart).toBeGreaterThan(-1)
        
        const nextModuleStart = knowledgeBaseContent.indexOf('## MODULE', moduleStart + modulePrefix.length)
        const moduleSection = nextModuleStart > -1 ? 
          knowledgeBaseContent.slice(moduleStart, nextModuleStart) :
          knowledgeBaseContent.slice(moduleStart)
        
        expect(moduleSection).toContain('Key Learning Points')
        
        // Should have multiple learning point categories
        const learningPointsSection = moduleSection.match(/### Key Learning Points(.*?)(?=---|###|$)/s)?.[1] || ''
        expect(learningPointsSection.length).toBeGreaterThan(200)
      })
    })

    it('should have proper recognition keywords for all updated modules', () => {
      const updatedModules = ['MODULE 5.5', 'MODULE 6', 'MODULE 7']

      updatedModules.forEach(modulePrefix => {
        const moduleStart = knowledgeBaseContent.indexOf(modulePrefix)
        const nextModuleStart = knowledgeBaseContent.indexOf('## MODULE', moduleStart + modulePrefix.length)
        const moduleSection = nextModuleStart > -1 ? 
          knowledgeBaseContent.slice(moduleStart, nextModuleStart) :
          knowledgeBaseContent.slice(moduleStart)
        
        expect(moduleSection).toContain('**Recognition Keywords:**')
        
        // Keywords should contain both German and English terms
        const keywordsMatch = moduleSection.match(/\*\*Recognition Keywords:\*\*(.*?)(?:\n\n|\*\*[^*]+\*\*)/s)
        const keywordsContent = keywordsMatch?.[1]?.trim() || ''
        
        expect(keywordsContent.length).toBeGreaterThan(50) // Minimum keywords content
        expect(keywordsContent.split(',').length).toBeGreaterThan(5) // Multiple keywords
      })
    })

    it('should have proper video URL and metadata for all modules', () => {
      const videoUrlPattern = /https:\/\/vimeo\.com\/\d+/g
      const videoUrls = knowledgeBaseContent.match(videoUrlPattern)
      
      expect(videoUrls).not.toBeNull()
      expect(videoUrls!.length).toBeGreaterThanOrEqual(10) // Should have multiple video URLs
      
      // Each video should have timestamp parameters
      const urlsWithTimestamps = knowledgeBaseContent.match(/https:\/\/vimeo\.com\/\d+\?[^"\s]*#t=/g)
      expect(urlsWithTimestamps).not.toBeNull()
      expect(urlsWithTimestamps!.length).toBeGreaterThanOrEqual(8) // Most videos should have timestamps
    })
  })

  describe('Content Quality and Consistency', () => {
    it('should maintain consistent formatting across all modules', () => {
      // Check for consistent section headers
      expect(knowledgeBaseContent.match(/\*\*Video URL:\*\*/g)?.length).toBeGreaterThanOrEqual(10)
      expect(knowledgeBaseContent.match(/\*\*Video Title:\*\*/g)?.length).toBeGreaterThanOrEqual(10)
      expect(knowledgeBaseContent.match(/\*\*Description:\*\*/g)?.length).toBeGreaterThanOrEqual(10)
      expect(knowledgeBaseContent.match(/\*\*Recognition Keywords:\*\*/g)?.length).toBeGreaterThanOrEqual(10)
    })

    it('should have no duplicate module numbers', () => {
      const moduleNumbers = knowledgeBaseContent.match(/## MODULE \d+(?:\.\d+)?:/g) || []
      const uniqueModuleNumbers = [...new Set(moduleNumbers)]
      
      expect(moduleNumbers.length).toBe(uniqueModuleNumbers.length)
    })

    it('should have proper section ordering', () => {
      const moduleOrder = [
        'MODULE 1:', 'MODULE 2:', 'MODULE 3:', 
        'MODULE 4.1:', 'MODULE 4.2:',
        'MODULE 5.1:', 'MODULE 5.2:', 'MODULE 5.3:', 'MODULE 5.4:', 'MODULE 5.5:',
        'MODULE 6:', 'MODULE 7:'
      ]

      let lastFoundIndex = -1
      moduleOrder.forEach(moduleTitle => {
        const currentIndex = knowledgeBaseContent.indexOf(moduleTitle)
        expect(currentIndex).toBeGreaterThan(lastFoundIndex)
        lastFoundIndex = currentIndex
      })
    })

    it('should have appropriate content length distribution', () => {
      const modules = knowledgeBaseContent.split(/## MODULE \d+(?:\.\d+)?:/)
      
      // Remove the header section (before first module)
      modules.shift()
      
      // Each module should have reasonable content length
      modules.forEach((moduleContent, index) => {
        expect(moduleContent.length).toBeGreaterThan(200) // Minimum content per module
        expect(moduleContent.length).toBeLessThan(20000) // Maximum content per module
      })
    })
  })

  describe('Integration with Existing Content', () => {
    it('should not break existing module structure', () => {
      // Check that all original modules still exist
      const originalModules = [
        'MODULE 1: INTRO',
        'MODULE 2: EINFÜHRUNG', 
        'MODULE 3: TECHNISCHE MODEZEICHNUNG GRUNDLAGEN',
        'MODULE 4.1: TECHNISCHE MODEZEICHNUNG TEIL 1 - WERKZEUGE'
      ]

      originalModules.forEach(moduleTitle => {
        expect(knowledgeBaseContent).toContain(moduleTitle)
      })
    })

    it('should maintain course structure consistency', () => {
      // Should still reference Course 301
      expect(knowledgeBaseContent).toMatch(/Course 301|Adobe Illustrator/)
      
      // Should maintain fashion design context
      expect(knowledgeBaseContent).toMatch(/fashion|Mode/)
      
      // Should have technical drawing context
      expect(knowledgeBaseContent).toMatch(/technical drawing|technische.*Zeichnung/i)
    })

    it('should have proper file size indicating substantial content', () => {
      // File should be substantial due to complete transcripts
      expect(knowledgeBaseContent.length).toBeGreaterThan(50000) // At least 50KB of content
      
      // But not excessively large
      expect(knowledgeBaseContent.length).toBeLessThan(500000) // Less than 500KB
    })
  })
})