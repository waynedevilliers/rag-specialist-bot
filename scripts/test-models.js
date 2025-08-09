// Test script for multi-model API integration
const { ModelService } = require('./src/lib/model-service.ts');

async function testModel(provider, model, testMessage = "What is 2+2? Please respond briefly.") {
  console.log(`\n🧪 Testing ${provider.toUpperCase()} - ${model}`);
  console.log(`Message: "${testMessage}"`);
  
  try {
    const service = new ModelService({
      provider,
      model,
      temperature: 0.3,
      maxTokens: 100
    });
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: testMessage }
    ];
    
    const startTime = Date.now();
    const response = await service.generateResponse(messages);
    const duration = Date.now() - startTime;
    
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`Model: ${response.model}`);
    console.log(`Provider: ${response.provider}`);
    console.log(`Tokens: ${response.usage.totalTokens} (${response.usage.promptTokens} + ${response.usage.completionTokens})`);
    console.log(`Response: ${response.content.substring(0, 200)}${response.content.length > 200 ? '...' : ''}`);
    
    return true;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing Multi-Model API Integration');
  console.log('=====================================');
  
  const tests = [
    // OpenAI tests
    ['openai', 'gpt-4o-mini'],
    ['openai', 'gpt-4o'],
    
    // Anthropic tests  
    ['anthropic', 'claude-3-5-sonnet-20241022'],
    ['anthropic', 'claude-3-haiku-20240307'],
    
    // Gemini tests
    ['gemini', 'gemini-1.5-flash'],
    ['gemini', 'gemini-1.5-pro'],
  ];
  
  let successCount = 0;
  let totalCount = tests.length;
  
  for (const [provider, model] of tests) {
    const success = await testModel(provider, model);
    if (success) successCount++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('===============');
  console.log(`✅ Successful: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 All models working correctly!');
  } else {
    console.log('⚠️  Some models had issues. Check API keys and quotas.');
  }
}

// Run the tests
runTests().catch(console.error);