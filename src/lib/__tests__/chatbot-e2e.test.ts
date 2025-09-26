import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// E2E Test Suite for ELLU Chatbot
describe('ELLU Chatbot E2E Tests', () => {
  const API_BASE = process.env.TEST_API_URL || 'http://localhost:3000';
  let serverResponse: Response;

  // Test data: Top English and German questions
  const testQuestions = {
    english: [
      {
        id: 'Q1_EN',
        question: "Show me the specific steps for pinning the front skirt in the draping course video 2",
        expectedKeywords: ['pin', 'front skirt', 'draping', 'steps', 'video 2', 'teil 1'],
        expectedSources: ['draping', 'Course 201', 'VORDERROCK STECKEN'],
        maxResponseTime: 30000, // 30 seconds
        category: 'video-specific'
      },
      {
        id: 'Q2_EN',
        question: "What are the exact measurements mentioned in the classical pattern construction video for drawing the grain line?",
        expectedKeywords: ['grain line', 'measurements', 'construction', 'pattern'],
        expectedSources: ['pattern-making', 'Course 101', 'grain'],
        maxResponseTime: 30000,
        category: 'video-specific'
      },
      {
        id: 'Q3_EN',
        question: "In the Adobe Illustrator tools video, what specific tools are introduced first?",
        expectedKeywords: ['illustrator', 'tools', 'selection', 'first'],
        expectedSources: ['illustrator-fashion', 'Course 301', 'werkzeuge'],
        maxResponseTime: 30000,
        category: 'video-specific'
      },
      {
        id: 'Q4_EN',
        question: "Calculate the fabric requirements for a size 38 A-line skirt with 10cm seam allowances",
        expectedKeywords: ['fabric', 'calculate', 'size 38', 'seam allowance', 'A-line'],
        expectedSources: [],
        maxResponseTime: 20000,
        category: 'function-calling'
      },
      {
        id: 'Q5_EN',
        question: "Compare the learning objectives between the classical pattern construction course and the draping course",
        expectedKeywords: ['compare', 'learning objectives', 'construction', 'draping', 'course'],
        expectedSources: ['Course 101', 'Course 201'],
        maxResponseTime: 25000,
        category: 'course-navigation'
      }
    ],
    german: [
      {
        id: 'Q1_DE',
        question: "Zeige mir die spezifischen Schritte zum Stecken des Vorderrocks im Drapier-Kurs Video 2",
        expectedKeywords: ['Schritte', 'Vorderrock', 'Stecken', 'Drapier', 'Video 2'],
        expectedSources: ['draping', 'Kurs 201', 'VORDERROCK'],
        maxResponseTime: 30000,
        category: 'video-specific'
      },
      {
        id: 'Q2_DE',
        question: "Welche genauen Maße werden im klassischen Schnittkonstruktions-Video für das Einzeichnen des Fadenlaufs erwähnt?",
        expectedKeywords: ['Maße', 'Fadenlauf', 'Schnittkonstruktion', 'einzeichnen'],
        expectedSources: ['pattern-making', 'Kurs 101'],
        maxResponseTime: 30000,
        category: 'video-specific'
      },
      {
        id: 'Q3_DE',
        question: "Berechne den Stoffbedarf für einen A-Linien Rock in Größe 38 mit 10cm Nahtzugabe",
        expectedKeywords: ['Stoffbedarf', 'berechne', 'Größe 38', 'Nahtzugabe', 'A-Linien'],
        expectedSources: [],
        maxResponseTime: 20000,
        category: 'function-calling'
      },
      {
        id: 'Q4_DE',
        question: "Vergleiche die Lernziele zwischen dem klassischen Schnittkonstruktionskurs und dem Drapierkurs",
        expectedKeywords: ['Vergleiche', 'Lernziele', 'Schnittkonstruktion', 'Drapier'],
        expectedSources: ['Kurs 101', 'Kurs 201'],
        maxResponseTime: 25000,
        category: 'course-navigation'
      },
      {
        id: 'Q5_DE',
        question: "Wie berechne ich den Stoffverbrauch für einen A-Linien Rock in Größe 38?",
        expectedKeywords: ['Stoffverbrauch', 'berechne', 'A-Linien', 'Größe 38'],
        expectedSources: [],
        maxResponseTime: 20000,
        category: 'function-calling'
      }
    ]
  };

  beforeAll(async () => {
    console.log('Starting E2E tests for ELLU Chatbot...');
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(() => {
    console.log('E2E tests completed');
  });

  describe('English Questions E2E Tests', () => {
    testQuestions.english.forEach((testCase) => {
      test(`${testCase.id}: ${testCase.question.substring(0, 50)}...`, async () => {
        const startTime = Date.now();

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
        const data = await response.json();

        // Test 1: HTTP Response
        expect(response.status).toBe(200);

        // Test 2: Response Structure
        expect(data).toHaveProperty('content');
        expect(data).toHaveProperty('sources');
        expect(data).toHaveProperty('processingTime');
        expect(data).toHaveProperty('tokenUsage');

        // Test 3: Content Quality
        expect(data.content).toBeTruthy();
        expect(data.content.length).toBeGreaterThan(100);

        // Test 4: Expected Keywords Present
        const contentLower = data.content.toLowerCase();
        const keywordMatches = testCase.expectedKeywords.filter(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );
        expect(keywordMatches.length).toBeGreaterThan(0);

        // Test 5: Performance
        expect(responseTime).toBeLessThan(testCase.maxResponseTime);

        // Test 6: Sources (if expected)
        if (testCase.expectedSources.length > 0) {
          expect(data.sources).toBeTruthy();
          expect(data.sources.length).toBeGreaterThan(0);
        }

        // Test 7: Token Usage
        expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
        expect(data.tokenUsage.cost.totalCost).toBeGreaterThan(0);

        console.log(`✅ ${testCase.id}: ${responseTime}ms, ${data.tokenUsage.totalTokens} tokens, $${data.tokenUsage.cost.totalCost.toFixed(4)}`);
      }, 60000); // 60 second timeout
    });
  });

  describe('German Questions E2E Tests', () => {
    testQuestions.german.forEach((testCase) => {
      test(`${testCase.id}: ${testCase.question.substring(0, 50)}...`, async () => {
        const startTime = Date.now();

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
        const data = await response.json();

        // Test 1: HTTP Response
        expect(response.status).toBe(200);

        // Test 2: Response Structure
        expect(data).toHaveProperty('content');
        expect(data).toHaveProperty('sources');
        expect(data).toHaveProperty('processingTime');
        expect(data).toHaveProperty('tokenUsage');

        // Test 3: Content Quality
        expect(data.content).toBeTruthy();
        expect(data.content.length).toBeGreaterThan(100);

        // Test 4: Expected Keywords Present
        const contentLower = data.content.toLowerCase();
        const keywordMatches = testCase.expectedKeywords.filter(keyword =>
          contentLower.includes(keyword.toLowerCase())
        );
        expect(keywordMatches.length).toBeGreaterThan(0);

        // Test 5: Performance
        expect(responseTime).toBeLessThan(testCase.maxResponseTime);

        // Test 6: Sources (if expected)
        if (testCase.expectedSources.length > 0) {
          expect(data.sources).toBeTruthy();
          expect(data.sources.length).toBeGreaterThan(0);
        }

        // Test 7: Token Usage
        expect(data.tokenUsage.totalTokens).toBeGreaterThan(0);
        expect(data.tokenUsage.cost.totalCost).toBeGreaterThan(0);

        console.log(`✅ ${testCase.id}: ${responseTime}ms, ${data.tokenUsage.totalTokens} tokens, $${data.tokenUsage.cost.totalCost.toFixed(4)}`);
      }, 60000); // 60 second timeout
    });
  });

  describe('Language Detection Accuracy Tests', () => {
    test('English query should be detected as English', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Show me the specific steps for pinning the front skirt",
          language: 'auto'
        }),
      });

      const data = await response.json();

      // Check that response is in English (not German)
      const germanWords = ['ich', 'der', 'die', 'das', 'und', 'mit', 'für', 'schritte', 'zeige'];
      const contentWords = data.content.toLowerCase().split(/\s+/);
      const germanRatio = contentWords.filter(word => germanWords.includes(word)).length / contentWords.length;

      expect(germanRatio).toBeLessThan(0.3); // Should be mostly English
    });

    test('German query should be detected as German', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Zeige mir die spezifischen Schritte zum Stecken des Vorderrocks",
          language: 'auto'
        }),
      });

      const data = await response.json();

      // Check that response contains German words
      const germanWords = ['ich', 'der', 'die', 'das', 'und', 'mit', 'für', 'einen', 'eine'];
      const contentWords = data.content.toLowerCase().split(/\s+/);
      const germanMatches = contentWords.filter(word => germanWords.some(gw => word.includes(gw))).length;

      expect(germanMatches).toBeGreaterThan(0); // Should contain German
    });
  });

  describe('Performance Benchmarks', () => {
    test('System should handle concurrent requests', async () => {
      const concurrentRequests = 3;
      const testQuestion = "What is a dart in pattern making?";

      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(0).map(() =>
        fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: testQuestion, language: 'auto' }),
        })
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average time per request should be reasonable
      const avgTime = totalTime / concurrentRequests;
      expect(avgTime).toBeLessThan(40000); // 40 seconds average

      console.log(`🔄 Concurrent test: ${concurrentRequests} requests in ${totalTime}ms (avg: ${avgTime.toFixed(0)}ms)`);
    }, 120000);

    test('Simple queries should respond quickly', async () => {
      const startTime = Date.now();

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "What is ease in pattern making?",
          language: 'auto'
        }),
      });

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(25000); // Should be faster for simple queries

      console.log(`⚡ Simple query: ${responseTime}ms`);
    }, 30000);
  });

  describe('Error Handling Tests', () => {
    test('Should handle empty message gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "", language: 'auto' }),
      });

      expect(response.status).toBe(400);
    });

    test('Should handle very long message', async () => {
      const longMessage = 'What is pattern making? '.repeat(200); // ~4000 characters

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: longMessage, language: 'auto' }),
      });

      expect(response.status).toBe(400); // Should reject messages over 2000 chars
    });

    test('Should handle invalid language parameter', async () => {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "What is pattern making?",
          language: 'invalid'
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});