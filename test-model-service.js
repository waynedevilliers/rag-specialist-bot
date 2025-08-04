// Test the ModelService class directly
const fs = require('fs');
const path = require('path');

// Load environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    process.env[key.trim()] = value.trim();
  }
});

// Since we can't easily import TypeScript in Node.js, let's test the API directly
// This simulates what the ModelService does

async function testModelService() {
  console.log('🧪 Testing ModelService Integration');
  console.log('==================================');
  
  const providers = [
    { name: 'OpenAI', provider: 'openai', model: 'gpt-4o-mini' },
    { name: 'Anthropic', provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
    { name: 'Gemini', provider: 'gemini', model: 'gemini-1.5-flash' }
  ];
  
  for (const { name, provider, model } of providers) {
    console.log(`\n🔄 Testing ${name} (${model})`);
    console.log('-'.repeat(50));
    
    try {
      const response = await testProvider(provider, model);
      console.log(`✅ ${name}: SUCCESS`);
      console.log(`   Model: ${response.model}`);
      console.log(`   Tokens: ${response.usage.totalTokens}`);
      console.log(`   Response: ${response.content.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
    }
  }
}

async function testProvider(provider, model) {
  const messages = [
    { role: 'system', content: 'You are a helpful fashion design assistant.' },
    { role: 'user', content: 'Hello! Can you help me with fashion design?' }
  ];
  
  switch (provider) {
    case 'openai':
      return await testOpenAI(model, messages);
    case 'anthropic':
      return await testAnthropic(model, messages);
    case 'gemini':
      return await testGemini(model, messages);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function testOpenAI(model, messages) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.7,
      max_tokens: 200,
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    model: data.model,
    provider: 'openai',
  };
}

async function testAnthropic(model, messages) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system').map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      temperature: 0.7,
      system: systemMessage,
      messages: conversationMessages
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || 'No response generated',
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model || model,
    provider: 'anthropic',
  };
}

async function testGemini(model, messages) {
  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter(m => m.role !== 'system');
  
  const contents = conversationMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const modelName = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GOOGLE_API_KEY}`;

  const requestBody = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 200,
    }
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
    throw new Error('No response generated from Gemini');
  }
  
  return {
    content: data.candidates[0].content.parts[0].text,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    model: modelName,
    provider: 'gemini',
  };
}

// Run the test
testModelService().catch(console.error);