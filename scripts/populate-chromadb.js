#!/usr/bin/env node

/**
 * Script to populate ChromaDB Cloud with knowledge base data
 * Run with: node scripts/populate-chromadb.js
 */

const { chromaStore } = require('../src/lib/chromadb-store.js');
const { KnowledgeBase } = require('../src/lib/knowledge-base.js');

async function populateChromaDB() {
  console.log('🚀 Starting ChromaDB Cloud population...');

  try {
    // Initialize ChromaDB connection
    console.log('📡 Connecting to ChromaDB Cloud...');
    await chromaStore.initialize();

    // Get collection info
    const collectionInfo = await chromaStore.getCollectionInfo();
    console.log(`📊 Current collection info:`, collectionInfo);

    // If collection already has data, ask user if they want to clear it
    if (collectionInfo.count > 0) {
      console.log(`⚠️  Collection already contains ${collectionInfo.count} documents.`);
      console.log('🧹 Clearing existing collection to ensure clean data...');
      await chromaStore.clearCollection();
      console.log('✅ Collection cleared successfully');
    }

    // Load knowledge base
    console.log('📚 Loading knowledge base from local files...');
    const knowledgeBase = new KnowledgeBase();
    await knowledgeBase.initialize();
    const chunks = knowledgeBase.getAllDocumentChunks();

    console.log(`📋 Found ${chunks.length} document chunks to upload`);

    if (chunks.length === 0) {
      console.log('❌ No document chunks found. Please ensure your knowledge base is properly configured.');
      return;
    }

    // Upload chunks to ChromaDB Cloud
    console.log('☁️  Uploading chunks to ChromaDB Cloud...');
    const startTime = Date.now();
    await chromaStore.addDocuments(chunks);
    const uploadTime = Date.now() - startTime;

    // Verify upload
    const finalInfo = await chromaStore.getCollectionInfo();
    console.log(`✅ Upload completed successfully!`);
    console.log(`📊 Final collection info:`, finalInfo);
    console.log(`⏱️  Upload time: ${uploadTime}ms`);
    console.log(`💾 Total documents: ${finalInfo.count}`);

    // Test search functionality
    console.log('🔍 Testing search functionality...');
    const testResults = await chromaStore.searchSimilar(
      'How do I create a basic skirt pattern?',
      3,
      0.5
    );

    console.log(`🎯 Search test results: ${testResults.length} relevant documents found`);
    if (testResults.length > 0) {
      console.log('📝 Top result:', {
        score: testResults[0].score,
        title: testResults[0].metadata.title,
        type: testResults[0].metadata.type
      });
    }

    console.log('🎉 ChromaDB Cloud population completed successfully!');
    console.log('🌐 Your knowledge base is now available in ChromaDB Cloud');

  } catch (error) {
    console.error('❌ Error populating ChromaDB:', error);
    console.error('💡 Troubleshooting tips:');
    console.error('   - Check your CHROMADB_API_KEY in .env.local');
    console.error('   - Check your CHROMADB_TENANT in .env.local');
    console.error('   - Ensure your internet connection is stable');
    console.error('   - Verify ChromaDB Cloud service is available');
    process.exit(1);
  }
}

// Run the population script
if (require.main === module) {
  populateChromaDB().catch(console.error);
}

module.exports = { populateChromaDB };