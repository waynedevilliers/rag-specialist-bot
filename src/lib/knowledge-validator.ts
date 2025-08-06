import { SecurityValidator } from './security-validator'
import { DocumentChunk } from './knowledge-base'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  confidence: number
}

export interface ContentAnalysis {
  wordCount: number
  sentenceCount: number
  readabilityScore: number
  fashionTermDensity: number
  technicalComplexity: number
  languageDetection: 'english' | 'german' | 'mixed' | 'unknown'
  topicRelevance: number
}

export class KnowledgeValidator {
  private static readonly FASHION_TERMS = [
    // Pattern Making Terms
    'dart', 'seam', 'ease', 'grain', 'bias', 'notch', 'facing', 'interfacing', 
    'hem', 'seam allowance', 'pattern', 'sizing', 'grading', 'alteration',
    
    // Illustrator/Design Terms
    'illustrator', 'vector', 'flat sketch', 'technical drawing', 'color palette',
    'swatch', 'pantone', 'repeat', 'texture', 'brush', 'pen tool',
    
    // Draping Terms
    'draping', 'muslin', 'toile', 'form', 'mannequin', 'drape', 'fold',
    'gather', 'pleat', 'tuck', 'princess seam', 'french curve',
    
    // Construction Terms
    'sewing', 'construction', 'fitting', 'pressing', 'finishing', 'zipper',
    'button', 'buttonhole', 'collar', 'cuff', 'sleeve', 'bodice', 'skirt',
    'trouser', 'lining', 'thread', 'needle', 'machine'
  ]

  private static readonly GERMAN_FASHION_TERMS = [
    'schnitt', 'naht', 'abnäher', 'fadenlauf', 'schräg', 'muster',
    'technische zeichnung', 'mode', 'bekleidung', 'entwurf'
  ]

  private static readonly MIN_WORD_COUNT = 50
  private static readonly MAX_WORD_COUNT = 10000
  private static readonly MIN_FASHION_TERM_DENSITY = 0.02 // 2%
  private static readonly MIN_TOPIC_RELEVANCE = 0.3

