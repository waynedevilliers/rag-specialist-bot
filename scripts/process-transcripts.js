const fs = require('fs')
const path = require('path')

// Simple VTT parser for Node.js script
function parseVTT(content, filename) {
  const lines = content.split('\n')
  const cues = []

  if (!lines[0].trim().startsWith('WEBVTT')) {
    throw new Error(`Invalid VTT file format: ${filename}`)
  }

  let i = 1
  let cueIndex = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line || line.startsWith('NOTE')) {
      i++
      continue
    }

    const isNumber = /^\d+$/.test(line)
    if (isNumber) {
      i++
    }

    const timestampLine = lines[i]?.trim()
    if (timestampLine && timestampLine.includes('-->')) {
      const [startTime, endTime] = timestampLine.split('-->').map(t => t.trim())

      const textLines = []
      i++

      while (i < lines.length) {
        const textLine = lines[i].trim()

        if (!textLine || textLine.includes('-->')) {
          break
        }

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
    title: generateTitle(filename),
    cues,
    fullText,
    duration,
    metadata: extractMetadata(filename, fullText)
  }
}

function generateTitle(filename) {
  const patterns = [
    {
      regex: /RG_Konstruieren_GL(\d+)/,
      template: 'Grundlagen $1 - Maßstabelle und Vorbereitung'
    },
    {
      regex: /RG_Konstruieren_Teil(\d+)/,
      template: 'Rock Grundschnitt Konstruieren - Teil $1'
    },
    {
      regex: /Rock_GS_Konstruieren.*Einleitung/,
      template: 'Rock Grundschnitt Konstruieren - Einleitung'
    },
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

  return filename
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function extractMetadata(filename, content) {
  let moduleNumber = '1'
  let partNumber

  const moduleMatch = filename.match(/(?:GL|Teil)(\d+)/)
  if (moduleMatch) {
    moduleNumber = moduleMatch[1]

    if (filename.includes('Teil')) {
      partNumber = moduleMatch[1]
    }
  }

  if (filename.includes('Einleitung')) {
    moduleNumber = '0'
  } else if (filename.includes('Geschafft')) {
    moduleNumber = '99'
  }

  return {
    language: 'de',
    courseType: 'pattern-making',
    moduleNumber,
    partNumber
  }
}

function transcriptToMarkdown(transcript) {
  const { title, fullText, metadata, duration, cues } = transcript

  let markdown = `## ${title}\n\n`
  markdown += `**Module**: ${metadata.moduleNumber}`
  if (metadata.partNumber) {
    markdown += ` - Part ${metadata.partNumber}`
  }
  markdown += `\n`
  markdown += `**Duration**: ${duration}\n\n`

  // Add full text
  markdown += `### German Original\n\n${fullText}\n\n`

  // Add key concepts section based on content analysis
  const keyTerms = extractKeyTerms(fullText)
  if (keyTerms.length > 0) {
    markdown += `### Key Concepts (Schlüsselkonzepte)\n\n`
    keyTerms.forEach(term => {
      markdown += `- ${term}\n`
    })
    markdown += `\n`
  }

  return markdown
}

function extractKeyTerms(text) {
  const fashionTerms = [
    'Rockgrundschnitt', 'Grundschnitt', 'Maßstabelle', 'Taillenlinie', 'Hüftlinie',
    'Seitennähte', 'Abnäher', 'Konstruieren', 'Schnittmuster', 'Packpapier',
    'Nahtzugabe', 'Saum', 'Rundung', 'Taille', 'Hüfte', 'Körpermaße',
    'Zentimeter', 'Millimeter', 'Papier', 'Lineal', 'Konstruktion'
  ]

  return fashionTerms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase())
  )
}

