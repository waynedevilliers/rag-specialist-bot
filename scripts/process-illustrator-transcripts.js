const fs = require('fs')
const path = require('path')

// Simple VTT parser for Adobe Illustrator transcripts
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
  const moduleMap = {
    'Intro': 'MODULE 1: INTRO',
    'Einfuhrung': 'MODULE 2: EINFÜHRUNG',
    'Grundlagen': 'MODULE 3: GRUNDLAGEN',
    'werkzeuge': 'MODULE 4.1: WERKZEUGE',
    'mit ebene arbeiten': 'MODULE 4.2: MIT EBENEN ARBEITEN',
    'formatieren': 'MODULE 5.1: FORMATIEREN',
    'schablone': 'MODULE 5.2: SCHABLONE',
    'vorderansicht': 'MODULE 5.3: VORDERANSICHT',
    'Kopieren und zusammenfügen': 'MODULE 5.4: KOPIEREN UND ZUSAMMENFÜGEN',
    'Rückansicht_Checkliste': 'MODULE 5.5: RÜCKANSICHT & CHECKLISTE',
    'beschriften': 'MODULE 6: BESCHRIFTEN',
    'zusammenfassung': 'MODULE 7: ZUSAMMENFASSUNG'
  }

  return moduleMap[filename] || `MODULE: ${filename.toUpperCase()}`
}

function extractMetadata(filename) {
  const moduleNumbers = {
    'Intro': '1',
    'Einfuhrung': '2',
    'Grundlagen': '3',
    'werkzeuge': '4.1',
    'mit ebene arbeiten': '4.2',
    'formatieren': '5.1',
    'schablone': '5.2',
    'vorderansicht': '5.3',
    'Kopieren und zusammenfügen': '5.4',
    'Rückansicht_Checkliste': '5.5',
    'beschriften': '6',
    'zusammenfassung': '7'
  }

  return {
    language: 'de',
    courseType: 'illustrator-fashion',
    moduleNumber: moduleNumbers[filename] || '0'
  }
}

function transcriptToDetailedMarkdown(transcript) {
  const { title, fullText, metadata, duration, cues } = transcript

  let markdown = `\n## ${title} - DETAILED TRANSCRIPT\n\n`
  markdown += `**Module**: ${metadata.moduleNumber}\n`
  markdown += `**Duration**: ${duration}\n`
  markdown += `**Instructor**: Luise from ELLU Studios\n\n`

  // Add full German transcript
  markdown += `### Complete German Transcript\n\n`
  markdown += `${fullText}\n\n`

  // Add timestamped sections for better chunking (every 10 cues or logical breaks)
  markdown += `### Timestamped Sections\n\n`

  const sectionSize = Math.max(5, Math.floor(cues.length / 4)) // Create 3-5 sections per video
  for (let i = 0; i < cues.length; i += sectionSize) {
    const sectionCues = cues.slice(i, i + sectionSize)
    const startTime = sectionCues[0].startTime
    const endTime = sectionCues[sectionCues.length - 1].endTime

    markdown += `#### ${startTime} - ${endTime}\n\n`

    const sectionText = sectionCues.map(cue => cue.text).join(' ')
    markdown += `${sectionText}\n\n`
  }

  // Extract key instructional phrases
  const instructions = extractInstructionalContent(fullText)
  if (instructions.length > 0) {
    markdown += `### Key Instructions (Schlüsselanweisungen)\n\n`
    instructions.forEach(instruction => {
      markdown += `- ${instruction}\n`
    })
    markdown += `\n`
  }

  return markdown
}

function extractInstructionalContent(text) {
  const instructionalPhrases = []
  const patterns = [
    /klick[st]?.+?(?=\.|$)/gi,
    /geh[st]?.+?(?=\.|$)/gi,
    /zieh[st]?.+?(?=\.|$)/gi,
    /wähl[st]?.+?(?=\.|$)/gi,
    /öffne[st]?.+?(?=\.|$)/gi,
    /erstell[st]?.+?(?=\.|$)/gi,
    /zeichne[st]?.+?(?=\.|$)/gi,
    /kopier[st]?.+?(?=\.|$)/gi,
    /spiegle[st]?.+?(?=\.|$)/gi
  ]

  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const clean = match.trim().replace(/\s+/g, ' ')
        if (clean.length > 10 && clean.length < 100) {
          instructionalPhrases.push(clean)
        }
      })
    }
  })

  return [...new Set(instructionalPhrases)].slice(0, 10) // Remove duplicates, limit to 10
}

