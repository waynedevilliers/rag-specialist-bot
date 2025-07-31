import { readFileSync } from 'fs'
import { join } from 'path'

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

    const dataPath = join(process.cwd(), 'src', 'data')
    
    // Load Pattern Making Fundamentals (Course 101)
    const patternMakingContent = readFileSync(join(dataPath, 'pattern-making-fundamentals.md'), 'utf-8')
    const patternMakingChunks = this.chunkDocument(patternMakingContent, 'pattern-making-fundamentals.md', 'Pattern Making Fundamentals - Course 101', 'pattern-making', '101')
    
    // Load Illustrator for Fashion Design (Course 201)
    const illustratorContent = readFileSync(join(dataPath, 'illustrator-fashion-design.md'), 'utf-8')
    const illustratorChunks = this.chunkDocument(illustratorContent, 'illustrator-fashion-design.md', 'Adobe Illustrator for Fashion Design - Course 201', 'illustrator-fashion', '201')
    
    // Load Draping Techniques (Course 301)
    const drapingContent = readFileSync(join(dataPath, 'draping-techniques.md'), 'utf-8')
    const drapingChunks = this.chunkDocument(drapingContent, 'draping-techniques.md', 'Draping Techniques - Course 301', 'draping', '301')
    
    // Load Fashion Construction Methods (Course 401)
    const constructionContent = readFileSync(join(dataPath, 'fashion-construction-methods.md'), 'utf-8')
    const constructionChunks = this.chunkDocument(constructionContent, 'fashion-construction-methods.md', 'Fashion Construction Methods - Course 401', 'construction', '401')
    
    this.chunks = [...patternMakingChunks, ...illustratorChunks, ...drapingChunks, ...constructionChunks]
    this.isLoaded = true
    
    console.log(`Loaded ${this.chunks.length} fashion course document chunks`)
  }

  private chunkDocument(content: string, source: string, title: string, type: DocumentChunk['metadata']['type'], courseNumber: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    const chunkSize = 1000
    const overlap = 200
    
    // Split by sections (headers)
    const sections = content.split(/(?=^#{1,3}\s)/gm).filter(section => section.trim())
    
    sections.forEach((section, sectionIndex) => {
      const sectionTitle = this.extractSectionTitle(section)
      const moduleNumber = this.extractModuleNumber(section)
      const sectionContent = section.trim()
      
      if (sectionContent.length <= chunkSize) {
        // Section fits in one chunk
        chunks.push({
          id: `${source}-${sectionIndex}-0`,
          content: sectionContent,
          source,
          section: sectionTitle,
          metadata: {
            title,
            type,
            courseNumber,
            moduleNumber,
            length: sectionContent.length
          }
        })
      } else {
        // Split large sections into smaller chunks
        const sectionChunks = this.splitTextIntoChunks(sectionContent, chunkSize, overlap)
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
      }
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