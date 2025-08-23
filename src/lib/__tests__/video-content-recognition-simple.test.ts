import fs from 'fs'
import path from 'path'

describe('Video Content Recognition - Simple Tests', () => {
  const knowledgeBasePath = path.join(__dirname, '../../data/illustrator-fashion-design.md')
  let knowledgeBaseContent: string

  beforeAll(() => {
    knowledgeBaseContent = fs.readFileSync(knowledgeBasePath, 'utf-8')
  })

  describe('Video Module Presence and Structure', () => {
    it('should contain all expected video modules', () => {
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

      expectedModules.forEach(module => {
        expect(knowledgeBaseContent).toContain(module)
      })
    })

    it('should have recognition keywords for video identification', () => {
      // Key recognition terms that should exist for video-specific responses
      const recognitionTerms = [
        'grundlagen', // For MODULE 3
        'werkzeuge', 'tools', // For MODULE 4.1
        'ebenen', 'layers', // For MODULE 4.2
        'formatieren', // For MODULE 5.1
        'schablone', 'template', // For MODULE 5.2
        'vorderansicht', 'front view', // For MODULE 5.3
        'kopieren', 'copy', // For MODULE 5.4
        'rückansicht', 'back view', // For MODULE 5.5
        'beschriften', 'labeling', // For MODULE 6
        'zusammenfassung', 'summary' // For MODULE 7
      ]

      recognitionTerms.forEach(term => {
        expect(knowledgeBaseContent.toLowerCase()).toContain(term.toLowerCase())
      })
    })

    it('should have proper video URLs for all modules', () => {
      const vimeoUrlPattern = /https:\/\/vimeo\.com\/\d+/g
      const videoUrls = knowledgeBaseContent.match(vimeoUrlPattern)
      
      expect(videoUrls).not.toBeNull()
      expect(videoUrls!.length).toBeGreaterThanOrEqual(10) // At least 10 video URLs
      
      // Check for specific expected URLs
      const expectedUrls = [
        'https://vimeo.com/1107393382', // Intro
        'https://vimeo.com/1107393678', // Grundlagen
        'https://vimeo.com/1107394453', // Beschriften
      ]
      
      expectedUrls.forEach(url => {
        expect(knowledgeBaseContent).toContain(url)
      })
    })
  })

  describe('Complete Transcript Content', () => {
    it('should have substantial German content in MODULE 6', () => {
      expect(knowledgeBaseContent).toContain('Eine technische Zeichnung wird natürlich für das Atelier')
      expect(knowledgeBaseContent).toContain('Produktionsstätte')
      expect(knowledgeBaseContent).toContain('Dossier mit verschiedenen Papieren')
      expect(knowledgeBaseContent).toContain('Pfeile verwenden')
      expect(knowledgeBaseContent).toContain('Liniensegment')
      expect(knowledgeBaseContent).toContain('Shift-Taste')
    })

    it('should have substantial German content in MODULE 7', () => {
      expect(knowledgeBaseContent).toContain('Du hast gelernt, wie man Adobe Illustrator bedient')
      expect(knowledgeBaseContent).toContain('Grundfunktionen des Programmes')
      expect(knowledgeBaseContent).toContain('Bedienfelder wie zum Beispiel Eigenschaften oder Ebenen')
      expect(knowledgeBaseContent).toContain('Werkzeuge kennengelernt')
      expect(knowledgeBaseContent).toContain('technische Zeichnung erstellen und beschriften')
    })

    it('should have English translations for key sections', () => {
      // Should have English translations for technical terms
      const translations = [
        { german: 'Zeichenfeder', english: 'pen tool' },
        { german: 'Linienwerkzeug', english: 'line tool' },
        { german: 'Eigenschaften', english: 'Properties' },
        { german: 'Ebenen', english: 'Layers' },
        { german: 'spiegeln', english: 'mirror' },
        { german: 'technische Zeichnung', english: 'technical drawing' }
      ]

      translations.forEach(({ german, english }) => {
        if (knowledgeBaseContent.includes(german)) {
          expect(knowledgeBaseContent.toLowerCase()).toContain(english.toLowerCase())
        }
      })
    })
  })

  describe('Video-Specific Recognition Features', () => {
    it('should have recognition keywords sections', () => {
      const recognitionKeywordCount = (knowledgeBaseContent.match(/\*\*Recognition Keywords:\*\*/g) || []).length
      expect(recognitionKeywordCount).toBeGreaterThanOrEqual(8) // Most modules should have recognition keywords
    })

    it('should have bilingual support for key modules', () => {
      // Should have both German and English content for updated modules
      const bilingualIndicators = [
        '**German Original:**',
        '**English Translation:**'
      ]

      bilingualIndicators.forEach(indicator => {
        expect(knowledgeBaseContent).toContain(indicator)
      })

      // Should have multiple instances of bilingual content
      const germanOriginalCount = (knowledgeBaseContent.match(/\*\*German Original:\*\*/g) || []).length
      const englishTranslationCount = (knowledgeBaseContent.match(/\*\*English Translation:\*\*/g) || []).length
      
      expect(germanOriginalCount).toBeGreaterThanOrEqual(2) // At least 2 modules with German content
      expect(englishTranslationCount).toBeGreaterThanOrEqual(2) // At least 2 modules with English translations
    })

    it('should have learning points for practical application', () => {
      const learningPointsCount = (knowledgeBaseContent.match(/Key Learning Points/g) || []).length
      expect(learningPointsCount).toBeGreaterThanOrEqual(1) // Should have learning points for key modules
      
      // Should contain practical techniques
      const practicalTerms = [
        'technique',
        'step-by-step',
        'workflow',
        'method',
        'process'
      ]
      
      let practicalTermsFound = 0
      practicalTerms.forEach(term => {
        if (knowledgeBaseContent.toLowerCase().includes(term)) {
          practicalTermsFound++
        }
      })
      
      expect(practicalTermsFound).toBeGreaterThanOrEqual(3) // Should have practical guidance
    })
  })

  describe('Professional Context and Industry Relevance', () => {
    it('should include professional production context', () => {
      const professionalTerms = [
        'Atelier',
        'Produktionsstätte',
        'production facility',
        'professional',
        'industry',
        'manufacturing'
      ]

      let professionalTermsFound = 0
      professionalTerms.forEach(term => {
        if (knowledgeBaseContent.toLowerCase().includes(term.toLowerCase())) {
          professionalTermsFound++
        }
      })

      expect(professionalTermsFound).toBeGreaterThanOrEqual(3) // Should have professional context
    })

    it('should include technical specifications and measurements', () => {
      // Should include specific technical details from transcripts
      const technicalDetails = [
        '0,5', // Line weight measurements
        '0.5', // English equivalent
        'Punkt', // Point measurements
        'cm', // Centimeter measurements
        'Shift', // Technical keyboard instructions
        'Kontur', // Stroke settings
        'Eigenschaften' // Properties panel
      ]

      let technicalDetailsFound = 0
      technicalDetails.forEach(detail => {
        if (knowledgeBaseContent.includes(detail)) {
          technicalDetailsFound++
        }
      })

      expect(technicalDetailsFound).toBeGreaterThanOrEqual(4) // Should have specific technical details
    })

    it('should maintain course structure integration', () => {
      // Should reference Course 301 context
      expect(knowledgeBaseContent).toMatch(/Course 301|Adobe Illustrator for Fashion/)
      
      // Should maintain fashion design context
      expect(knowledgeBaseContent).toMatch(/fashion|Mode/)
      
      // Should reference ELLU Studios context
      expect(knowledgeBaseContent).toMatch(/ELLU|kurse\.ellustudios\.com/)
    })
  })

  describe('Content Quality and Completeness', () => {
    it('should have appropriate content length', () => {
      // Knowledge base should be substantial due to complete transcripts
      expect(knowledgeBaseContent.length).toBeGreaterThan(50000) // At least 50KB
      expect(knowledgeBaseContent.length).toBeLessThan(500000) // Less than 500KB
    })

    it('should have consistent formatting', () => {
      // Should have consistent module headers
      const moduleHeaders = knowledgeBaseContent.match(/## MODULE \d+(?:\.\d+)?:/g) || []
      expect(moduleHeaders.length).toBe(12) // Exactly 12 modules

      // Should have consistent video metadata
      const videoUrls = knowledgeBaseContent.match(/\*\*Video URL:\*\*/g) || []
      const videoTitles = knowledgeBaseContent.match(/\*\*Video Title:\*\*/g) || []
      
      expect(videoUrls.length).toBeGreaterThanOrEqual(10)
      expect(videoTitles.length).toBeGreaterThanOrEqual(10)
    })

    it('should have no duplicate modules', () => {
      const moduleNumbers = knowledgeBaseContent.match(/## MODULE \d+(?:\.\d+)?:/g) || []
      const uniqueModules = [...new Set(moduleNumbers)]
      
      expect(moduleNumbers.length).toBe(uniqueModules.length) // No duplicates
    })

    it('should have proper section ordering', () => {
      const expectedOrder = [
        'MODULE 1:', 'MODULE 2:', 'MODULE 3:', 
        'MODULE 4.1:', 'MODULE 4.2:',
        'MODULE 5.1:', 'MODULE 5.2:', 'MODULE 5.3:', 'MODULE 5.4:', 'MODULE 5.5:',
        'MODULE 6:', 'MODULE 7:'
      ]

      let lastIndex = -1
      expectedOrder.forEach(module => {
        const currentIndex = knowledgeBaseContent.indexOf(module)
        expect(currentIndex).toBeGreaterThan(lastIndex)
        lastIndex = currentIndex
      })
    })
  })
})