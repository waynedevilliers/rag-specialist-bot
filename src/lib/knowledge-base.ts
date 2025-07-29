import { readFileSync } from 'fs'
import { join } from 'path'

export interface DocumentChunk {
  id: string
  content: string
  source: string
  section: string
  metadata: {
    title: string
    type: 'nextjs' | 'react' | 'troubleshooting'
    length: number
  }
}

export class KnowledgeBase {
  private chunks: DocumentChunk[] = []
  private isLoaded = false

  async loadDocuments(): Promise<void> {
    if (this.isLoaded) return

    const dataPath = join(process.cwd(), 'src', 'data')
    
    // Load Next.js documentation
    const nextjsContent = readFileSync(join(dataPath, 'nextjs-docs.md'), 'utf-8')
    const nextjsChunks = this.chunkDocument(nextjsContent, 'nextjs-docs.md', 'Next.js Documentation')
    
    // Load React documentation
    const reactContent = readFileSync(join(dataPath, 'react-docs.md'), 'utf-8')
    const reactChunks = this.chunkDocument(reactContent, 'react-docs.md', 'React Documentation')
    
    // Load troubleshooting guide
    const troubleshootingContent = readFileSync(join(dataPath, 'troubleshooting.md'), 'utf-8')
    const troubleshootingChunks = this.chunkDocument(troubleshootingContent, 'troubleshooting.md', 'Troubleshooting Guide')
    
    this.chunks = [...nextjsChunks, ...reactChunks, ...troubleshootingChunks]
    this.isLoaded = true
    
    console.log(`Loaded ${this.chunks.length} document chunks`)
  }

  private chunkDocument(content: string, source: string, title: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    const chunkSize = 1000
    const overlap = 200
    
    // Split by sections (headers)
    const sections = content.split(/(?=^#{1,3}\s)/gm).filter(section => section.trim())
    
    sections.forEach((section, sectionIndex) => {
      const sectionTitle = this.extractSectionTitle(section)
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
            type: this.getDocumentType(source),
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
              type: this.getDocumentType(source),
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

  private getDocumentType(source: string): 'nextjs' | 'react' | 'troubleshooting' {
    if (source.includes('nextjs')) return 'nextjs'
    if (source.includes('react')) return 'react'
    return 'troubleshooting'
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

  getChunksByType(type: 'nextjs' | 'react' | 'troubleshooting'): DocumentChunk[] {
    return this.chunks.filter(chunk => chunk.metadata.type === type)
  }

  searchChunks(query: string, limit: number = 10): DocumentChunk[] {
    const queryLower = query.toLowerCase()
    
    // Simple text-based search for now (will be enhanced with vector search)
    const scored = this.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase()
      const sectionLower = chunk.section.toLowerCase()
      
      let score = 0
      
      // Exact matches in section titles get high score
      if (sectionLower.includes(queryLower)) score += 10
      
      // Matches in content
      const contentMatches = (contentLower.match(new RegExp(queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
      score += contentMatches * 2
      
      // Keyword matching
      const queryWords = queryLower.split(/\s+/)
      queryWords.forEach(word => {
        if (contentLower.includes(word)) score += 1
        if (sectionLower.includes(word)) score += 2
      })
      
      return { chunk, score }
    })
    
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.chunk)
  }
}

// Singleton instance
export const knowledgeBase = new KnowledgeBase()