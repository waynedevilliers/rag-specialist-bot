// Test for klassische Schnittkonstruktion integration
import { knowledgeBase } from '../knowledge-base';
import { ragSystem } from '../rag-system';

describe('Klassische Schnittkonstruktion Integration', () => {
  beforeAll(async () => {
    // Load the knowledge base with new content
    await knowledgeBase.loadDocuments();
  }, 30000);

  describe('Knowledge Base Integration', () => {
    it('should load klassische Schnittkonstruktion content', () => {
      const chunks = knowledgeBase.getChunks();

      // Should have more chunks now with the new content
      expect(chunks.length).toBeGreaterThan(50);

      // Should contain German fashion terms
      const germanChunks = chunks.filter(chunk =>
        chunk.content.includes('Rockgrundschnitt') ||
        chunk.content.includes('Maßstabelle') ||
        chunk.content.includes('Abnäher')
      );

      expect(germanChunks.length).toBeGreaterThan(0);

      console.log(`Found ${germanChunks.length} chunks with German pattern construction content`);
      console.log(`Total chunks: ${chunks.length}`);
    });

    it('should contain specific klassische Schnittkonstruktion modules', () => {
      const chunks = knowledgeBase.getChunks();

      const expectedContent = [
        'interaktive Maßstabelle',
        'Rockgrundschnitt',
        'Taillenlinie',
        'Hüftlinie',
        'Abnäher',
        'Seitenrundung',
        'Körpermaße',
        'Fertigmaße'
      ];

      expectedContent.forEach(term => {
        const hasContent = chunks.some(chunk =>
          chunk.content.toLowerCase().includes(term.toLowerCase())
        );
        expect(hasContent).toBe(true);

        if (hasContent) {
          console.log(`✓ Found content for: ${term}`);
        }
      });
    });
  });

  describe('RAG System with German Content', () => {
    beforeAll(async () => {
      await ragSystem.initialize();
    }, 60000);

    it('should respond to German pattern construction questions', async () => {
      const germanQueries = [
        'Wie funktioniert die interaktive Maßstabelle?',
        'Was ist ein Rockgrundschnitt?',
        'Wie konstruiere ich Abnäher?',
        'Was sind Körpermaße und Fertigmaße?'
      ];

      for (const query of germanQueries) {
        const response = await ragSystem.query(query, 'de');

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(50);
        expect(response.sources.length).toBeGreaterThan(0);

        console.log(`Query: ${query}`);
        console.log(`Response length: ${response.content.length} characters`);
        console.log(`Sources: ${response.sources.length}`);
        console.log(`Processing time: ${response.processingTime}ms`);
        console.log('---');
      }
    }, 120000); // 2 minute timeout for all queries

    it('should handle mixed German-English pattern construction questions', async () => {
      const mixedQueries = [
        'How do I use the Maßstabelle for pattern construction?',
        'What is the difference between Körpermaße and finished measurements?',
        'Explain the Rockgrundschnitt construction process'
      ];

      for (const query of mixedQueries) {
        const response = await ragSystem.query(query, 'auto');

        expect(response.content).toBeDefined();
        expect(response.content.length).toBeGreaterThan(50);

        // Should contain some German terms from the source material
        const containsGermanTerms = [
          'rockgrundschnitt', 'maßstabelle', 'abnäher', 'körpermaße'
        ].some(term =>
          response.content.toLowerCase().includes(term) ||
          response.sources.some(source =>
            source.excerpt.toLowerCase().includes(term)
          )
        );

        console.log(`Query: ${query}`);
        console.log(`Contains German terms: ${containsGermanTerms}`);
        console.log(`Response excerpt: ${response.content.substring(0, 100)}...`);
      }
    }, 60000);
  });

  describe('Vector Store Update', () => {
    it('should have updated vector count with new content', () => {
      const vectorCount = knowledgeBase.getChunks().length;

      // Should have significantly more content now
      expect(vectorCount).toBeGreaterThan(80);

      console.log(`Vector store now contains ${vectorCount} document chunks`);
    });
  });
});