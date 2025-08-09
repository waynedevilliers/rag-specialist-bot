#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🧪 Course Structure Validation Test Suite');
console.log('==========================================');

const testQuestions = {
  english: [
    'List all available courses',
    'What is covered in Course 201?',
    'Tell me about Adobe Illustrator course', 
    'How do I calculate ease in pattern making?',
    'What is muslin preparation?',
    'How do I create technical flats in Illustrator?',
    'What courses focus on draping techniques?',
    'Calculate fabric needed for a size 12 dress',
    'Show me a bodice draping tutorial',
    'Which course teaches pattern construction?'
  ],
  german: [
    'Liste alle verfügbaren Kurse auf',
    'Was wird in Kurs 201 behandelt?',
    'Erzähle mir über den Adobe Illustrator Kurs',
    'Wie berechne ich Mehrweite beim Schnittmuster?',
    'Was ist Muslin-Vorbereitung?',
    'Wie erstelle ich technische Zeichnungen in Illustrator?',
    'Welche Kurse konzentrieren sich auf Drapier-Techniken?',
    'Berechne den Stoffbedarf für ein Kleid Größe 12',
    'Zeige mir ein Oberteil-Drapier-Tutorial',
    'Welcher Kurs lehrt Schnittmuster-Konstruktion?'
  ]
};

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    return false;
  }
}

function main() {
  console.log('\n📋 Test Questions:');
  console.log('\nEnglish Questions:');
  testQuestions.english.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q}`);
  });
  
  console.log('\nGerman Questions:');
  testQuestions.german.forEach((q, i) => {
    console.log(`  ${i + 1}. ${q}`);
  });

  console.log('\n🔧 Running Course Structure Tests...');
  const structureTestsPassed = runCommand('npm run test:course-structure');
  
  if (structureTestsPassed) {
    console.log('✅ Course structure tests passed!');
    
    console.log('\n📊 Expected Course Structure:');
    console.log('  • Course 101: Classical Pattern Construction');
    console.log('  • Course 201: Draping Techniques');
    console.log('  • Course 301: Adobe Illustrator for Fashion Design');
    
    console.log('\n✅ Test Framework Setup Complete!');
    console.log('\n🚀 To manually test the bot with these questions:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:3000');
    console.log('   3. Test each question above');
    console.log('   4. Verify course numbers and content match expectations');
    
    return true;
  } else {
    console.log('❌ Course structure tests failed!');
    return false;
  }
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}