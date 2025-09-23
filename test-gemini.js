// Direct test for Gemini API
const fs = require('fs');

// Load environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    envVars[key.trim()] = value.trim();
  }
});

const GOOGLE_API_KEY = envVars.GOOGLE_API_KEY;

async function testGemini() {
  console.log('🧪 Testing Google Gemini API');
  console.log('============================');
  
  if (!GOOGLE_API_KEY) {
    console.log('❌ GOOGLE_API_KEY not found in .env.local');
    return;
  }
  
  console.log(`🔑 API Key: ${GOOGLE_API_KEY.substring(0, 20)}...`);
  
  const modelName = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_API_KEY}`;
  
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Hello! Can you help me with fashion design? Just say "Yes, I can help with fashion design questions!" to test the connection.' }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    },
    systemInstruction: {
      parts: [{ text: 'You are a helpful fashion design assistant.' }]
    }
  };
  
  console.log(`🌐 Testing URL: ${url.split('?')[0]}?key=***`);
  console.log(`📝 Request: ${JSON.stringify(requestBody, null, 2)}`);
  
  try {
    console.log('\n⏳ Making API request...');
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      console.log('❌ API Error Response:');
      console.log(responseText);
      return;
    }
    
    const data = JSON.parse(responseText);
    console.log('\n✅ SUCCESS! Raw response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      console.log('\n💬 Generated Response:');
      console.log(`"${data.candidates[0].content.parts[0].text}"`);
      
      if (data.usageMetadata) {
        console.log('\n📈 Token Usage:');
        console.log(`  Prompt: ${data.usageMetadata.promptTokenCount || 'N/A'}`);
        console.log(`  Response: ${data.usageMetadata.candidatesTokenCount || 'N/A'}`);
        console.log(`  Total: ${data.usageMetadata.totalTokenCount || 'N/A'}`);
      }
      
      console.log('\n🎉 Gemini API is working correctly!');
    } else {
      console.log('⚠️  Unexpected response structure');
    }
    
  } catch (error) {
    console.log('❌ Request failed:');
    console.log(error.message);
    
    if (error.cause) {
      console.log('Cause:', error.cause);
    }
  }
}

// Run the test
testGemini().catch(console.error);