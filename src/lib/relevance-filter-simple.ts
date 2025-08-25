/**
 * Simplified Relevance Filter - Radical Simplification Approach
 * 
 * Philosophy: Stop trying to predict human language patterns.
 * Let the LLM do what it's good at - understanding natural language.
 */

import { ValidationUtils } from './validation-schemas'
import { SecurityValidator } from './security-validator'

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
 * Ultra-simplified relevance filter
 */
export class RelevanceFilter {
  
  /**
   * Simplified relevance analysis - let RAG handle almost everything
   */
  static analyzeRelevance(query: string): RelevanceResult {
    try {
      // Basic validation
      const cleanQuery = ValidationUtils.validateQuery(query).trim()
      
      // Only handle obvious security threats
      if (this.isObviousSecurityThreat(cleanQuery)) {
        return {
          isRelevant: false,
          confidence: 1.0,
          reasoning: 'Security threat detected',
          shouldUseRAG: false
        }
      }
      
      // Only handle super simple greetings for performance
      if (this.isSimpleGreeting(cleanQuery)) {
        return {
          isRelevant: true,
          confidence: 1.0,
          reasoning: 'Simple greeting detected - quick response',
          suggestedResponse: this.getGreetingResponse(),
          shouldUseRAG: false
        }
      }
      
      // Everything else goes to RAG with confidence
      // Let the LLM handle all the nuanced decisions
      return {
        isRelevant: true,
        confidence: 1.0,
        reasoning: 'Allowing RAG system to handle query with intelligent prompting',
        shouldUseRAG: true
      }
      
    } catch (error) {
      // Even validation failures go to RAG - let it handle gracefully
      return {
        isRelevant: true,
        confidence: 0.8,
        reasoning: 'Query validation failed - letting RAG system handle',
        shouldUseRAG: true
      }
    }
  }

  /**
   * Enhanced spell-checking version - also simplified
   */
  static analyzeRelevanceWithSpellCheck(query: string): RelevanceResult & { spellSuggestions?: string[] } {
    // For now, just use the simple version
    // Spell checking can be handled by the LLM naturally
    const result = this.analyzeRelevance(query)
    
    return {
      ...result,
      spellSuggestions: [] // LLM can handle spelling mistakes naturally
    }
  }

  /**
   * Check for obvious security threats only
   */
  private static isObviousSecurityThreat(query: string): boolean {
    const securityPatterns = [
      /ignore.*instructions/i,
      /system.*prompt/i,
      /roleplay.*as/i,
      /pretend.*you.*are/i,
      /forget.*everything/i
    ]
    
    return securityPatterns.some(pattern => pattern.test(query))
  }

  /**
   * Check for super simple greetings only
   */
  private static isSimpleGreeting(query: string): boolean {
    // Only match very short, obvious greetings
    const lowerQuery = query.toLowerCase()
    
    return /^(hi|hello|hey|hallo)$/.test(lowerQuery) ||
           /^(good\s+(morning|afternoon|evening))$/.test(lowerQuery) ||
           /^(guten\s+(tag|morgen|abend))$/.test(lowerQuery)
  }

  /**
   * Simple greeting response
   */
  private static getGreetingResponse(): string {
    const responses = [
      "Hello! I'm here to help you with fashion design, pattern making, and Adobe Illustrator techniques from ELLU Studios courses. What would you like to learn?",
      "Hi there! I can help you with fashion design questions, pattern construction, draping techniques, and Adobe Illustrator for fashion. How can I assist you?",
      "Good day! I'm your fashion design assistant for ELLU Studios courses. Feel free to ask about pattern making, draping, or digital fashion illustration!"
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * Quick check for simple greetings (for external use)
   */
  static isQuickGreeting(query: string): boolean {
    try {
      return this.isSimpleGreeting(ValidationUtils.validateQuery(query).trim())
    } catch {
      return false
    }
  }

  /**
   * Quick check for obvious fashion relevance (for external use)
   * This is intentionally very permissive
   */
  static isObviouslyFashionRelated(query: string): boolean {
    // Almost everything is considered potentially relevant
    // Let the RAG system make the nuanced decisions
    const result = this.analyzeRelevance(query)
    return result.shouldUseRAG
  }
}