// Main processing function
function processIllustratorTranscripts() {
  const transcriptsDir = path.join(__dirname, '../docs/transcripts/adobe-illustrator')
  const existingFile = path.join(__dirname, '../src/data/illustrator-fashion-design.md')
  const backupFile = path.join(__dirname, '../src/data/illustrator-fashion-design-backup.md')

  console.log('Processing Adobe Illustrator VTT transcripts...')

  // Create backup of existing file
  if (fs.existsSync(existingFile)) {
    fs.copyFileSync(existingFile, backupFile)
    console.log(`✅ Backup created: ${backupFile}`)
  }

  const files = fs.readdirSync(transcriptsDir)
  const vttFiles = files.filter(file => file.endsWith('.vtt'))

  console.log(`Found ${vttFiles.length} VTT files`)

  const transcripts = []

  // Process all VTT files
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

  // Sort transcripts by module order
  transcripts.sort((a, b) => {
    const getOrder = (filename) => {
      const orderMap = {
        'Intro': 1, 'Einfuhrung': 2, 'Grundlagen': 3, 'werkzeuge': 4,
        'mit ebene arbeiten': 5, 'formatieren': 6, 'schablone': 7,
        'vorderansicht': 8, 'Kopieren und zusammenfügen': 9,
        'Rückansicht_Checkliste': 10, 'beschriften': 11, 'zusammenfassung': 12
      }
      return orderMap[filename] || 99
    }

    return getOrder(a.filename) - getOrder(b.filename)
  })

  // Read existing content
  let existingContent = ''
  if (fs.existsSync(existingFile)) {
    existingContent = fs.readFileSync(existingFile, 'utf-8')
  }

  // Generate enhanced markdown with detailed transcripts
  let enhancedMarkdown = existingContent

  // Add section for detailed transcripts
  enhancedMarkdown += `\n\n# DETAILED VIDEO TRANSCRIPTS\n`
  enhancedMarkdown += `**Source**: Original German Video Transcripts from Luise (ELLU Studios)\n`
  enhancedMarkdown += `**Purpose**: Detailed instructional content for students watching videos\n`
  enhancedMarkdown += `**Total Transcripts**: ${transcripts.length} videos\n\n`

  // Add all detailed transcripts
  for (const transcript of transcripts) {
    enhancedMarkdown += transcriptToDetailedMarkdown(transcript)
  }

  // Add summary of all instructional content
  const allInstructions = new Set()
  transcripts.forEach(t => {
    extractInstructionalContent(t.fullText).forEach(instruction =>
      allInstructions.add(instruction)
    )
  })

  enhancedMarkdown += `\n## MASTER INSTRUCTION REFERENCE\n\n`
  enhancedMarkdown += `**All Key Instructions from Luise's Videos:**\n\n`
  Array.from(allInstructions).sort().forEach(instruction => {
    enhancedMarkdown += `- ${instruction}\n`
  })

  // Write enhanced file
  fs.writeFileSync(existingFile, enhancedMarkdown, 'utf-8')

  console.log(`\n✅ Enhanced knowledge base file: ${existingFile}`)
  console.log(`📊 Processed ${transcripts.length} transcript files`)
  console.log(`📝 Total enhanced content: ${enhancedMarkdown.length} characters`)
  console.log(`🎯 Added detailed instructional content from Luise's videos`)

  return {
    transcriptsProcessed: transcripts.length,
    outputFile: existingFile,
    backupFile: backupFile,
    contentLength: enhancedMarkdown.length,
    instructionsExtracted: allInstructions.size
  }
}

// Run the processing
if (require.main === module) {
  try {
    const result = processIllustratorTranscripts()
    console.log('\n🎉 Adobe Illustrator transcript integration complete!')
    console.log('Students can now get detailed help based on Luise\'s exact video instructions.')
    process.exit(0)
  } catch (error) {
    console.error('❌ Processing failed:', error)
    process.exit(1)
  }
}

module.exports = { processIllustratorTranscripts }