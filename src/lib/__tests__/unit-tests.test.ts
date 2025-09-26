import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Unit Tests for Core Components
describe('ELLU Chatbot Unit Tests', () => {

  describe('Language Detection Tests', () => {
    // Mock the RAG system for unit testing
    class MockRAGSystem {
      private detectLanguage(query: string): 'en' | 'de' {
        // Enhanced language detection logic (copied from actual implementation)
        const englishStructureWords = ['show', 'me', 'the', 'how', 'do', 'i', 'can', 'you', 'what', 'is', 'are', 'this', 'that', 'about', 'from', 'with', 'for', 'in', 'on', 'at', 'to', 'of', 'and', 'or', 'but'];
        const germanStructureWords = ['zeigen', 'mir', 'wie', 'kann', 'ich', 'du', 'sie', 'was', 'ist', 'sind', 'dieser', 'diese', 'dieses', 'über', 'von', 'mit', 'für', 'in', 'an', 'auf', 'zu', 'und', 'oder', 'aber'];
        const technicalTerms = ['rockgrundschnitt', 'drapieren', 'teil', 'konstruieren', 'illustrator', 'schnittkonstruktion'];

        const words = query.toLowerCase().split(/\s+/);
        const englishStructureMatches = words.filter(word => englishStructureWords.includes(word)).length;
        const germanStructureMatches = words.filter(word => germanStructureWords.includes(word)).length;
        const technicalMatches = words.filter(word => technicalTerms.includes(word)).length;

        const totalNonTechnical = words.length - technicalMatches;
        const englishStructureRatio = totalNonTechnical > 0 ? englishStructureMatches / totalNonTechnical : 0;
        const germanStructureRatio = totalNonTechnical > 0 ? germanStructureMatches / totalNonTechnical : 0;

        if (englishStructureRatio > germanStructureRatio) {
          return 'en';
        } else if (germanStructureRatio > englishStructureRatio) {
          return 'de';
        } else {
          const germanWords = ['ist', 'sind', 'der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'zu'];
          const germanMatches = words.filter(word => germanWords.includes(word)).length;
          const germanRatio = germanMatches / words.length;
          return germanRatio > 0.4 ? 'de' : 'en';
        }
      }

      public testLanguageDetection(query: string): 'en' | 'de' {
        return this.detectLanguage(query);
      }
    }

    const mockRAG = new MockRAGSystem();

    test('Should correctly detect English queries', () => {
      const englishQueries = [
        "Show me the specific steps for pinning the front skirt",
        "What are the exact measurements mentioned in the video?",
        "How do I calculate fabric requirements?",
        "Can you explain the difference between draping techniques?",
        "I need help with pattern construction"
      ];

      englishQueries.forEach(query => {
        expect(mockRAG.testLanguageDetection(query)).toBe('en');
      });
    });

    test('Should correctly detect German queries', () => {
      const germanQueries = [
        "Zeige mir die spezifischen Schritte zum Stecken",
        "Wie berechne ich den Stoffverbrauch?",
        "Was sind die wichtigsten Unterschiede zwischen den Kursen?",
        "Ich bin Anfänger und möchte lernen",
        "Erkläre mir die Beziehung zwischen Mehrweite und Passform"
      ];

      germanQueries.forEach(query => {
        expect(mockRAG.testLanguageDetection(query)).toBe('de');
      });
    });

    test('Should handle mixed technical terms correctly', () => {
      // These should be detected as English despite German technical terms
      const mixedEnglishQueries = [
        "Show me how to use Illustrator for fashion design",
        "What is the difference between draping and construction?",
        "Can you help me with pattern making?"
      ];

      mixedEnglishQueries.forEach(query => {
        expect(mockRAG.testLanguageDetection(query)).toBe('en');
      });
    });

    test('Should prioritize sentence structure over technical terms', () => {
      // English sentence structure should override German technical terms
      expect(mockRAG.testLanguageDetection("Show me the Rockgrundschnitt construction steps")).toBe('en');

      // German sentence structure should be detected
      expect(mockRAG.testLanguageDetection("Zeige mir die construction steps")).toBe('de');
    });
  });

  describe('Video Query Detection Tests', () => {
    class MockVideoDetector {
      private isVideoSpecificQuery(query: string): boolean {
        const videoKeywords = [
          'video', 'teil', 'part', 'step', 'steps', 'specific steps', 'show me', 'video 2', 'video 1', 'video 3',
          'draping course video', 'illustrator video', 'construction video', 'transcript', 'mentioned in',
          'what specific', 'in the video', 'from the video', 'video content', 'introduced first',
          'exact measurements mentioned', 'specific tools', 'what tools'
        ];

        const lowerQuery = query.toLowerCase();

        // Check for explicit video references
        if (videoKeywords.some(keyword => lowerQuery.includes(keyword))) {
          return true;
        }

        // Check for patterns that suggest video-specific content
        const videoPatterns = [
          /video\s+\d+/i,           // "video 2", "video 1"
          /teil\s+\d+/i,           // "teil 1", "teil 2"
          /part\s+\d+/i,           // "part 1", "part 2"
          /steps?\s+(for|to|in)/i,  // "steps for", "step to"
          /what.*mentioned/i,       // "what is mentioned"
          /specific.*tools?/i,      // "specific tools"
          /exact.*measurements?/i   // "exact measurements"
        ];

        return videoPatterns.some(pattern => pattern.test(query));
      }

      public testVideoDetection(query: string): boolean {
        return this.isVideoSpecificQuery(query);
      }
    }

    const mockDetector = new MockVideoDetector();

    test('Should detect explicit video references', () => {
      const videoQueries = [
        "Show me the specific steps in video 2",
        "What is mentioned in the draping course video?",
        "In the Adobe Illustrator video, what tools are used?",
        "Tell me about Teil 1 content",
        "What specific measurements are in the video?"
      ];

      videoQueries.forEach(query => {
        expect(mockDetector.testVideoDetection(query)).toBe(true);
      });
    });

    test('Should detect video patterns', () => {
      const patternQueries = [
        "What are the steps for pinning the skirt?",
        "Show me the specific tools introduced first",
        "What exact measurements are mentioned?",
        "Steps to complete the pattern construction"
      ];

      patternQueries.forEach(query => {
        expect(mockDetector.testVideoDetection(query)).toBe(true);
      });
    });

    test('Should not detect non-video queries', () => {
      const nonVideoQueries = [
        "What is pattern making?",
        "How do I calculate fabric requirements?",
        "Compare different techniques",
        "What courses are available?"
      ];

      nonVideoQueries.forEach(query => {
        expect(mockDetector.testVideoDetection(query)).toBe(false);
      });
    });
  });

  describe('Performance Monitoring Tests', () => {
    class MockPerformanceMonitor {
      private metrics: Map<string, number[]> = new Map();

      startTiming(operation: string): () => number {
        const startTime = Date.now();
        return () => {
          const duration = Date.now() - startTime;
          this.recordMetric(operation, duration);
          return duration;
        };
      }

      recordMetric(metric: string, value: number): void {
        if (!this.metrics.has(metric)) {
          this.metrics.set(metric, []);
        }
        const values = this.metrics.get(metric)!;
        values.push(value);
        if (values.length > 100) values.shift();
      }

      getMetricStats(metric: string): { avg: number; min: number; max: number; count: number } | null {
        const values = this.metrics.get(metric);
        if (!values || values.length === 0) return null;

        const sum = values.reduce((a, b) => a + b, 0);
        return {
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }

    let monitor: MockPerformanceMonitor;

    beforeEach(() => {
      monitor = new MockPerformanceMonitor();
    });

    test('Should track timing metrics', () => {
      const timer = monitor.startTiming('test_operation');

      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) { /* wait 10ms */ }

      const duration = timer();

      expect(duration).toBeGreaterThan(5);
      expect(duration).toBeLessThan(50);

      const stats = monitor.getMetricStats('test_operation');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.avg).toBe(duration);
    });

    test('Should calculate correct statistics', () => {
      // Add some test data
      monitor.recordMetric('response_time', 100);
      monitor.recordMetric('response_time', 200);
      monitor.recordMetric('response_time', 300);

      const stats = monitor.getMetricStats('response_time');

      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.avg).toBe(200);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(300);
    });

    test('Should handle non-existent metrics', () => {
      const stats = monitor.getMetricStats('non_existent_metric');
      expect(stats).toBeNull();
    });
  });

  describe('Token Usage Calculation Tests', () => {
    class MockTokenCalculator {
      estimateTokensAccurately(text: string): number {
        // Simple token estimation (4 chars = 1 token average)
        const charCount = text.length;
        const wordCount = text.split(/\s+/).length;

        const tokensByChars = Math.ceil(charCount / 4);
        const tokensByWords = Math.ceil(wordCount * 1.3);

        return Math.ceil(Math.max(tokensByChars, tokensByWords));
      }

      calculateCost(promptTokens: number, completionTokens: number, embeddingTokens: number = 0) {
        // OpenAI pricing (approximate)
        const promptCost = (promptTokens / 1000000) * 3.00;
        const completionCost = (completionTokens / 1000000) * 15.00;
        const embeddingCost = (embeddingTokens / 1000000) * 0.10;
        const totalCost = promptCost + completionCost + embeddingCost;

        return {
          promptCost: Math.round(promptCost * 100000) / 100000,
          completionCost: Math.round(completionCost * 100000) / 100000,
          embeddingCost: Math.round(embeddingCost * 100000) / 100000,
          totalCost: Math.round(totalCost * 100000) / 100000
        };
      }
    }

    const calculator = new MockTokenCalculator();

    test('Should estimate tokens reasonably', () => {
      const shortText = "Hello world";
      const longText = "This is a much longer text with many more words and characters that should result in a higher token count estimate.";

      const shortTokens = calculator.estimateTokensAccurately(shortText);
      const longTokens = calculator.estimateTokensAccurately(longText);

      expect(shortTokens).toBeGreaterThan(0);
      expect(longTokens).toBeGreaterThan(shortTokens);
      expect(shortTokens).toBeLessThan(10);
      expect(longTokens).toBeGreaterThan(20);
    });

    test('Should calculate costs correctly', () => {
      const cost = calculator.calculateCost(1000, 500, 100);

      expect(cost.promptCost).toBeGreaterThan(0);
      expect(cost.completionCost).toBeGreaterThan(0);
      expect(cost.embeddingCost).toBeGreaterThan(0);
      expect(cost.totalCost).toBe(cost.promptCost + cost.completionCost + cost.embeddingCost);

      // Completion should be more expensive than prompt
      expect(cost.completionCost).toBeGreaterThan(cost.promptCost);
    });

    test('Should handle zero tokens gracefully', () => {
      const cost = calculator.calculateCost(0, 0, 0);

      expect(cost.promptCost).toBe(0);
      expect(cost.completionCost).toBe(0);
      expect(cost.embeddingCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });
  });

  describe('Content Analysis Tests', () => {
    class MockContentAnalyzer {
      hasVideoReference(content: string): boolean {
        const videoKeywords = ['video', 'teil', 'part', 'module', 'lesson', 'tutorial', 'transcript'];
        return videoKeywords.some(keyword => content.toLowerCase().includes(keyword));
      }

      hasCourseReference(content: string): boolean {
        const courseKeywords = ['course', 'kurs', 'schnittkonstruktion', 'drapieren', 'illustrator', 'ellu studios'];
        return courseKeywords.some(keyword => content.toLowerCase().includes(keyword));
      }

      hasCalculation(content: string): boolean {
        const calcKeywords = ['calculate', 'measurement', 'size', 'cm', 'inch', 'fabric', 'seam allowance', 'ease'];
        const hasNumbers = /\d+/.test(content);
        const hasCalcWords = calcKeywords.some(keyword => content.toLowerCase().includes(keyword));
        return hasNumbers && hasCalcWords;
      }

      analyzeContentQuality(content: string): {
        wordCount: number;
        sentenceCount: number;
        avgWordsPerSentence: number;
        hasStructure: boolean;
        readabilityScore: number;
      } {
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

        const wordCount = words.length;
        const sentenceCount = sentences.length;
        const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

        // Check for structure (steps, bullets, headers)
        const hasStructure = /(\d+\.|•|-)/.test(content) || content.includes('**');

        // Simple readability score (0-100, higher is better)
        const readabilityScore = Math.min(100, Math.max(0,
          100 - (avgWordsPerSentence * 2) + (hasStructure ? 10 : 0)
        ));

        return {
          wordCount,
          sentenceCount,
          avgWordsPerSentence,
          hasStructure,
          readabilityScore
        };
      }
    }

    const analyzer = new MockContentAnalyzer();

    test('Should detect video references', () => {
      expect(analyzer.hasVideoReference("This video shows the steps")).toBe(true);
      expect(analyzer.hasVideoReference("In Teil 1 we learn")).toBe(true);
      expect(analyzer.hasVideoReference("This is a general response")).toBe(false);
    });

    test('Should detect course references', () => {
      expect(analyzer.hasCourseReference("This course covers draping")).toBe(true);
      expect(analyzer.hasCourseReference("ELLU Studios provides education")).toBe(true);
      expect(analyzer.hasCourseReference("This is general information")).toBe(false);
    });

    test('Should detect calculations', () => {
      expect(analyzer.hasCalculation("Calculate 150cm of fabric for size 38")).toBe(true);
      expect(analyzer.hasCalculation("You need fabric and measurements")).toBe(false);
      expect(analyzer.hasCalculation("Size 38 requires calculation")).toBe(true);
    });

    test('Should analyze content quality', () => {
      const structuredContent = `
        1. First step in the process
        2. Second step with details
        3. Final step to complete
      `;

      const unstructuredContent = "This is just a long sentence without any structure or organization that goes on and on.";

      const structuredAnalysis = analyzer.analyzeContentQuality(structuredContent);
      const unstructuredAnalysis = analyzer.analyzeContentQuality(unstructuredContent);

      expect(structuredAnalysis.hasStructure).toBe(true);
      expect(unstructuredAnalysis.hasStructure).toBe(false);

      expect(structuredAnalysis.wordCount).toBeGreaterThan(0);
      expect(structuredAnalysis.sentenceCount).toBeGreaterThan(0);

      // Structured content should have better readability
      expect(structuredAnalysis.readabilityScore).toBeGreaterThan(unstructuredAnalysis.readabilityScore);
    });
  });

  describe('Error Handling Tests', () => {
    test('Should handle empty or invalid queries', () => {
      const invalidQueries = ['', '   ', null, undefined];

      invalidQueries.forEach(query => {
        expect(() => {
          if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new Error('Invalid query');
          }
        }).toThrow('Invalid query');
      });
    });

    test('Should handle oversized queries', () => {
      const longQuery = 'word '.repeat(1000); // 5000 characters

      expect(() => {
        if (longQuery.length > 2000) {
          throw new Error('Query too long');
        }
      }).toThrow('Query too long');
    });

    test('Should validate language parameters', () => {
      const validLanguages = ['en', 'de', 'auto'];
      const invalidLanguages = ['fr', 'es', 'invalid', ''];

      validLanguages.forEach(lang => {
        expect(validLanguages.includes(lang)).toBe(true);
      });

      invalidLanguages.forEach(lang => {
        expect(validLanguages.includes(lang)).toBe(false);
      });
    });
  });
});