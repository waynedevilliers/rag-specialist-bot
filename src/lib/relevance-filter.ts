/**
 * Relevance Filter for RAG System
 * 
 * This module determines whether a user query is relevant to the fashion design
 * knowledge base before triggering expensive RAG operations.
 */

import { ValidationUtils } from './validation-schemas'

/**
 * Fashion design related keywords and topics
 */
const FASHION_KEYWORDS = {
  // Core fashion terms
  CORE: [
    'fashion', 'design', 'garment', 'clothing', 'apparel', 'textile', 'fabric',
    'pattern', 'sewing', 'tailoring', 'dressmaking', 'couture', 'ready-to-wear',
    'course', 'lesson', 'module', 'ellu', 'studios', 'tutorial', 'learning'
  ],
  
  // Construction techniques
  TECHNIQUES: [
    'dart', 'seam', 'hem', 'zipper', 'button', 'collar', 'sleeve', 'bodice',
    'skirt', 'draping', 'fitting', 'alteration', 'bias', 'grain', 'ease',
    'gathering', 'pleating', 'interfacing', 'lining', 'topstitching'
  ],
  
  // Adobe Illustrator terms
  ILLUSTRATOR: [
    'illustrator', 'adobe', 'vector', 'pen', 'tool', 'pathfinder', 'brush',
    'technical', 'flat', 'fashion', 'illustration', 'color', 'palette', 'swatches',
    'artboard', 'layers', 'layer', 'bezier', 'anchor', 'point', 'line', 'weight', 'weights', 'stroke',
    'fill', 'croquis', 'template', 'annotation', 'workflow'
  ],
  
  // Garment types
  GARMENTS: [
    'dress', 'skirt', 'blouse', 'shirt', 'pants', 'trousers', 'jacket',
    'coat', 'top', 'sleeve', 'collar', 'waistband', 'pocket', 'cuff'
  ],
  
  // Measurements and fit
  MEASUREMENTS: [
    'bust', 'waist', 'hip', 'shoulder', 'measurement', 'size', 'fit',
    'ease', 'tolerance', 'grade', 'proportion', 'length', 'width'
  ],
  
  // Tools and equipment
  TOOLS: [
    'sewing machine', 'overlock', 'serger', 'needle', 'thread', 'scissors',
    'rotary cutter', 'ruler', 'measuring tape', 'pins', 'chalk', 'iron',
    'dress form', 'mannequin'
  ]
} as const

/**
 * Non-fashion topics that should not trigger RAG
 */
const NON_FASHION_INDICATORS = [
  // Programming/technical (not fashion-related)
  'javascript', 'python', 'code', 'programming', 'database', 'api', 'server',
  'react', 'component', 'function', 'variable', 'array', 'algorithm',
  
  // Financial and investment
  'financial', 'advisor', 'investment', 'stocks', 'bonds', 'portfolio', 'trading',
  'crypto', 'bitcoin', 'finance', 'money', 'bank', 'loan', 'mortgage', 'insurance',
  'retirement', 'savings', 'budget', 'tax', 'ira', '401k', 'dividend',
  
  // Weather and time
  'weather', 'temperature', 'rain', 'sunny', 'cloudy', 'forecast', 'climate',
  'time', 'date', 'clock', 'calendar', 'timezone', 'hour', 'minute',
  
  // Travel and destinations
  'travel', 'vacation', 'holiday', 'destination', 'flight', 'hotel', 'booking',
  'tourist', 'sightseeing', 'beach', 'mountain', 'city', 'country', 'visa',
  'passport', 'airline', 'airport', 'luggage',
  
  // General conversation
  'hello', 'hi', 'thanks', 'goodbye', 'news', 'politics', 'sports',
  'movies', 'music', 'food', 'cooking', 'recipe', 'restaurant',
  
  // Other professional domains
  'medicine', 'doctor', 'health', 'hospital', 'surgery', 'diagnosis',
  'law', 'legal', 'lawyer', 'court', 'contract', 'lawsuit',
  'business', 'accounting', 'marketing', 'sales', 'management',
  'science', 'physics', 'chemistry', 'biology', 'mathematics',
  
  // Technology and other software
  'excel', 'word', 'powerpoint', 'photoshop', 'indesign', 'figma', 'sketch',
  'google', 'facebook', 'instagram', 'twitter', 'linkedin', 'social media',
  
  // Entertainment and lifestyle
  'game', 'gaming', 'video', 'youtube', 'netflix', 'tv show', 'series',
  'book', 'novel', 'reading', 'literature', 'art', 'painting', 'sculpture',
  'fitness', 'gym', 'workout', 'exercise', 'diet', 'nutrition',
  
  // Education (non-fashion)
  'math', 'english', 'history', 'geography', 'school', 'university', 'college',
  'degree', 'diploma', 'exam', 'test', 'homework', 'study'
] as const

