// Simple test to verify environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Environment Variable Check');
console.log('=============================');

const apiKeys = {
  'OpenAI': process.env.OPENAI_API_KEY,
  'Anthropic': process.env.ANTHROPIC_API_KEY,
  'Google': process.env.GOOGLE_API_KEY
};

for (const [provider, key] of Object.entries(apiKeys)) {
  if (key) {
    console.log(`✅ ${provider}: ${key.substring(0, 20)}...${key.substring(key.length - 10)}`);
  } else {
    console.log(`❌ ${provider}: Not found`);
  }
}

console.log('\n📝 Raw .env.local contents:');
const fs = require('fs');
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log(envContent);
} catch (error) {
  console.log('❌ Could not read .env.local file');
}