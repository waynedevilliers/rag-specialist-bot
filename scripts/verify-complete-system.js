const fs = require('fs')
const path = require('path')

// Comprehensive verification of all 3 courses
function verifyCompleteSystem() {
  console.log('🔍 Verifying Complete ELLU Studios RAG System...\n')

  const courses = [
    {
      id: '101',
      name: 'Classical Pattern Construction',
      germanName: 'Klassische Schnittkonstruktion',
      transcriptFile: 'klassische-schnittkonstruktion.md',
      expectedTerms: ['Rockgrundschnitt', 'Maßstabelle', 'Abnäher', 'Körpermaße', 'Fertigmaße']
    },
    {
      id: '201',
      name: 'Draping Techniques',
      germanName: 'Drapieren',
      transcriptFile: 'drapieren-transcripts.md',
      expectedTerms: ['Schneiderpuppe', 'Drapieren', 'Stoff vorbereiten', 'Hüftrundung', 'Übertragen']
    },
    {
      id: '301',
      name: 'Adobe Illustrator for Fashion',
      germanName: 'Technische Modezeichnung',
      transcriptFile: 'illustrator-fashion-design.md',
      expectedTerms: ['Zeichenfeder', 'Werkzeuge', 'technische Modezeichnung', 'Luise', 'Illustrator']
    }
  ]

  let systemStats = {
    totalCourses: courses.length,
    completeCourses: 0,
    totalContent: 0,
    totalTerms: 0,
    missingFiles: []
  }

  console.log('📚 COURSE-BY-COURSE VERIFICATION:\n')

  courses.forEach(course => {
    console.log(`## Course ${course.id}: ${course.name} (${course.germanName})`)

    const filePath = path.join(__dirname, '../src/data', course.transcriptFile)
    const fileExists = fs.existsSync(filePath)

    console.log(`   📁 Transcript file: ${fileExists ? '✅' : '❌'} ${course.transcriptFile}`)

    if (fileExists) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const words = content.split(/\s+/).length
      const chars = content.length

      console.log(`   📊 Content: ${words.toLocaleString()} words, ${chars.toLocaleString()} characters`)

      // Check for expected German terms
      const foundTerms = course.expectedTerms.filter(term =>
        content.toLowerCase().includes(term.toLowerCase())
      )

      console.log(`   🔤 German terms: ${foundTerms.length}/${course.expectedTerms.length} found`)
      foundTerms.forEach(term => console.log(`      ✅ ${term}`))

      const missingTerms = course.expectedTerms.filter(term =>
        !content.toLowerCase().includes(term.toLowerCase())
      )
      if (missingTerms.length > 0) {
        missingTerms.forEach(term => console.log(`      ❌ ${term}`))
      }

      systemStats.totalContent += chars
      systemStats.totalTerms += foundTerms.length

      if (foundTerms.length === course.expectedTerms.length) {
        systemStats.completeCourses++
        console.log(`   ✅ Course ${course.id} COMPLETE`)
      } else {
        console.log(`   🟡 Course ${course.id} PARTIAL`)
      }
    } else {
      systemStats.missingFiles.push(course.transcriptFile)
      console.log(`   ❌ Course ${course.id} MISSING`)
    }

    console.log('')
  })

  // Check knowledge base configuration
  console.log('⚙️  KNOWLEDGE BASE CONFIGURATION:\n')

  const kbConfigFile = path.join(__dirname, '../src/lib/knowledge-base.ts')
  const kbConfig = fs.readFileSync(kbConfigFile, 'utf-8')

  const requiredFiles = courses.map(c => c.transcriptFile)
  const configuredFiles = requiredFiles.filter(file => kbConfig.includes(file))

  console.log(`   📋 Files in whitelist: ${configuredFiles.length}/${requiredFiles.length}`)
  configuredFiles.forEach(file => console.log(`      ✅ ${file}`))

  const missingFromConfig = requiredFiles.filter(file => !kbConfig.includes(file))
  if (missingFromConfig.length > 0) {
    missingFromConfig.forEach(file => console.log(`      ❌ ${file} (not in knowledge-base.ts)`))
  }

  // System architecture check
  console.log('\n🏗️  SYSTEM ARCHITECTURE:\n')

  const architectureFile = path.join(__dirname, '../docs/SYSTEM_ARCHITECTURE.md')
  const architectureExists = fs.existsSync(architectureFile)

  console.log(`   📖 Architecture documentation: ${architectureExists ? '✅' : '❌'}`)

  if (architectureExists) {
    const archContent = fs.readFileSync(architectureFile, 'utf-8')
    const hasTranscriptFoundation = archContent.includes('TRANSCRIPTS ARE THE FOUNDATION')
    const hasVideoCompanion = archContent.includes('video companion assistant')

    console.log(`   🎯 Transcript foundation documented: ${hasTranscriptFoundation ? '✅' : '❌'}`)
    console.log(`   📹 Video companion concept documented: ${hasVideoCompanion ? '✅' : '❌'}`)
  }

  // Final system status
  console.log('\n🎉 FINAL SYSTEM STATUS:\n')

  const completionPercentage = Math.round((systemStats.completeCourses / systemStats.totalCourses) * 100)

  console.log(`   📊 Course completion: ${systemStats.completeCourses}/${systemStats.totalCourses} (${completionPercentage}%)`)
  console.log(`   📝 Total content: ${Math.round(systemStats.totalContent/1000)}K characters`)
  console.log(`   🔤 Total German terms verified: ${systemStats.totalTerms}`)
  console.log(`   ⚙️  Configuration status: ${missingFromConfig.length === 0 ? '✅ Complete' : '🟡 Needs update'}`)

  if (completionPercentage === 100 && missingFromConfig.length === 0) {
    console.log('\n🎊 SYSTEM STATUS: COMPLETE! 🎊')
    console.log('   All three courses have full transcript integration.')
    console.log('   Students can get detailed help based on video content.')
    console.log('   The transcript-based video companion system is fully operational!')
  } else if (completionPercentage >= 67) {
    console.log('\n✅ SYSTEM STATUS: MOSTLY COMPLETE')
    console.log('   Most courses have transcript integration.')
    console.log('   Minor configuration updates may be needed.')
  } else {
    console.log('\n🟡 SYSTEM STATUS: PARTIAL')
    console.log('   Some courses need transcript integration.')
  }

  // Return summary for potential automation
  return {
    completionPercentage,
    completeCourses: systemStats.completeCourses,
    totalCourses: systemStats.totalCourses,
    totalContent: systemStats.totalContent,
    configurationComplete: missingFromConfig.length === 0,
    missingFiles: systemStats.missingFiles,
    ready: completionPercentage === 100 && missingFromConfig.length === 0
  }
}

// Run verification
if (require.main === module) {
  try {
    const result = verifyCompleteSystem()

    console.log('\n📋 QUICK SUMMARY:')
    console.log(`   Courses ready: ${result.completeCourses}/${result.totalCourses}`)
    console.log(`   Content size: ${Math.round(result.totalContent/1000)}K chars`)
    console.log(`   System ready: ${result.ready ? 'YES! 🎉' : 'Not yet'}`)

    process.exit(result.ready ? 0 : 1)
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  }
}

module.exports = { verifyCompleteSystem }