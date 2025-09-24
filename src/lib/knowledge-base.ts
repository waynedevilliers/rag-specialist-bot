import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { SecurityValidator, SecurityError } from './security-validator'
import { VTTParser } from './vtt-parser'

export interface DocumentChunk {
  id: string
  content: string
  source: string
  section: string
  metadata: {
    title: string
    type: 'pattern-making' | 'illustrator-fashion' | 'draping' | 'construction'
    courseNumber: string
    moduleNumber: string
    length: number
  }
}

export class KnowledgeBase {
  private chunks: DocumentChunk[] = []
  private isLoaded = false

  async loadDocuments(): Promise<void> {
    if (this.isLoaded) return

    // **SECURITY FIX**: Validate and secure file paths
    const dataPath = resolve(process.cwd(), 'src', 'data')
    
    // Whitelist of allowed files
    const allowedFiles = [
      'pattern-making-fundamentals.md',
      'draping-corrected-structure.md',
      'illustrator-fashion-design.md',
      'adobe-illustrator-corrected-structure.md',
      'klassische-schnittkonstruktion-corrected-structure.md',
      'klassische-schnittkonstruktion.md',
      'drapieren-transcripts.md'
    ]
    
    const courseConfigs = [
      { file: 'pattern-making-fundamentals.md', title: 'Classical Pattern Construction - Course 101', type: 'pattern-making' as const, courseNumber: '101' },
      { file: 'draping-corrected-structure.md', title: 'Draping Techniques - Course 201', type: 'draping' as const, courseNumber: '201' },
      { file: 'adobe-illustrator-corrected-structure.md', title: 'Adobe Illustrator for Fashion Design - Course 301', type: 'illustrator-fashion' as const, courseNumber: '301' },
      { file: 'klassische-schnittkonstruktion-corrected-structure.md', title: 'Klassische Schnittkonstruktion - Rock Grundschnitt (Course 101)', type: 'pattern-making' as const, courseNumber: '101' }
    ]
    
    const allChunks: DocumentChunk[] = []
    
    for (const config of courseConfigs) {
      try {
        // Validate file path security
        const filePath = join(dataPath, config.file)
        SecurityValidator.validateFilePath(filePath, dataPath)
        
        if (!allowedFiles.includes(config.file)) {
          throw new SecurityError(`File not in whitelist: ${config.file}`)
        }
        
        const content = readFileSync(filePath, 'utf-8')
        const chunks = this.chunkDocument(content, config.file, config.title, config.type, config.courseNumber)
        allChunks.push(...chunks)
        
      } catch (error) {
        console.error(`Failed to load ${config.file}:`, error instanceof SecurityError ? error.message : 'Unknown error')
        // Continue loading other files
      }
    }
    
    // Load transcript files from docs/transcripts
    const transcriptChunks = await this.loadTranscripts()
    allChunks.push(...transcriptChunks)

    this.chunks = allChunks
    this.isLoaded = true

    console.log(`Loaded ${this.chunks.length} fashion course document chunks (including ${transcriptChunks.length} transcript chunks)`)
  }

  private async loadTranscripts(): Promise<DocumentChunk[]> {
    const transcriptChunks: DocumentChunk[] = []

    try {
      const transcriptsPath = resolve(process.cwd(), 'docs', 'transcripts')

      // Define transcript directories and their course mappings
      const transcriptDirs = [
        { dir: 'Drapieren', courseType: 'draping' as const, courseNumber: '201' },
        { dir: 'klassische-schnittkonstruktion', courseType: 'pattern-making' as const, courseNumber: '101' },
        { dir: 'adobe-illustrator', courseType: 'illustrator-fashion' as const, courseNumber: '301' }
      ]

      for (const { dir, courseType, courseNumber } of transcriptDirs) {
        try {
          const dirPath = join(transcriptsPath, dir)
          const transcripts = VTTParser.parseDirectory(dirPath)

          for (const transcript of transcripts) {
            // Convert transcript to markdown for consistent chunking
            const markdownContent = VTTParser.toMarkdown(transcript)

            // Chunk the transcript content
            const chunks = this.chunkDocument(
              markdownContent,
              `${transcript.filename}.vtt`,
              transcript.title,
              courseType,
              courseNumber
            )

            transcriptChunks.push(...chunks)
          }

          console.log(`Loaded ${transcripts.length} transcripts from ${dir}`)
        } catch (error) {
          console.warn(`Could not load transcripts from ${dir}:`, error instanceof Error ? error.message : 'Unknown error')
        }
      }
    } catch (error) {
      console.warn('Could not load transcript directories:', error instanceof Error ? error.message : 'Unknown error')
    }

    return transcriptChunks
  }

