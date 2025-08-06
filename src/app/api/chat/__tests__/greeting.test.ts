/**
 * Tests for greeting detection and response functionality
 */

// Mock environment variable - must be set before imports
process.env.OPENAI_API_KEY = 'sk-test-api-key-for-testing-purposes-only-1234567890abcdef';

import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('Chat API Greeting Detection', () => {
  const createRequest = (message: string, language: string = 'en') => {
    return new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, language }),
      headers: { 'Content-Type': 'application/json' },
    });
  };

  describe('English Greetings', () => {
    const englishGreetings = [
      'good morning',
      'Good morning!',
      'hello',
      'Hello!',
      'hi',
      'Hi!',
      'hey',
      'good afternoon',
      'good evening',
    ];

    englishGreetings.forEach((greeting) => {
      it(`should detect "${greeting}" as a greeting and respond without sources`, async () => {
        const request = createRequest(greeting, 'en');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.content).toBeDefined();
        expect(data.content).toContain('ELLU Studios');
        expect(data.sources).toEqual([]);
        expect(data.tokenUsage.totalTokens).toBe(0);
        expect(data.processingTime).toBeLessThan(10);
      });
    });
  });

  describe('German Greetings', () => {
    const germanGreetings = [
      'guten morgen',
      'Guten Morgen!',
      'hallo',
      'Hallo!',
      'guten tag',
      'guten abend',
    ];

    germanGreetings.forEach((greeting) => {
      it(`should detect "${greeting}" as a greeting and respond without sources`, async () => {
        const request = createRequest(greeting, 'de');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.content).toBeDefined();
        expect(data.content).toContain('ELLU Studios');
        expect(data.sources).toEqual([]);
        expect(data.tokenUsage.totalTokens).toBe(0);
        expect(data.processingTime).toBeLessThan(10);
      });
    });
  });

  describe('Non-Greeting Messages', () => {
    const nonGreetings = [
      'How do I create a pattern?',
      'What is draping?',
      'Tell me about Adobe Illustrator',
      'good morning sunshine how are you today?', // Too complex
      'I need help with fitting',
    ];

    nonGreetings.forEach((message) => {
      it(`should NOT detect "${message}" as a simple greeting`, async () => {
        const request = createRequest(message, 'en');
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Should use full RAG system (will have fallback response due to test API key)
        expect(data.processingTime).toBeGreaterThan(10);
      });
    });
  });

  describe('Response Content Quality', () => {
    it('should provide helpful English greeting responses', async () => {
      const request = createRequest('good morning', 'en');
      const response = await POST(request);
      const data = await response.json();

      expect(data.content).toContain('fashion design');
      expect(data.content).toContain('pattern making');
      expect(data.content).toContain('Adobe Illustrator');
      expect(data.content).toContain('draping');
      expect(data.content).toContain('construction');
    });

    it('should provide helpful German greeting responses', async () => {
      const request = createRequest('guten morgen', 'de');
      const response = await POST(request);
      const data = await response.json();

      expect(data.content).toContain('Modedesign');
      expect(data.content).toContain('Schnittmuster');
      expect(data.content).toContain('Adobe Illustrator');
      expect(data.content).toContain('Drapier');
    });
  });
});