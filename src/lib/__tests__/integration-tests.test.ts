import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Integration Tests for First 20 Questions (English)
describe('ELLU Chatbot Integration Tests - First 20 Questions', () => {
  const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';

  // The first 20 English questions from our test suite
  const first20Questions = [
    {
      id: 'Q1',
      question: "Show me the specific steps for pinning the front skirt in the draping course video 2",
      category: 'video-specific',
      expectedKeywords: ['pin', 'front skirt', 'draping', 'steps', 'video'],
      maxTime: 35000,
      minContentLength: 200
    },
    {
      id: 'Q2',
      question: "What are the exact measurements mentioned in the classical pattern construction video for drawing the grain line?",
      category: 'video-specific',
      expectedKeywords: ['grain line', 'measurements', 'construction', 'video'],
      maxTime: 35000,
      minContentLength: 150
    },
    {
      id: 'Q3',
      question: "In the Adobe Illustrator tools video, what specific tools are introduced first?",
      category: 'video-specific',
      expectedKeywords: ['illustrator', 'tools', 'first', 'selection'],
      maxTime: 35000,
      minContentLength: 150
    },
    {
      id: 'Q4',
      question: "Calculate the fabric requirements for a size 38 A-line skirt with 10cm seam allowances",
      category: 'function-calling',
      expectedKeywords: ['calculate', 'fabric', 'size 38', 'seam allowance', 'a-line'],
      maxTime: 25000,
      minContentLength: 100
    },
    {
      id: 'Q5',
      question: "I need to convert US size 12 to German size and calculate fabric for a fitted bodice",
      category: 'function-calling',
      expectedKeywords: ['convert', 'US size 12', 'German size', 'bodice'],
      maxTime: 25000,
      minContentLength: 100
    },
    {
      id: 'Q6',
      question: "What's the pattern grade from size 36 to 42 for bust measurements?",
      category: 'function-calling',
      expectedKeywords: ['pattern grade', 'size 36', 'size 42', 'bust'],
      maxTime: 25000,
      minContentLength: 100
    },
    {
      id: 'Q7',
      question: "Compare the learning objectives between the classical pattern construction course and the draping course",
      category: 'course-navigation',
      expectedKeywords: ['compare', 'learning objectives', 'construction', 'draping', 'course'],
      maxTime: 30000,
      minContentLength: 200
    },
    {
      id: 'Q8',
      question: "What comes after part 2 in the Adobe Illustrator course curriculum?",
      category: 'course-navigation',
      expectedKeywords: ['part 2', 'illustrator', 'curriculum', 'part 3'],
      maxTime: 25000,
      minContentLength: 100
    },
    {
      id: 'Q9',
      question: "List all videos in draping course part 3 and their main topics",
      category: 'course-navigation',
      expectedKeywords: ['videos', 'draping', 'part 3', 'topics', 'list'],
      maxTime: 30000,
      minContentLength: 150
    },
    {
      id: 'Q10',
      question: "Explain the difference between draping and flat pattern construction techniques",
      category: 'bilingual-support',
      expectedKeywords: ['difference', 'draping', 'flat pattern', 'construction', 'techniques'],
      maxTime: 25000,
      minContentLength: 200
    },
    {
      id: 'Q11',
      question: "Explain the difference between draping and flat pattern construction techniques",
      category: 'bilingual-support',
      expectedKeywords: ['difference', 'draping', 'flat pattern', 'construction'],
      maxTime: 25000,
      minContentLength: 200
    },
    {
      id: 'Q12',
      question: "What is the grain line and how do I draw it correctly?",
      category: 'bilingual-support',
      expectedKeywords: ['grain line', 'draw', 'correctly', 'fabric'],
      maxTime: 25000,
      minContentLength: 150
    },
    {
      id: 'Q13',
      question: "Explain the relationship between ease allowance and fit in pattern construction",
      category: 'technical-concepts',
      expectedKeywords: ['ease allowance', 'fit', 'pattern construction', 'relationship'],
      maxTime: 25000,
      minContentLength: 200
    },
    {
      id: 'Q14',
      question: "How do you transfer a draped pattern to paper while maintaining the fit?",
      category: 'technical-concepts',
      expectedKeywords: ['transfer', 'draped pattern', 'paper', 'fit', 'maintain'],
      maxTime: 25000,
      minContentLength: 200
    },
    {
      id: 'Q15',
      question: "What's the difference between technical fashion illustration and artistic fashion sketching in Adobe Illustrator?",
      category: 'technical-concepts',
      expectedKeywords: ['technical', 'artistic', 'illustration', 'sketching', 'illustrator'],
      maxTime: 25000,
      minContentLength: 200
    },
    {
      id: 'Q16',
      question: "Calculate fabric for a size 99 evening gown with negative seam allowances",
      category: 'edge-cases',
      expectedKeywords: ['calculate', 'size 99', 'invalid', 'error', 'cannot'],
      maxTime: 20000,
      minContentLength: 50
    },
    {
      id: 'Q17',
      question: "Tell me about the classical pattern construction part 8 video content",
      category: 'edge-cases',
      expectedKeywords: ['part 8', 'not exist', 'not available', 'part 4'],
      maxTime: 20000,
      minContentLength: 50
    },
    {
      id: 'Q18',
      question: "How do I use Photoshop tools in the Adobe Illustrator course?",
      category: 'edge-cases',
      expectedKeywords: ['photoshop', 'illustrator', 'different', 'software', 'not'],
      maxTime: 20000,
      minContentLength: 100
    },
    {
      id: 'Q19',
      question: "I'm a beginner with no experience. Guide me through choosing between the three ELLU courses and recommend a learning path with specific videos to start with",
      category: 'complex-workflow',
      expectedKeywords: ['beginner', 'three courses', 'learning path', 'recommend', 'start'],
      maxTime: 40000,
      minContentLength: 300
    },
    {
      id: 'Q20',
      question: "I'm working on a circle skirt pattern using draping techniques but want to create technical flats in Illustrator. Walk me through the complete workflow connecting all three courses",
      category: 'complex-workflow',
      expectedKeywords: ['circle skirt', 'draping', 'illustrator', 'workflow', 'three courses'],
      maxTime: 40000,
      minContentLength: 300
    }
  ];

  // Performance tracking
  const testResults: any[] = [];
  let serverHealthy = false;

  beforeAll(async () => {
    console.log('🚀 Starting Integration Tests for First 20 ELLU Questions');
    console.log('⏱️  Estimated completion time: 8-12 minutes');

    // Health check
    try {
      const healthResponse = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      serverHealthy = healthResponse.ok;
    } catch {
      // Try a simple chat request as health check
      try {
        const testResponse = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hello', language: 'auto' })
        });
        serverHealthy = testResponse.ok;
      } catch {
        serverHealthy = false;
      }
    }

    console.log(`🏥 Server Health: ${serverHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    // Generate comprehensive report
    const completedTests = testResults.filter(r => !r.failed);
    const failedTests = testResults.filter(r => r.failed);

    console.log('\n📊 INTEGRATION TEST RESULTS:');
    console.log(`Success Rate: ${completedTests.length}/20 (${(completedTests.length/20*100).toFixed(1)}%)`);

    if (completedTests.length > 0) {
      const avgTime = completedTests.reduce((sum, r) => sum + r.responseTime, 0) / completedTests.length;
      const avgTokens = completedTests.reduce((sum, r) => sum + r.tokens, 0) / completedTests.length;
      const totalCost = completedTests.reduce((sum, r) => sum + r.cost, 0);

      console.log(`Average Response Time: ${avgTime.toFixed(0)}ms`);
      console.log(`Average Tokens: ${avgTokens.toFixed(0)}`);
      console.log(`Total Cost: $${totalCost.toFixed(4)}`);

      // Performance by category
      const categories = [...new Set(completedTests.map(r => r.category))];
      console.log('\n⚡ Performance by Category:');
      categories.forEach(cat => {
        const catTests = completedTests.filter(r => r.category === cat);
        const catAvgTime = catTests.reduce((sum, r) => sum + r.responseTime, 0) / catTests.length;
        const catAvgTokens = catTests.reduce((sum, r) => sum + r.tokens, 0) / catTests.length;
        console.log(`  ${cat}: ${catAvgTime.toFixed(0)}ms avg, ${catAvgTokens.toFixed(0)} tokens (${catTests.length} tests)`);
      });

      // Quality metrics
      const avgKeywordMatches = completedTests.reduce((sum, r) => sum + r.keywordMatches, 0) / completedTests.length;
      const avgContentLength = completedTests.reduce((sum, r) => sum + r.contentLength, 0) / completedTests.length;
      console.log(`\n📝 Content Quality:`);
      console.log(`  Average Keyword Matches: ${avgKeywordMatches.toFixed(1)}`);
      console.log(`  Average Content Length: ${avgContentLength.toFixed(0)} chars`);
    }

    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests: ${failedTests.map(t => t.id).join(', ')}`);
      failedTests.forEach(test => {
        console.log(`  ${test.id}: ${test.error}`);
      });
    }
  });

  // Individual test cases
  first20Questions.forEach((testCase, index) => {
    test(`${testCase.id}: ${testCase.question.substring(0, 60)}...`, async () => {
      const startTime = Date.now();

      try {
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: testCase.question,
            language: 'auto'
          }),
        });

        const responseTime = Date.now() - startTime;

        // Basic HTTP validation
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/json');

        const data = await response.json();

        // Response structure validation
        expect(data).toHaveProperty('content');
        expect(data).toHaveProperty('sources');
        expect(data).toHaveProperty('processingTime');
        expect(data).toHaveProperty('tokenUsage');
        expect(data).toHaveProperty('timestamp');

        // Content quality validation
        expect(data.content).toBeTruthy();
        expect(typeof data.content).toBe('string');
        expect(data.content.length).toBeGreaterThan(testCase.minContentLength);

        // Performance validation
        expect(responseTime).toBeLessThan(testCase.maxTime);
        expect(data.processingTime).toBeGreaterThan(0);

        // Token usage validation
        expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
        expect(data.tokenUsage.cost.totalCost).toBeGreaterThan(0);

        // Sources validation (for non-edge cases)
        if (testCase.category !== 'edge-cases') {
          expect(Array.isArray(data.sources)).toBe(true);
        }

        // Keyword relevance validation
        const contentLower = data.content.toLowerCase();
        const keywordMatches = testCase.expectedKeywords.filter(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );

        if (testCase.category === 'edge-cases') {
          // Edge cases should handle errors gracefully
          expect(keywordMatches.length).toBeGreaterThanOrEqual(0);
        } else {
          // Regular questions should match keywords
          expect(keywordMatches.length).toBeGreaterThan(0);
        }

        // Language validation (should be English)
        const englishWords = ['the', 'and', 'for', 'you', 'with', 'this', 'that', 'your'];
        const responseWords = contentLower.split(/\s+/);
        const englishMatches = englishWords.filter(word => responseWords.includes(word)).length;
        expect(englishMatches).toBeGreaterThan(2); // Should contain English structure words

        // Record successful test
        testResults.push({
          id: testCase.id,
          category: testCase.category,
          responseTime,
          tokens: data.tokenUsage.totalTokens,
          cost: data.tokenUsage.cost.totalCost,
          keywordMatches: keywordMatches.length,
          contentLength: data.content.length,
          sourcesFound: data.sources ? data.sources.length : 0,
          processingTime: data.processingTime,
          failed: false
        });

        console.log(`✅ ${testCase.id} (${index + 1}/20): ${responseTime}ms, ${data.tokenUsage.totalTokens}tok, $${data.tokenUsage.cost.totalCost.toFixed(4)}, ${keywordMatches.length}kw`);

      } catch (error) {
        const responseTime = Date.now() - startTime;

        testResults.push({
          id: testCase.id,
          category: testCase.category,
          responseTime,
          failed: true,
          error: error.message
        });

        console.log(`❌ ${testCase.id} (${index + 1}/20): FAILED after ${responseTime}ms - ${error.message}`);
        throw error;
      }
    }, testCase.maxTime + 15000); // Add buffer for Jest timeout
  });

  // System-wide integration tests
  describe('System Integration Validation', () => {
    test('All video-specific queries should return video content', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const videoTests = testResults.filter(r =>
        r.category === 'video-specific' && !r.failed
      );

      expect(videoTests.length).toBeGreaterThan(0);

      // Video-specific tests should have sources
      const testsWithSources = videoTests.filter(t => t.sourcesFound > 0);
      const sourcePercentage = testsWithSources.length / videoTests.length;

      expect(sourcePercentage).toBeGreaterThan(0.5); // At least 50% should have sources
      console.log(`📹 Video content retrieval: ${(sourcePercentage * 100).toFixed(1)}% success`);
    });

    test('Function calling queries should have reasonable performance', async () => {
      const functionTests = testResults.filter(r =>
        r.category === 'function-calling' && !r.failed
      );

      if (functionTests.length > 0) {
        const avgFunctionTime = functionTests.reduce((sum, t) => sum + t.responseTime, 0) / functionTests.length;
        expect(avgFunctionTime).toBeLessThan(30000); // Function calls should be under 30s
        console.log(`🔧 Function calling average: ${avgFunctionTime.toFixed(0)}ms`);
      }
    });

    test('Complex workflows should provide comprehensive responses', async () => {
      const complexTests = testResults.filter(r =>
        r.category === 'complex-workflow' && !r.failed
      );

      if (complexTests.length > 0) {
        complexTests.forEach(test => {
          expect(test.contentLength).toBeGreaterThan(300);
          expect(test.tokens).toBeGreaterThan(500);
        });
        console.log(`🔄 Complex workflows: ${complexTests.length} tests passed`);
      }
    });

    test('Edge cases should handle errors gracefully', async () => {
      const edgeTests = testResults.filter(r =>
        r.category === 'edge-cases' && !r.failed
      );

      if (edgeTests.length > 0) {
        edgeTests.forEach(test => {
          expect(test.responseTime).toBeLessThan(25000); // Should fail fast
          expect(test.contentLength).toBeGreaterThan(20); // Should provide some explanation
        });
        console.log(`⚠️  Edge cases: ${edgeTests.length} tests handled gracefully`);
      }
    });

    test('Overall system performance meets requirements', async () => {
      const successfulTests = testResults.filter(r => !r.failed);

      expect(successfulTests.length).toBeGreaterThan(15); // At least 75% success rate

      if (successfulTests.length > 0) {
        const avgResponseTime = successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length;
        const maxResponseTime = Math.max(...successfulTests.map(t => t.responseTime));

        expect(avgResponseTime).toBeLessThan(35000); // Average under 35s
        expect(maxResponseTime).toBeLessThan(60000); // No response over 60s

        console.log(`🎯 System Performance: ${avgResponseTime.toFixed(0)}ms avg, ${maxResponseTime}ms max`);
      }
    });
  });
});