  private chunkDocument(content: string, source: string, title: string, type: DocumentChunk['metadata']['type'], courseNumber: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    
    // Split by sections (headers)
    const sections = content.split(/(?=^#{1,3}\s)/gm).filter(section => section.trim())
    
    sections.forEach((section, sectionIndex) => {
      const sectionTitle = this.extractSectionTitle(section)
      const moduleNumber = this.extractModuleNumber(section)
      const sectionContent = section.trim()
      
      // Use semantic-aware chunking with dynamic sizing
      const sectionChunks = this.semanticChunking(sectionContent, sectionTitle, type)
      
      sectionChunks.forEach((chunk, chunkIndex) => {
        chunks.push({
          id: `${source}-${sectionIndex}-${chunkIndex}`,
          content: chunk,
          source,
          section: sectionTitle,
          metadata: {
            title,
            type,
            courseNumber,
            moduleNumber,
            length: chunk.length
          }
        })
      })
    })
    
    return chunks
  }

  private extractSectionTitle(section: string): string {
    const match = section.match(/^#{1,3}\s+(.+)$/m)
    return match ? match[1].trim() : 'Untitled Section'
  }

  private extractModuleNumber(section: string): string {
    // Extract module number from section title like "Module 1.1: Introduction to Pattern Making"
    const match = section.match(/^#{1,3}\s+Module\s+(\d+\.\d+):/m)
    if (match) return match[1]
    
    // If no module found in title, check content for module references
    const contentMatch = section.match(/Module\s+(\d+\.\d+)/m)
    return contentMatch ? contentMatch[1] : 'General'
  }

  private semanticChunking(content: string, sectionTitle: string, type: DocumentChunk['metadata']['type']): string[] {
    // Calculate optimal chunk size based on content characteristics
    const optimalChunkSize = this.calculateOptimalChunkSize(content, type)
    const minChunkSize = Math.floor(optimalChunkSize * 0.6)
    const maxChunkSize = Math.floor(optimalChunkSize * 1.4)
    
    // Extract semantic sections (subsections, lists, paragraphs)
    const semanticSections = this.extractSemanticSections(content)
    
    const chunks: string[] = []
    let currentChunk = ''
    let currentChunkSize = 0
    
    for (const section of semanticSections) {
      const sectionSize = section.content.length
      
      // If section fits in current chunk
      if (currentChunkSize + sectionSize <= maxChunkSize && currentChunk) {
        currentChunk += (currentChunk ? '\n\n' : '') + section.content
        currentChunkSize += sectionSize + (currentChunk ? 2 : 0)
      }
      // If current chunk is large enough, finalize it
      else if (currentChunkSize >= minChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = section.content
        currentChunkSize = sectionSize
      }
      // If section is too large, split it intelligently
      else if (sectionSize > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
          currentChunkSize = 0
        }
        
        const splitSections = this.splitLargeSection(section.content, optimalChunkSize)
        chunks.push(...splitSections)
      }
      // Start new chunk with this section
      else {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = section.content
        currentChunkSize = sectionSize
      }
    }
    
    // Add final chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    // Ensure we have at least one chunk
    if (chunks.length === 0) {
      chunks.push(content.trim())
    }
    
    return chunks
  }

  private calculateOptimalChunkSize(content: string, type: DocumentChunk['metadata']['type']): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const averageSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length
    
    // Calculate content complexity
    const complexity = this.calculateContentComplexity(content)
    
    // Base chunk size based on content type
    let baseSize = 1000
    switch (type) {
      case 'pattern-making':
        baseSize = 1200 // More technical content, larger chunks
        break
      case 'illustrator-fashion':
        baseSize = 800  // Visual content, smaller chunks
        break
      case 'draping':
        baseSize = 1000 // Hands-on content, medium chunks
        break  
      case 'construction':
        baseSize = 1100 // Step-by-step content, slightly larger chunks
        break
    }
    
    // Adjust based on sentence length and complexity
    const sizeAdjustment = Math.min(1.5, Math.max(0.7, averageSentenceLength / 50))
    const complexityAdjustment = Math.min(1.3, Math.max(0.8, complexity))
    
    return Math.round(baseSize * sizeAdjustment * complexityAdjustment)
  }

  private calculateContentComplexity(content: string): number {
    const words = content.split(/\s+/)
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size
    const totalWords = words.length
    
    // Vocabulary diversity
    const diversity = uniqueWords / totalWords
    
    // Technical term density
    const technicalTerms = words.filter(word => this.isFashionTechniqueTerm(word)).length
    const technicalDensity = technicalTerms / totalWords
    
    // List and structure indicators
    const listItems = (content.match(/^\s*[-*+]\s/gm) || []).length
    const structureScore = Math.min(1, listItems / 10)
    
    // Combine factors (0.5 to 1.5 range)
    return 0.5 + (diversity * 0.3) + (technicalDensity * 0.4) + (structureScore * 0.3)
  }

  private extractSemanticSections(content: string): Array<{ type: string, content: string }> {
    const sections: Array<{ type: string, content: string }> = []
    
    // Split content into logical units
    const parts = content.split(/\n\s*\n/).filter(part => part.trim())
    
    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      
      // Classify section type
      let sectionType = 'paragraph'
      
      if (trimmed.match(/^#{1,6}\s/)) {
        sectionType = 'header'
      } else if (trimmed.match(/^\s*[-*+]\s/m)) {
        sectionType = 'list'
      } else if (trimmed.match(/^\s*\d+\.\s/m)) {
        sectionType = 'numbered_list'
      } else if (trimmed.includes('```') || trimmed.includes('`')) {
        sectionType = 'code'
      } else if (trimmed.split('\n').length === 1 && trimmed.length < 200) {
        sectionType = 'short_paragraph'
      }
      
      sections.push({ type: sectionType, content: trimmed })
    }
    
    return sections
  }

  private splitLargeSection(content: string, targetSize: number): string[] {
    const chunks: string[] = []
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim())
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length + 1 <= targetSize * 1.2) {
        currentChunk += (currentChunk ? ' ' : '') + sentence
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = sentence
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }

  private splitTextIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = []
    let start = 0
    
    while (start < text.length) {
      let end = start + chunkSize
      
      // Try to break at a natural boundary (paragraph, sentence, or word)
      if (end < text.length) {
        const paragraph = text.lastIndexOf('\n\n', end)
        const sentence = text.lastIndexOf('. ', end)
        const word = text.lastIndexOf(' ', end)
        
        if (paragraph > start + chunkSize * 0.5) {
          end = paragraph + 2
        } else if (sentence > start + chunkSize * 0.5) {
          end = sentence + 2
        } else if (word > start + chunkSize * 0.5) {
          end = word + 1
        }
      }
      
      chunks.push(text.slice(start, end).trim())
      start = end - overlap
    }
    
    return chunks
  }

