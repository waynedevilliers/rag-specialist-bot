// RAG System Performance Baseline Tests
import { ragSystem } from '../rag-system';

describe('RAG System Performance Analysis', () => {
  beforeAll(async () => {
    // Initialize the RAG system for testing
    await ragSystem.initialize();
  }, 30000); // 30 second timeout for initialization

  describe('Initialization Performance', () => {
    it('should track system initialization status', () => {
      const status = ragSystem.getSystemStatus();
      
      expect(status.initialized).toBe(true);
      expect(status.knowledgeBaseLoaded).toBe(true);
      expect(status.totalChunks).toBeGreaterThan(0);
      
      console.log('System Status:', JSON.stringify(status, null, 2));
    });
  });

  describe('Query Response Time Baselines', () => {
    const testQueries = [
      'How do I create a basic bodice pattern?',
      'What are the steps for draping a sleeve?',
      'How to use color palettes in Adobe Illustrator for fashion?',
      'What seam finishes should I use for different fabrics?'
    ];

    testQueries.forEach((query, index) => {
      it(`should process query ${index + 1} within acceptable time limits`, async () => {
        const startTime = Date.now();
        
        try {
          const response = await ragSystem.query(query, 'en');
          const processingTime = Date.now() - startTime;
          
          expect(response.content).toBeDefined();
          expect(response.content.length).toBeGreaterThan(0);
          expect(response.sources).toBeInstanceOf(Array);
          expect(response.processingTime).toBeGreaterThan(0);
          expect(response.tokenUsage).toBeDefined();
          expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);
          
          console.log(`Query ${index + 1} Performance:`, {
            query: query.substring(0, 50) + '...',
            processingTime: processingTime,
            reportedTime: response.processingTime,
            sources: response.sources.length,
            tokenUsage: response.tokenUsage.totalTokens,
            cost: response.tokenUsage.cost.totalCost
          });
          
          // Baseline expectations - these will be optimized
          expect(processingTime).toBeLessThan(15000); // 15 seconds max
          expect(response.sources.length).toBeGreaterThan(0);
          
        } catch (error) {
          console.error(`Query ${index + 1} failed:`, error);
          throw error;
        }
      }, 20000); // 20 second timeout per query
    });
  });

  describe('Memory and Cache Performance', () => {
    it('should demonstrate cache effectiveness', async () => {
      const query = 'How do I add seam allowances to a pattern?';
      
      // First query - should hit the LLM
      const response1 = await ragSystem.query(query, 'en');
      const time1 = response1.processingTime;
      
      // Second identical query - should hit cache
      const response2 = await ragSystem.query(query, 'en');
      const time2 = response2.processingTime;
      
      console.log('Cache Performance:', {
        firstQuery: time1,
        secondQuery: time2,
        speedImprovement: time1 - time2,
        cacheHit: time2 < time1
      });
      
      expect(response1.content).toBe(response2.content);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    }, 25000);
  });

  describe('Vector Search vs Text Search Performance', () => {
    it('should compare retrieval methods', async () => {
      const status = ragSystem.getSystemStatus();
      
      console.log('Retrieval System Status:', {
        vectorStoreReady: status.vectorStoreReady,
        totalVectors: status.totalVectors,
        fallbackAvailable: status.totalChunks > 0
      });
      
      expect(status.totalChunks).toBeGreaterThan(0);
      
      if (status.vectorStoreReady) {
        expect(status.totalVectors).toBeGreaterThan(0);
        console.log('Vector embeddings are operational');
      } else {
        console.log('Falling back to text-based search');
      }
    });
  });
});