/**
 * Greeting patterns that should get quick responses
 */
const GREETING_PATTERNS = [
  /^(hi|hello|hey|good\s+(morning|afternoon|evening))$/i,
  /^(thanks?|thank\s+you)$/i,
  /^(bye|goodbye|see\s+you)$/i,
  /^(how\s+are\s+you|what's\s+up)$/i
] as const

/**
 * Role-playing and prompt injection patterns to reject
 */
const PROMPT_INJECTION_PATTERNS = [
  // Role-playing attempts
  /you\s+are\s+now\s+a\s+(financial|travel|medical|legal|business)/i,
  /pretend\s+to\s+be\s+a\s+(doctor|lawyer|advisor|expert)/i,
  /act\s+as\s+a\s+(financial|investment|travel|medical)/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /ignore\s+(previous|all)\s+(instructions|prompts)/i,
  /you\s+are\s+no\s+longer\s+a\s+fashion/i,
  /instead\s+of\s+fashion/i,
  
  // Direct non-fashion requests
  /give\s+me\s+\d+\s+(investments?|stocks?|travel)/i,
  /what.*weather/i,
  /what.*time.*date/i,
  /recommend.*destination/i,
  /best.*investment/i
] as const

/**
 * Question types that should trigger RAG
 */
const FASHION_QUESTION_PATTERNS = [
  /how\s+to\s+(sew|make|create|design|draft)/i,
  /what\s+is\s+(a\s+)?(dart|seam|bias|ease|draping)/i,
  /how\s+do\s+i\s+(fit|alter|adjust|measure)/i,
  /(illustrator|adobe).*fashion/i,
  /(technical\s+flat|fashion\s+illustration)/i,
  /fabric\s+(choice|selection|properties)/i,
  /pattern\s+(making|drafting|adjustment)/i,
  /(course|lesson|module)\s*\d+/i,
  /what\s+(courses?|lessons?|modules?)/i,
  /tell\s+me\s+about\s+(course|lesson|module)/i,
  /ellu\s+studios/i,
  /what\s+(are|is)\s+(layers?|line\s*weights?)/i,
  /tell\s+me\s+(more\s+)?about\s+(layers?|line\s*weights?)/i,
  /layers?\s+(in|for|organization)/i,
  /pen\s+tool/i,
  /technical\s+(drawing|flat)/i,
  /croquis/i,
  /workflow/i
] as const

/**
 * Relevance scoring thresholds
 */
const THRESHOLDS = {
  HIGH_RELEVANCE: 0.2,    // Definitely fashion-related (very low)
  LOW_RELEVANCE: 0.1,     // Probably not fashion-related (very low) 
  KEYWORD_WEIGHT: 0.4,    // Weight of keyword matching
  PATTERN_WEIGHT: 0.6     // Weight of pattern matching (higher)
} as const

/**
 * Result of relevance analysis
 */
export interface RelevanceResult {
  isRelevant: boolean
  confidence: number
  reasoning: string
  suggestedResponse?: string
  shouldUseRAG: boolean
}

/**
 * Relevance filter class
 */
export class RelevanceFilter {
  
  /**
   * Determine if a query is relevant to fashion design
   * Simplified to only handle greetings - let RAG system handle everything else
   */
  static analyzeRelevance(query: string): RelevanceResult {
    try {
      // Validate and clean the query
      const cleanQuery = ValidationUtils.validateQuery(query).toLowerCase()
      
      // Check for greetings - provide quick response without RAG
      if (this.isGreeting(cleanQuery)) {
        return {
          isRelevant: true,
          confidence: 1.0,
          reasoning: 'Simple greeting detected',
          suggestedResponse: this.getGreetingResponse(),
          shouldUseRAG: false
        }
      }
      
      // For everything else, let RAG system handle it
      // RAG system has proper role boundaries and will redirect non-fashion questions
      return {
        isRelevant: true,
        confidence: 0.8,
        reasoning: 'Allowing RAG system to handle query and enforce role boundaries',
        shouldUseRAG: true
      }
      
    } catch (error) {
      // If validation fails, still let RAG handle it
      return {
        isRelevant: true,
        confidence: 0.5,
        reasoning: 'Query validation failed - letting RAG system handle',
        shouldUseRAG: true
      }
    }
  }
  
  /**
   * Check if query is a prompt injection or role-playing attempt
   */
  private static isPromptInjection(query: string): boolean {
    return PROMPT_INJECTION_PATTERNS.some(pattern => pattern.test(query))
  }
  
  /**
   * Check if query is a simple greeting
   */
  private static isGreeting(query: string): boolean {
    return GREETING_PATTERNS.some(pattern => pattern.test(query.trim()))
  }
  
  /**
   * Get appropriate greeting response
   */
  private static getGreetingResponse(): string {
    const responses = [
      "Hello! I'm your fashion design assistant. I can help you with garment construction, pattern making, and Adobe Illustrator techniques. What would you like to learn today?",
      "Hi there! I specialize in fashion design education. Feel free to ask me about sewing techniques, pattern drafting, or fashion illustration.",
      "Welcome! I'm here to help with fashion design questions, from basic construction to advanced Adobe Illustrator techniques. How can I assist you?"
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }
  
  /**
   * Calculate how likely the query is about non-fashion topics
   */
  private static calculateNonFashionScore(query: string): number {
    const words = this.extractWords(query)
    const nonFashionMatches = words.filter(word => 
      NON_FASHION_INDICATORS.some(indicator => 
        word.includes(indicator) || indicator.includes(word)
      )
    ).length
    
    return Math.min(nonFashionMatches / words.length * 2, 1) // Cap at 1.0
  }
  
  /**
   * Calculate fashion design relevance score
   */
  private static calculateFashionScore(query: string): number {
    const keywordScore = this.calculateKeywordScore(query)
    const patternScore = this.calculatePatternScore(query)
    
    return (keywordScore * THRESHOLDS.KEYWORD_WEIGHT) + 
           (patternScore * THRESHOLDS.PATTERN_WEIGHT)
  }
  
  /**
   * Calculate score based on fashion keyword presence
   */
  private static calculateKeywordScore(query: string): number {
    const words = this.extractWords(query)
    const allFashionKeywords = [
      ...FASHION_KEYWORDS.CORE,
      ...FASHION_KEYWORDS.TECHNIQUES,
      ...FASHION_KEYWORDS.ILLUSTRATOR,
      ...FASHION_KEYWORDS.GARMENTS,
      ...FASHION_KEYWORDS.MEASUREMENTS,
      ...FASHION_KEYWORDS.TOOLS
    ]
    
    const fashionMatches = words.filter(word => 
      allFashionKeywords.some(keyword => 
        word.includes(keyword) || keyword.includes(word)
      )
    ).length
    
    // Normalize by query length, but give bonus for multiple matches
    const baseScore = fashionMatches / words.length
    const bonusMultiplier = Math.min(1 + (fashionMatches * 0.1), 2)
    
    return Math.min(baseScore * bonusMultiplier, 1)
  }
  
  /**
   * Calculate score based on fashion question patterns
   */
  private static calculatePatternScore(query: string): number {
    const matchingPatterns = FASHION_QUESTION_PATTERNS.filter(pattern => 
      pattern.test(query)
    ).length
    
    // Each matching pattern adds to the score
    return Math.min(matchingPatterns * 0.3, 1)
  }
  
  /**
   * Extract meaningful words from query
   */
  private static extractWords(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2) // Ignore very short words
      .filter(word => !this.isStopWord(word))
  }
  
  /**
   * Check for explicit fashion terms that should always be considered relevant
   */
  private static containsExplicitFashionTerms(query: string): boolean {
    const explicitTerms = [
      'layers', 'layer', 'line weights', 'line weight', 'weights', 'weight',
      'pen tool', 'adobe illustrator', 'illustrator', 'technical flat',
      'fashion illustration', 'croquis', 'template', 'workflow',
      'dart', 'seam', 'bias', 'ease', 'draping', 'pattern', 'sewing',
      'bodice', 'sleeve', 'collar', 'hem', 'zipper', 'fitting',
      'course 101', 'course 201', 'course 301', 'ellu studios'
    ]
    
    const lowerQuery = query.toLowerCase()
    return explicitTerms.some(term => lowerQuery.includes(term))
  }

  /**
   * Check if word is a common stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
      'her', 'its', 'our', 'their', 'what', 'when', 'where', 'why', 'how'
    ]
    
    return stopWords.includes(word)
  }
  
  /**
   * Quick check for obvious fashion relevance
   */
  static isObviouslyFashionRelated(query: string): boolean {
    const result = this.analyzeRelevance(query)
    return result.confidence >= THRESHOLDS.HIGH_RELEVANCE && result.shouldUseRAG
  }
  
  /**
   * Quick check for greetings
   */
  static isSimpleGreeting(query: string): boolean {
    try {
      const cleanQuery = ValidationUtils.validateQuery(query).toLowerCase()
      return this.isGreeting(cleanQuery)
    } catch {
      return false
    }
  }
  
  /**
   * Get analytics about query classification
   */
  static getAnalytics(queries: string[]): {
    totalQueries: number
    fashionRelevant: number
    greetings: number
    irrelevant: number
    averageConfidence: number
  } {
    const results = queries.map(q => this.analyzeRelevance(q))
    
    return {
      totalQueries: queries.length,
      fashionRelevant: results.filter(r => r.isRelevant && r.shouldUseRAG).length,
      greetings: results.filter(r => r.isRelevant && !r.shouldUseRAG).length,
      irrelevant: results.filter(r => !r.isRelevant).length,
      averageConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    }
  }
}