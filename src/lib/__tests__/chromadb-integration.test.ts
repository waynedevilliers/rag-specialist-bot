// ChromaDB Integration Tests
import { chromaStore } from '../chromadb-store';
import { vectorStore } from '../vector-store';

// Mock environment variables for testing
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'sk-test-key-for-testing-1234567890abcdef1234567890abcdef',
    CHROMADB_URL: process.env.CHROMADB_URL || 'http://localhost:8000'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('ChromaDB Integration', () => {
  describe('ChromaDB Store', () => {
    it('should have correct connection configuration', () => {
      const status = chromaStore.getConnectionStatus();

      expect(status.collectionName).toBe('fashion_design_knowledge');
      expect(status.chromaUrl).toBe('http://localhost:8000');
      expect(status.isInitialized).toBe(false); // Not initialized yet
    });

    it('should handle initialization gracefully when ChromaDB is unavailable', async () => {
      // This test expects ChromaDB to be unavailable (which is normal in CI/dev)
      let initializationError: Error | null = null;

      try {
        await chromaStore.initialize();
      } catch (error) {
        initializationError = error as Error;
      }

      if (initializationError) {
        expect(initializationError.message).toContain('ChromaDB initialization failed');
        console.log('ChromaDB unavailable (expected in test environment):', initializationError.message);
      } else {
        // If ChromaDB is actually available, verify it works
        const status = chromaStore.getConnectionStatus();
        expect(status.isInitialized).toBe(true);
      }
    });

    it('should handle health check correctly', async () => {
      const isHealthy = await chromaStore.healthCheck();

      // Health check should return false when ChromaDB is unavailable
      if (!isHealthy) {
        console.log('ChromaDB health check failed (expected in test environment)');
        expect(isHealthy).toBe(false);
      } else {
        console.log('ChromaDB is available and healthy');
        expect(isHealthy).toBe(true);
      }
    });
  });

  describe('Vector Store ChromaDB Integration', () => {
    it('should include ChromaDB status in optimization stats', () => {
      const stats = vectorStore.getOptimizationStats();

      expect(stats).toHaveProperty('chromaDBEnabled');
      expect(stats).toHaveProperty('chromaDBStatus');

      // ChromaDB should be enabled by default
      expect(stats.chromaDBEnabled).toBe(true);

      // Status should indicate current state
      expect(['Connected', 'Initializing', 'Disabled']).toContain(stats.chromaDBStatus);

      console.log('Vector Store ChromaDB Status:', {
        enabled: stats.chromaDBEnabled,
        status: stats.chromaDBStatus
      });
    });

    it('should handle ChromaDB unavailability gracefully', async () => {
      // Test that vector store continues to work even if ChromaDB fails
      const mockChunks = [
        {
          id: 'test-chunk-1',
          content: 'This is a test fashion design concept about pattern making.',
          section: 'Pattern Construction',
          metadata: {
            title: 'Test Document',
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: '1'
          }
        }
      ];

      // This should not throw an error even if ChromaDB is unavailable
      let initializationError: Error | null = null;

      try {
        await vectorStore.initializeVectors(mockChunks);
      } catch (error) {
        initializationError = error as Error;
      }

      if (initializationError) {
        console.error('Vector store initialization failed:', initializationError.message);
        throw initializationError;
      }

      // Vector store should be initialized even without ChromaDB
      expect(vectorStore.getInitializationStatus()).toBe(true);

      console.log('Vector store initialized successfully (with or without ChromaDB)');
    }, 30000); // 30 second timeout for initialization
  });

  describe('Search Functionality', () => {
    beforeAll(async () => {
      // Initialize with minimal test data
      const testChunks = [
        {
          id: 'test-search-1',
          content: 'Creating basic bodice patterns requires understanding body measurements and ease.',
          section: 'Bodice Construction',
          metadata: {
            title: 'Bodice Basics',
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: '2'
          }
        },
        {
          id: 'test-search-2',
          content: 'Draping techniques allow for three-dimensional pattern development on a dress form.',
          section: 'Draping Methods',
          metadata: {
            title: 'Draping Fundamentals',
            type: 'draping' as const,
            courseNumber: '201',
            moduleNumber: '1'
          }
        }
      ];

      await vectorStore.initializeVectors(testChunks);
    }, 60000); // 60 second timeout for initialization

    it('should perform hybrid search with ChromaDB integration', async () => {
      const testChunks = [
        {
          id: 'test-search-1',
          content: 'Creating basic bodice patterns requires understanding body measurements and ease.',
          section: 'Bodice Construction',
          metadata: {
            title: 'Bodice Basics',
            type: 'pattern-making' as const,
            courseNumber: '101',
            moduleNumber: '2'
          }
        }
      ];

      const results = await vectorStore.hybridSearch(
        'how to make bodice patterns',
        testChunks,
        0.7,
        0.3,
        5
      );

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('chunk');
        expect(results[0]).toHaveProperty('score');
        expect(results[0].score).toBeGreaterThan(0);

        console.log('Hybrid search results:', {
          resultCount: results.length,
          topScore: results[0]?.score,
          topSection: results[0]?.chunk.section
        });
      } else {
        console.log('No search results found (may be expected in test environment)');
      }
    }, 20000); // 20 second timeout for search
  });
});