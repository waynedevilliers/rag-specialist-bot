import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { SecurityValidator, SecurityError } from './security-validator'

export interface VTTCue {
  startTime: string
  endTime: string
  text: string
  index: number
}

export interface ParsedTranscript {
  filename: string
  title: string
  cues: VTTCue[]
  fullText: string
  duration: string
  metadata: {
    language: 'de' | 'en'
    courseType: 'pattern-making' | 'draping' | 'illustrator-fashion' | 'construction'
    moduleNumber: string
    partNumber?: string
  }
}

export class VTTParser {

  /**
   * Parse a single VTT file
   */
  static parseVTTFile(filePath: string): ParsedTranscript {
    // Security validation
    SecurityValidator.validateFilePath(filePath)

    const content = readFileSync(filePath, 'utf-8')
    const filename = basename(filePath, '.vtt')

    return this.parseVTTContent(content, filename)
  }

  /**
   * Parse VTT content string
   */
  static parseVTTContent(content: string, filename: string): ParsedTranscript {
    const lines = content.split('\n')
    const cues: VTTCue[] = []

    // Validate VTT format
    if (!lines[0].trim().startsWith('WEBVTT')) {
      throw new Error(`Invalid VTT file format: ${filename}`)
    }

    let i = 1
    let cueIndex = 0

    while (i < lines.length) {
      const line = lines[i].trim()

      // Skip empty lines and comments
      if (!line || line.startsWith('NOTE')) {
        i++
        continue
      }

      // Check if this is a cue number (optional in VTT)
      const isNumber = /^\d+$/.test(line)
      if (isNumber) {
        i++
      }

      // Look for timestamp line
      const timestampLine = lines[i]?.trim()
      if (timestampLine && timestampLine.includes('-->')) {
        const [startTime, endTime] = timestampLine.split('-->').map(t => t.trim())

        // Collect text lines until next cue or end
        const textLines: string[] = []
        i++

        while (i < lines.length) {
          const textLine = lines[i].trim()

          // Stop if we hit an empty line (end of cue) or next timestamp
          if (!textLine || textLine.includes('-->')) {
            break
          }

          // Skip if it's a cue number
          if (!/^\d+$/.test(textLine)) {
            textLines.push(textLine)
          }
          i++
        }

        if (textLines.length > 0) {
          cues.push({
            startTime,
            endTime,
            text: textLines.join(' ').trim(),
            index: cueIndex++
          })
        }
      } else {
        i++
      }
    }

    const fullText = cues.map(cue => cue.text).join(' ')
    const lastCue = cues[cues.length - 1]
    const duration = lastCue ? lastCue.endTime : '00:00:00.000'

    return {
      filename,
      title: this.generateTitle(filename),
      cues,
      fullText,
      duration,
      metadata: this.extractMetadata(filename, fullText)
    }
  }

  /**
   * Parse all VTT files in a directory
   */
  static parseDirectory(dirPath: string): ParsedTranscript[] {
    SecurityValidator.validateFilePath(dirPath)

    const transcripts: ParsedTranscript[] = []

    try {
      const files = readdirSync(dirPath)

      for (const file of files) {
        const filePath = join(dirPath, file)
        const stat = statSync(filePath)

        if (stat.isFile() && extname(file).toLowerCase() === '.vtt') {
          try {
            const transcript = this.parseVTTFile(filePath)
            transcripts.push(transcript)
          } catch (error) {
            console.error(`Failed to parse VTT file ${file}:`, error)
          }
        }
      }
    } catch (error) {
      throw new SecurityError(`Cannot read directory: ${dirPath}`)
    }

    return transcripts.sort((a, b) => a.filename.localeCompare(b.filename))
  }