  /**
   * Validate content before adding to knowledge base
   */
  static async validateContent(
    content: string,
    title: string,
    courseType: string,
    courseNumber: string
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let confidence = 1.0

    try {
      // Basic security validation
      try {
        SecurityValidator.validateQuery(content)
        SecurityValidator.validateQuery(title)
      } catch (securityError) {
        errors.push(`Security validation failed: ${securityError instanceof Error ? securityError.message : 'Unknown security error'}`)
        confidence -= 0.3
      }

      // Content analysis
      const analysis = this.analyzeContent(content)

      // Word count validation
      if (analysis.wordCount < this.MIN_WORD_COUNT) {
        errors.push(`Content too short: ${analysis.wordCount} words (minimum: ${this.MIN_WORD_COUNT})`)
        confidence -= 0.2
      } else if (analysis.wordCount > this.MAX_WORD_COUNT) {
        warnings.push(`Content is very long: ${analysis.wordCount} words (consider splitting)`)
        confidence -= 0.1
      }

      // Fashion relevance validation
      if (analysis.fashionTermDensity < this.MIN_FASHION_TERM_DENSITY) {
        warnings.push(`Low fashion term density: ${Math.round(analysis.fashionTermDensity * 100)}% (recommended: ${this.MIN_FASHION_TERM_DENSITY * 100}%)`)
        suggestions.push('Consider adding more fashion-specific terminology')
        confidence -= 0.15
      }

      // Topic relevance validation
      if (analysis.topicRelevance < this.MIN_TOPIC_RELEVANCE) {
        errors.push(`Content appears to be off-topic for fashion education (relevance: ${Math.round(analysis.topicRelevance * 100)}%)`)
        confidence -= 0.4
      }

      // Course type alignment validation
      const courseAlignment = this.validateCourseAlignment(content, courseType)
      if (courseAlignment.score < 0.3) {
        warnings.push(`Content may not align well with course type "${courseType}" (alignment: ${Math.round(courseAlignment.score * 100)}%)`)
        suggestions.push(`Consider course type: ${courseAlignment.suggestedType}`)
        confidence -= 0.1
      }

      // Title relevance validation
      const titleRelevance = this.validateTitleRelevance(title, content)
      if (titleRelevance < 0.5) {
        warnings.push('Title may not be representative of content')
        suggestions.push('Consider updating the title to better reflect the content')
        confidence -= 0.05
      }

      // Language consistency validation
      if (analysis.languageDetection === 'mixed') {
        warnings.push('Mixed language content detected - ensure this is intentional')
        suggestions.push('Consider separating content by language or choosing a primary language')
      } else if (analysis.languageDetection === 'unknown') {
        warnings.push('Unable to detect content language')
      }

      // Course number validation
      const courseNumValidation = this.validateCourseNumber(courseNumber, courseType)
      if (!courseNumValidation.isValid) {
        warnings.push(courseNumValidation.message)
        confidence -= 0.05
      }

      // Readability validation
      if (analysis.readabilityScore < 0.4) {
        warnings.push('Content may be difficult to understand')
        suggestions.push('Consider simplifying language or adding more explanatory text')
        confidence -= 0.1
      } else if (analysis.readabilityScore > 0.9) {
        suggestions.push('Content appears very accessible - good for beginners')
      }

      // Technical complexity validation
      if (analysis.technicalComplexity > 0.8 && courseNumber.startsWith('1')) {
        warnings.push('High technical complexity for an introductory course')
        suggestions.push('Consider adding more basic explanations')
        confidence -= 0.1
      }

      // Final confidence adjustment
      confidence = Math.max(0, Math.min(1, confidence))

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        confidence
      }
    } catch (error) {
      console.error('Error during content validation:', error)
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        suggestions: [],
        confidence: 0
      }
    }
  }

  /**
   * Analyze content characteristics
   */
  private static analyzeContent(content: string): ContentAnalysis {
    const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 0)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Calculate fashion term density
    const fashionTerms = [...this.FASHION_TERMS, ...this.GERMAN_FASHION_TERMS]
    const fashionTermCount = words.filter(word => 
      fashionTerms.some(term => word.includes(term.toLowerCase()) || term.toLowerCase().includes(word))
    ).length
    const fashionTermDensity = words.length > 0 ? fashionTermCount / words.length : 0

    // Language detection (simplified)
    const englishWords = words.filter(word => this.isLikelyEnglish(word)).length
    const germanWords = words.filter(word => this.isLikelyGerman(word)).length
    const totalWords = words.length
    
    let languageDetection: ContentAnalysis['languageDetection'] = 'unknown'
    if (totalWords > 0) {
      const englishRatio = englishWords / totalWords
      const germanRatio = germanWords / totalWords
      
      if (englishRatio > 0.6) {
        languageDetection = 'english'
      } else if (germanRatio > 0.3) {
        languageDetection = 'german'
      } else if (englishRatio > 0.3 && germanRatio > 0.2) {
        languageDetection = 'mixed'
      }
    }

    // Calculate readability (simplified)
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0
    const avgCharsPerWord = words.reduce((sum, word) => sum + word.length, 0) / words.length
    const readabilityScore = Math.max(0, Math.min(1, 
      1 - ((avgWordsPerSentence - 15) / 30 + (avgCharsPerWord - 5) / 10) / 2
    ))

    // Technical complexity (based on technical terms and sentence length)
    const technicalTerms = words.filter(word => 
      word.length > 8 || // Long technical words
      /^(micro|macro|multi|inter|intra|pre|post|anti|pro)/.test(word) || // Technical prefixes
      /[0-9]/.test(word) // Numbers often indicate technical content
    ).length
    const technicalComplexity = Math.min(1, (technicalTerms / words.length) * 5)

    // Topic relevance (based on fashion terms and educational indicators)
    const educationalTerms = words.filter(word => 
      ['learn', 'understand', 'technique', 'method', 'process', 'step', 'tutorial', 'guide', 'instruction'].includes(word)
    ).length
    const topicRelevance = Math.min(1, (fashionTermDensity * 2 + educationalTerms / words.length) / 2)

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      readabilityScore,
      fashionTermDensity,
      technicalComplexity,
      languageDetection,
      topicRelevance
    }
  }

  /**
   * Validate course type alignment
   */
  private static validateCourseAlignment(content: string, courseType: string): {score: number, suggestedType: string} {
    const contentLower = content.toLowerCase()
    
    const typeScores = {
      'pattern-making': this.calculatePatternMakingScore(contentLower),
      'illustrator-fashion': this.calculateIllustratorScore(contentLower),
      'draping': this.calculateDrapingScore(contentLower),
      'construction': this.calculateConstructionScore(contentLower)
    }

    const currentScore = typeScores[courseType as keyof typeof typeScores] || 0
    const bestType = Object.entries(typeScores).reduce((a, b) => a[1] > b[1] ? a : b)[0]

    return {
      score: currentScore,
      suggestedType: bestType
    }
  }

  private static calculatePatternMakingScore(content: string): number {
    const terms = ['pattern', 'dart', 'seam', 'ease', 'grain', 'measurement', 'grading', 'sizing']
    return terms.filter(term => content.includes(term)).length / terms.length
  }

  private static calculateIllustratorScore(content: string): number {
    const terms = ['illustrator', 'vector', 'flat', 'sketch', 'color', 'palette', 'brush', 'pen tool']
    return terms.filter(term => content.includes(term)).length / terms.length
  }

  private static calculateDrapingScore(content: string): number {
    const terms = ['draping', 'drape', 'muslin', 'form', 'mannequin', 'fold', 'gather', 'pleat']
    return terms.filter(term => content.includes(term)).length / terms.length
  }

  private static calculateConstructionScore(content: string): number {
    const terms = ['sewing', 'construction', 'fitting', 'zipper', 'button', 'collar', 'sleeve']
    return terms.filter(term => content.includes(term)).length / terms.length
  }

  /**
   * Validate title relevance to content
   */
  private static validateTitleRelevance(title: string, content: string): number {
    const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2)
    const contentLower = content.toLowerCase()
    
    if (titleWords.length === 0) return 0
    
    const relevantWords = titleWords.filter(word => contentLower.includes(word))
    return relevantWords.length / titleWords.length
  }

  /**
   * Validate course number format and consistency
   */
  private static validateCourseNumber(courseNumber: string, courseType: string): {isValid: boolean, message: string} {
    if (!/^\d{3}$/.test(courseNumber)) {
      return {
        isValid: false,
        message: 'Course number should be a 3-digit number (e.g., 101, 201, 301)'
      }
    }

    const level = parseInt(courseNumber.charAt(0))
    const expectedLevels = {
      'pattern-making': [1, 2], // 100s, 200s
      'illustrator-fashion': [2, 3], // 200s, 300s
      'draping': [3, 4], // 300s, 400s
      'construction': [4, 5] // 400s, 500s
    }

    const expected = expectedLevels[courseType as keyof typeof expectedLevels] || [1, 2, 3, 4, 5]
    if (!expected.includes(level)) {
      return {
        isValid: false,
        message: `Course number ${courseNumber} may not align with ${courseType} (expected levels: ${expected.join(', ')}00s)`
      }
    }

    return {
      isValid: true,
      message: ''
    }
  }

  /**
   * Simple language detection helpers
   */
  private static isLikelyEnglish(word: string): boolean {
    const englishIndicators = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'men', 'run', 'too', 'use']
    return englishIndicators.includes(word.toLowerCase()) || /^[a-z]+ing$/.test(word) || /^[a-z]+ed$/.test(word)
  }

  private static isLikelyGerman(word: string): boolean {
    const germanIndicators = ['der', 'die', 'das', 'und', 'ist', 'mit', 'auf', 'für', 'von', 'den', 'des', 'dem', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'sich', 'auch', 'nicht', 'werden', 'werden', 'kann', 'wie', 'nach', 'über', 'sie', 'ihm', 'ihr', 'ihre', 'seine', 'mein', 'dein']
    return germanIndicators.includes(word.toLowerCase()) || word.endsWith('ung') || word.endsWith('keit') || word.endsWith('heit')
  }

  /**
   * Validate chunks for consistency and quality
   */
  static validateChunks(chunks: DocumentChunk[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let confidence = 1.0

    if (chunks.length === 0) {
      errors.push('No chunks provided for validation')
      return { isValid: false, errors, warnings, suggestions, confidence: 0 }
    }

    // Check for duplicate content
    const contentHashes = new Map<string, number>()
    chunks.forEach((chunk, index) => {
      const hash = this.simpleHash(chunk.content)
      if (contentHashes.has(hash)) {
        warnings.push(`Potential duplicate content found in chunk ${index}`)
        confidence -= 0.05
      } else {
        contentHashes.set(hash, index)
      }
    })

    // Check chunk size distribution
    const chunkSizes = chunks.map(chunk => chunk.content.length)
    const avgSize = chunkSizes.reduce((sum, size) => sum + size, 0) / chunkSizes.length
    const oversizedChunks = chunkSizes.filter(size => size > avgSize * 2).length
    const undersizedChunks = chunkSizes.filter(size => size < avgSize * 0.3).length

    if (oversizedChunks > chunks.length * 0.2) {
      warnings.push(`${oversizedChunks} chunks are significantly larger than average`)
      suggestions.push('Consider breaking down large chunks for better retrieval')
    }

    if (undersizedChunks > chunks.length * 0.3) {
      warnings.push(`${undersizedChunks} chunks are significantly smaller than average`)
      suggestions.push('Consider combining small chunks for better context')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      confidence
    }
  }

  /**
   * Simple hash function for content comparison
   */
  private static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }
}