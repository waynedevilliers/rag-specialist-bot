const fs = require('fs')
const path = require('path')

// Simple VTT parser for Drapieren transcripts
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
    title: generateModuleTitle(filename),
    cues,
    fullText,
    duration,
    metadata: extractMetadata(filename)
  }
}

function generateModuleTitle(filename) {
  const patterns = [
    {
      regex: /Einleitung_Drapieren_Grundschnitt/,
      template: 'Einleitung - Drapieren Grundschnitt Rock'
    },
    {
      regex: /RG_Drapieren_1_Teil(\d+)/,
      template: 'Modul 1 - Teil $1'
    },
    {
      regex: /RG_Drapieren_2_Teil(\d+)/,
      template: 'Modul 2 - Teil $1'
    },
    {
      regex: /RG_Drapieren_3_Teil(\d+)/,
      template: 'Modul 3 - Teil $1'
    },
    {
      regex: /Geschafft_GS_Drapieren/,
      template: 'Abschluss - Drapieren Zusammenfassung'
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

function extractMetadata(filename) {
  let moduleNumber = '1'
  let partNumber

  // Extract module and part numbers from filename
  if (filename.includes('Einleitung')) {
    moduleNumber = '0'
  } else if (filename.includes('Geschafft')) {
    moduleNumber = '99'
  } else {
    const moduleMatch = filename.match(/RG_Drapieren_(\d+)_Teil(\d+)/)
    if (moduleMatch) {
      moduleNumber = moduleMatch[1]
      partNumber = moduleMatch[2]
    }
  }

  return {
    language: 'de',
    courseType: 'draping',
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

  // Add full German transcript
  markdown += `### German Original\n\n${fullText}\n\n`

  // Add timestamped sections for better chunking
  if (cues.length > 5) {
    markdown += `### Detailed Instruction Sections\n\n`

    const sectionSize = Math.max(3, Math.floor(cues.length / 3))
    for (let i = 0; i < cues.length; i += sectionSize) {
      const sectionCues = cues.slice(i, i + sectionSize)
      const startTime = sectionCues[0].startTime
      const endTime = sectionCues[sectionCues.length - 1].endTime

      markdown += `#### ${startTime} - ${endTime}\n\n`

      const sectionText = sectionCues.map(cue => cue.text).join(' ')
      markdown += `${sectionText}\n\n`
    }
  }

  // Extract key draping terms
  const drapingTerms = extractDrapingTerms(fullText)
  if (drapingTerms.length > 0) {
    markdown += `### Key Draping Terms (Drapier-Begriffe)\n\n`
    drapingTerms.forEach(term => {
      markdown += `- ${term}\n`
    })
    markdown += `\n`
  }

  return markdown
}

function extractDrapingTerms(text) {
  const drapingTerms = [
    'Schneiderpuppe', 'Drapieren', 'Stoff vorbereiten', 'Abnäher', 'Seitennaht',
    'Hüftrundung', 'Taillenlinie', 'Rockgrundschnitt', 'Stoffbruch', 'Fadenlauf',
    'Hüftlinie', 'Grundschnitt', 'Passform', 'Seitenrundung', 'Stecken',
    'Einschneiden', 'Übertragen', 'Harmonisieren', 'Nahtzugabe', 'Kontrollieren'
  ]

  return drapingTerms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase())
  )
}

// Main processing function
function processDrapierenTranscripts() {
  const transcriptsDir = path.join(__dirname, '../docs/transcripts/Drapieren')
  const outputFile = path.join(__dirname, '../src/data/drapieren-transcripts.md')

  console.log('Processing Drapieren VTT transcripts from:', transcriptsDir)

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
      if (filename.includes('RG_Drapieren_1_Teil1')) return 1
      if (filename.includes('RG_Drapieren_1_Teil2')) return 2
      if (filename.includes('RG_Drapieren_1_Teil3')) return 3
      if (filename.includes('RG_Drapieren_1_Teil4')) return 4
      if (filename.includes('RG_Drapieren_2_Teil1')) return 5
      if (filename.includes('RG_Drapieren_2_Teil2')) return 6
      if (filename.includes('RG_Drapieren_2_Teil3')) return 7
      if (filename.includes('RG_Drapieren_2_Teil4')) return 8
      if (filename.includes('RG_Drapieren_3_Teil1')) return 9
      if (filename.includes('RG_Drapieren_3_Teil2')) return 10
      if (filename.includes('RG_Drapieren_3_Teil3')) return 11
      if (filename.includes('Geschafft')) return 12
      return 99
    }

    return getOrder(a.filename) - getOrder(b.filename)
  })

  // Generate markdown document
  let markdown = `# Drapieren - Rock Grundschnitt\n\n`
  markdown += `**Course 201**: Draping Techniques\n`
  markdown += `**Focus**: Rock (Skirt) Draping using dress form\n`
  markdown += `**Language**: German (Original Video Transcripts)\n`
  markdown += `**Total Modules**: ${transcripts.length}\n\n`

  markdown += `## Course Overview\n\n`
  markdown += `This course teaches draping techniques for creating a basic skirt pattern directly on a dress form (Schneiderpuppe). Students learn hands-on draping methods, fabric preparation, and pattern transfer techniques using traditional German draping methods.\n\n`

  markdown += `## Learning Progression\n\n`
  markdown += `**Module 1**: Fabric preparation and basic draping setup\n`
  markdown += `**Module 2**: Advanced draping - darts and side curves\n`
  markdown += `**Module 3**: Pattern transfer and finalization\n\n`

  // Add all transcripts
  for (const transcript of transcripts) {
    markdown += transcriptToMarkdown(transcript)
  }

  // Add summary section
  markdown += `## Course Summary\n\n`
  markdown += `The Drapieren course covers:\n\n`
  markdown += `1. **Fabric Preparation** (Stoff vorbereiten) - Pre-treatment and cutting\n`
  markdown += `2. **Dress Form Setup** - Proper positioning and pinning techniques\n`
  markdown += `3. **Basic Draping** - Front and back skirt draping\n`
  markdown += `4. **Advanced Techniques** - Darts, side curves, and fitting\n`
  markdown += `5. **Pattern Transfer** - Moving from draped form to paper pattern\n`
  markdown += `6. **Harmonization** - Final adjustments and quality control\n\n`

  markdown += `## Key German Draping Terms\n\n`
  const allDrapingTerms = new Set()
  transcripts.forEach(t => {
    extractDrapingTerms(t.fullText).forEach(term => allDrapingTerms.add(term))
  })

  Array.from(allDrapingTerms).sort().forEach(term => {
    markdown += `- **${term}**\n`
  })

  // Write to file
  fs.writeFileSync(outputFile, markdown, 'utf-8')

  console.log(`\n✅ Generated draping knowledge base file: ${outputFile}`)
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
    const result = processDrapierenTranscripts()
    process.exit(0)
  } catch (error) {
    console.error('❌ Processing failed:', error)
    process.exit(1)
  }
}

module.exports = { processDrapierenTranscripts }