  /**
   * Generate a human-readable title from filename
   */
  private static generateTitle(filename: string): string {
    // Handle different naming patterns
    const patterns = [
      // RG_Konstruieren_GL1 -> Rock Grundschnitt Konstruieren - Grundlagen 1
      {
        regex: /RG_Konstruieren_GL(\d+)/,
        template: 'Rock Grundschnitt Konstruieren - Grundlagen $1'
      },
      // RG_Konstruieren_Teil1 -> Rock Grundschnitt Konstruieren - Teil 1
      {
        regex: /RG_Konstruieren_Teil(\d+)/,
        template: 'Rock Grundschnitt Konstruieren - Teil $1'
      },
      // Rock_GS_Konstruieren -> Rock Grundschnitt Konstruieren
      {
        regex: /Rock_GS_Konstruieren/,
        template: 'Rock Grundschnitt Konstruieren - Einleitung'
      },
      // Geschafft_Rock_GS_Konstruieren -> Rock Grundschnitt Abschluss
      {
        regex: /Geschafft_Rock_GS_Konstruieren/,
        template: 'Rock Grundschnitt Konstruieren - Abschluss'
      }
    ]

    for (const pattern of patterns) {
      const match = filename.match(pattern.regex)
      if (match) {
        return pattern.template.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)])
      }
    }

    // Fallback: clean up filename
    return filename
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  /**
   * Extract metadata from filename and content
   */
  private static extractMetadata(filename: string, content: string): ParsedTranscript['metadata'] {
    let courseType: ParsedTranscript['metadata']['courseType'] = 'construction'
    let moduleNumber = '1'
    let partNumber: string | undefined

    // Determine course type from filename and content
    if (filename.includes('RG_') || filename.includes('Rock') || content.includes('Rock')) {
      courseType = 'pattern-making'
    }

    // Extract module/part numbers
    const moduleMatch = filename.match(/(?:GL|Teil)(\d+)/)
    if (moduleMatch) {
      moduleNumber = moduleMatch[1]

      if (filename.includes('Teil')) {
        partNumber = moduleMatch[1]
        moduleNumber = '1' // All parts belong to main construction module
      } else if (filename.includes('GL')) {
        moduleNumber = moduleMatch[1]
      }
    }

    // Special cases
    if (filename.includes('Einleitung')) {
      moduleNumber = '0'
    } else if (filename.includes('Geschafft')) {
      moduleNumber = '99'
    }

    return {
      language: 'de', // These transcripts are in German
      courseType,
      moduleNumber,
      partNumber
    }
  }

  /**
   * Convert parsed transcript to markdown format
   */
  static toMarkdown(transcript: ParsedTranscript): string {
    const { title, fullText, metadata, duration, cues } = transcript

    const courseTitle = this.getCourseTitle(metadata.courseType)
    const courseNumber = this.getCourseNumber(metadata.courseType)

    let markdown = `# ${title}\n\n`
    markdown += `**Course**: ${courseTitle} (Course ${courseNumber})\n`
    markdown += `**Module**: ${metadata.moduleNumber}`
    if (metadata.partNumber) {
      markdown += ` - Part ${metadata.partNumber}`
    }
    markdown += `\n`
    markdown += `**Duration**: ${duration}\n`
    markdown += `**Language**: German (Original)\n\n`

    // Add full text
    markdown += `## Content\n\n`
    markdown += `${fullText}\n\n`

    // Add timestamped sections for better chunking
    markdown += `## Detailed Transcript\n\n`

    // Group cues into logical sections (every ~10 cues or major topic changes)
    const sectionSize = 10
    for (let i = 0; i < cues.length; i += sectionSize) {
      const sectionCues = cues.slice(i, i + sectionSize)
      const startTime = sectionCues[0].startTime
      const endTime = sectionCues[sectionCues.length - 1].endTime

      markdown += `### Section ${Math.floor(i / sectionSize) + 1} (${startTime} - ${endTime})\n\n`

      const sectionText = sectionCues.map(cue => cue.text).join(' ')
      markdown += `${sectionText}\n\n`
    }

    return markdown
  }

  private static getCourseTitle(courseType: ParsedTranscript['metadata']['courseType']): string {
    switch (courseType) {
      case 'pattern-making': return 'Klassische Schnittkonstruktion'
      case 'draping': return 'Draping Techniques'
      case 'illustrator-fashion': return 'Adobe Illustrator für Modedesign'
      case 'construction': return 'Garment Construction'
      default: return 'Fashion Design Course'
    }
  }

  private static getCourseNumber(courseType: ParsedTranscript['metadata']['courseType']): string {
    switch (courseType) {
      case 'pattern-making': return '101'
      case 'draping': return '201'
      case 'illustrator-fashion': return '301'
      case 'construction': return '401'
      default: return '100'
    }
  }

  /**
   * Convert timestamp to seconds for sorting/filtering
   */
  static timestampToSeconds(timestamp: string): number {
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
    if (!match) return 0

    const [, hours, minutes, seconds, milliseconds] = match
    return parseInt(hours) * 3600 +
           parseInt(minutes) * 60 +
           parseInt(seconds) +
           parseInt(milliseconds) / 1000
  }
}