  getChunks(): DocumentChunk[] {
    return this.chunks
  }

  getChunksByType(type: 'pattern-making' | 'illustrator-fashion' | 'draping' | 'construction'): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.type === type)
  }

  getChunksByCourse(courseNumber: string): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.courseNumber === courseNumber)
  }

  getChunksByModule(moduleNumber: string): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.moduleNumber === moduleNumber)
  }

  searchChunksByContext(query: string, courseNumber?: string, moduleNumber?: string, limit: number = 10): DocumentChunk[] {
    let filteredChunks = this.chunks

    // Filter by course if specified
    if (courseNumber) {
      filteredChunks = filteredChunks.filter(chunk => chunk.metadata.courseNumber === courseNumber)
    }

    // Filter by module if specified
    if (moduleNumber) {
      filteredChunks = filteredChunks.filter(chunk => chunk.metadata.moduleNumber === moduleNumber)
    }

    // Perform search on filtered chunks
    return this.searchInChunks(query, filteredChunks, limit)
  }

  searchChunks(query: string, limit: number = 10): DocumentChunk[] {
    return this.searchInChunks(query, this.chunks, limit)
  }

  private searchInChunks(query: string, chunks: DocumentChunk[], limit: number): DocumentChunk[] {
    const queryLower = query.toLowerCase()
    
    // Enhanced search with fashion-specific term scoring
    const scored = chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase()
      const sectionLower = chunk.section.toLowerCase()
      
      let score = 0
      
      // Exact matches in section titles get high score
      if (sectionLower.includes(queryLower)) score += 15
      
      // Matches in content
      const contentMatches = (contentLower.match(new RegExp(queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      score += contentMatches * 3
      
      // Fashion-specific keyword matching with higher scores
      const queryWords = queryLower.split(/\s+/)
      queryWords.forEach(word => {
        // Higher scores for fashion technique terms
        if (this.isFashionTechniqueTerm(word)) {
          if (contentLower.includes(word)) score += 3
          if (sectionLower.includes(word)) score += 5
        } else {
          if (contentLower.includes(word)) score += 1
          if (sectionLower.includes(word)) score += 2
        }
      })
      
      // Boost score for relevant course types
      if (this.isRelevantCourseType(query, chunk.metadata.type)) score += 5
      
      return { chunk, score }
    })
    
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.chunk)
  }

  private isFashionTechniqueTerm(word: string): boolean {
    const fashionTerms = [
      'dart', 'seam', 'ease', 'draping', 'pattern', 'bias', 'grain', 'sleeve', 'bodice',
      'illustrator', 'flat', 'sketch', 'color', 'palette', 'swatch', 'repeat',
      'muslin', 'fitting', 'alteration', 'hem', 'zipper', 'button', 'collar',
      'measurement', 'yardage', 'fabric', 'cutting', 'layout', 'notch'
    ]
    return fashionTerms.includes(word.toLowerCase())
  }

  private isRelevantCourseType(query: string, courseType: string): boolean {
    const queryLower = query.toLowerCase()
    
    switch (courseType) {
      case 'pattern-making':
        return queryLower.includes('pattern') || queryLower.includes('measurement') || 
               queryLower.includes('ease') || queryLower.includes('seam')
      case 'illustrator-fashion':
        return queryLower.includes('illustrator') || queryLower.includes('flat') || 
               queryLower.includes('color') || queryLower.includes('sketch')
      case 'draping':
        return queryLower.includes('draping') || queryLower.includes('bias') || 
               queryLower.includes('muslin') || queryLower.includes('form')
      case 'construction':
        return queryLower.includes('sewing') || queryLower.includes('construction') || 
               queryLower.includes('fitting') || queryLower.includes('finish')
      default:
        return false
    }
  }
}

// Singleton instance
export const knowledgeBase = new KnowledgeBase()