// Main processing function
function processTranscripts() {
  const transcriptsDir = path.join(__dirname, '../docs/transcripts/klassische-schnittkonstruktion')
  const outputFile = path.join(__dirname, '../src/data/klassische-schnittkonstruktion.md')

  console.log('Processing VTT transcripts from:', transcriptsDir)

  const files = fs.readdirSync(transcriptsDir)
  const vttFiles = files.filter(file => file.endsWith('.vtt'))

  console.log(`Found ${vttFiles.length} VTT files`)

  const transcripts = []

  for (const file of vttFiles) {
    try {
      const filePath = path.join(transcriptsDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const filename = path.basename(file, '.vtt')

      const transcript = parseVTT(content, filename)
      transcripts.push(transcript)

      console.log(`✓ Processed: ${file} -> ${transcript.title}`)
    } catch (error) {
      console.error(`✗ Failed to process ${file}:`, error.message)
    }
  }

  // Sort transcripts by logical order
  transcripts.sort((a, b) => {
    const getOrder = (filename) => {
      if (filename.includes('Einleitung')) return 0
      if (filename.includes('GL1')) return 1
      if (filename.includes('GL2')) return 2
      if (filename.includes('Teil1')) return 3
      if (filename.includes('Teil2')) return 4
      if (filename.includes('Teil3')) return 5
      if (filename.includes('Teil4')) return 6
      if (filename.includes('Teil5')) return 7
      if (filename.includes('Teil6')) return 8
      if (filename.includes('Teil7')) return 9
      if (filename.includes('Geschafft')) return 10
      return 99
    }

    return getOrder(a.filename) - getOrder(b.filename)
  })

  // Generate markdown document
  let markdown = `# Klassische Schnittkonstruktion - Rock Grundschnitt\n\n`
  markdown += `**Course 101**: Classical Pattern Construction\n`
  markdown += `**Focus**: Rock (Skirt) Basic Pattern Construction\n`
  markdown += `**Language**: German (Original Video Transcripts)\n`
  markdown += `**Total Modules**: ${transcripts.length}\n\n`

  markdown += `## Course Overview\n\n`
  markdown += `This course teaches classical pattern construction methods for creating a basic skirt pattern (Rockgrundschnitt). Students learn to work with measurement tables, construct patterns on paper, and understand the fundamental principles of German pattern making.\n\n`

  // Add all transcripts
  for (const transcript of transcripts) {
    markdown += transcriptToMarkdown(transcript)
  }

  // Add summary section
  markdown += `## Course Summary\n\n`
  markdown += `The klassische Schnittkonstruktion course covers:\n\n`
  markdown += `1. **Interactive Measurement Table** (Interaktive Maßstabelle) - Digital tools for calculating pattern measurements\n`
  markdown += `2. **Pattern Construction Basics** - Setting up paper, tools, and workspace\n`
  markdown += `3. **Step-by-Step Construction** - Detailed construction of the skirt basic pattern\n`
  markdown += `4. **Technical Details** - Seam allowances, darts, and finishing techniques\n`
  markdown += `5. **Quality Control** - Checking measurements and pattern accuracy\n\n`

  markdown += `## Key German Fashion Terms\n\n`
  const allKeyTerms = new Set()
  transcripts.forEach(t => {
    extractKeyTerms(t.fullText).forEach(term => allKeyTerms.add(term))
  })

  Array.from(allKeyTerms).sort().forEach(term => {
    markdown += `- **${term}**\n`
  })

  // Write to file
  fs.writeFileSync(outputFile, markdown, 'utf-8')

  console.log(`\n✅ Generated knowledge base file: ${outputFile}`)
  console.log(`📊 Processed ${transcripts.length} transcripts`)
  console.log(`📝 Total content: ${markdown.length} characters`)

  return {
    transcriptsProcessed: transcripts.length,
    outputFile,
    contentLength: markdown.length
  }
}

// Run the processing
if (require.main === module) {
  try {
    const result = processTranscripts()
    process.exit(0)
  } catch (error) {
    console.error('❌ Processing failed:', error)
    process.exit(1)
  }
}

module.exports = { processTranscripts }