/**
 * Simple language detection utility
 * Optimized for German/English detection in fashion design context
 */

export type DetectedLanguage = 'de' | 'en' | 'auto'

export class LanguageDetector {
  // German fashion/technical terms frequently used in queries
  private static germanTerms = [
    // Basic German words
    'der', 'die', 'das', 'und', 'ist', 'ich', 'bin', 'wie', 'was', 'wo', 'wann', 'warum',
    'können', 'kann', 'könnt', 'soll', 'sollte', 'würde', 'möchte', 'haben', 'hat', 'bin',
    'zeigen', 'erklären', 'helfen', 'machen', 'nähen', 'schneiden',

    // Fashion/sewing specific German terms
    'stoff', 'nesselstoff', 'schneiderpuppe', 'abnäher', 'naht', 'saum', 'taille', 'hüfte',
    'ärmel', 'kragen', 'knopf', 'reißverschluss', 'futter', 'einlage', 'vlieseline',
    'drapieren', 'stecken', 'heften', 'versäubern', 'bügeln', 'zuschneiden',
    'grundschnitt', 'schnittmuster', 'schnittkonstruktion', 'maßnehmen',
    'vorderrock', 'hinterrock', 'seitennaht', 'webkante', 'fadenlauf',
    'illustrator', 'werkzeuge', 'ebene', 'ebenen', 'formatieren', 'schablone',
    'vorderansicht', 'rückansicht', 'beschriften', 'zusammenfassung',

    // Course specific terms
    'kurs', 'video', 'teil', 'lektion', 'schritt', 'anleitung', 'tutorial'
  ]

  // English indicators (less comprehensive since it's minority use case)
  private static englishTerms = [
    'the', 'and', 'is', 'how', 'what', 'where', 'when', 'why', 'can', 'could', 'should', 'would',
    'show', 'explain', 'help', 'make', 'sew', 'cut', 'pattern', 'fabric', 'draping', 'construction',
    'illustrator', 'tools', 'steps', 'tutorial', 'course', 'video', 'lesson'
  ]

  /**
   * Detect language from query text
   */
  static detectLanguage(query: string): DetectedLanguage {
    if (!query || query.trim().length === 0) {
      return 'auto'
    }

    const normalizedQuery = query.toLowerCase().trim()

    // Count German and English term matches
    let germanScore = 0
    let englishScore = 0

    // Check for German terms
    for (const term of this.germanTerms) {
      if (normalizedQuery.includes(term)) {
        germanScore += term.length // Longer terms get higher weight
      }
    }

    // Check for English terms
    for (const term of this.englishTerms) {
      if (normalizedQuery.includes(term)) {
        englishScore += term.length
      }
    }

    // Special patterns for German
    if (/\b(wie|was|wo|wann|warum)\b/i.test(normalizedQuery)) {
      germanScore += 10 // Question words are strong indicators
    }
    if (/\b(können|kann|könnt|soll|sollte)\b/i.test(normalizedQuery)) {
      germanScore += 8 // Modal verbs
    }
    if (/ß|ä|ö|ü/i.test(normalizedQuery)) {
      germanScore += 15 // German special characters are definitive
    }

    // Special patterns for English
    if (/\b(how|what|where|when|why)\s/i.test(normalizedQuery)) {
      englishScore += 10 // English question patterns
    }
    if (/\b(can|could|should|would)\s/i.test(normalizedQuery)) {
      englishScore += 8 // English modal patterns
    }

    console.log(`[Language Detection] Query: "${query.substring(0, 50)}..." | German: ${germanScore} | English: ${englishScore}`)

    // Decision logic
    if (germanScore > englishScore && germanScore > 3) {
      return 'de'
    } else if (englishScore > germanScore && englishScore > 3) {
      return 'en'
    } else {
      // Default to German since it's the primary language (99% of users)
      return 'de'
    }
  }

  /**
   * Get appropriate system prompt language instructions
   */
  static getLanguageInstructions(detectedLanguage: DetectedLanguage): string {
    switch (detectedLanguage) {
      case 'en':
        return `
IMPORTANT: The user asked their question in English. You must respond in English.
- Translate the German transcript content to English while preserving technical accuracy
- Keep German technical terms in parentheses when first mentioned, e.g., "muslin fabric (Nesselstoff)"
- Maintain the authentic German terminology alongside English translations
- Provide clear, natural English responses based on the German source material
        `
      case 'de':
        return `
IMPORTANT: The user asked their question in German. Respond in German.
- Use the original German transcript content directly
- Maintain authentic German technical terminology
- Provide natural, fluent German responses
        `
      case 'auto':
      default:
        return `
IMPORTANT: Since the primary users (99%) are German speakers, respond in German unless clearly indicated otherwise.
- Use the original German transcript content
- Maintain authentic German technical terminology
        `
    }
  }

  /**
   * Get language-specific response formatting instructions
   */
  static getResponseFormat(detectedLanguage: DetectedLanguage): string {
    const baseFormat = `
Always structure your response with:
1. Clear step-by-step instructions
2. Practical tips section
3. Common mistakes to avoid
4. Offer additional help

Be precise, professional, and educational.
    `

    if (detectedLanguage === 'en') {
      return baseFormat + `
Language: Respond in English with German technical terms explained.
Example: "Pin the fabric using the two-needle technique (Zweinadelsteckstich)..."
      `
    } else {
      return baseFormat + `
Language: Respond in German using authentic technical terminology.
      `
    }
  }
}