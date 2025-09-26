#!/usr/bin/env npx tsx

/**
 * Script to populate ChromaDB Cloud with knowledge base data
 * Run with: npx tsx scripts/populate-chromadb-env.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { join } from 'path'

// Load .env.local explicitly
config({ path: join(process.cwd(), '.env.local') })

import { chromaStore } from '../src/lib/chromadb-store'
import { KnowledgeBase } from '../src/lib/knowledge-base'

async function populateChromaDB() {
  console.log('🚀 Starting ChromaDB Cloud population...')
  console.log('🔑 Environment check:')
  console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'present' : 'missing'}`)
  console.log(`   - CHROMADB_API_KEY: ${process.env.CHROMADB_API_KEY ? 'present' : 'missing'}`)
  console.log(`   - CHROMADB_TENANT: ${process.env.CHROMADB_TENANT ? 'present' : 'missing'}`)
  console.log(`   - CHROMADB_DATABASE: ${process.env.CHROMADB_DATABASE || 'not set'}`)

  try {
    // Initialize ChromaDB connection
    console.log('📡 Connecting to ChromaDB Cloud...')
    await chromaStore.initialize()
    console.log('✅ Connected to ChromaDB Cloud successfully')

    // Get collection info
    const collectionInfo = await chromaStore.getCollectionInfo()
    console.log(`📊 Current collection info:`, collectionInfo)

    // If collection already has data, clear it for clean upload
    if (collectionInfo.count > 0) {
      console.log(`⚠️  Collection already contains ${collectionInfo.count} documents.`)
      console.log('🧹 Clearing existing collection to ensure clean data...')
      await chromaStore.clearCollection()
      console.log('✅ Collection cleared successfully')
    }

    // Initialize knowledge base
    console.log('📚 Loading knowledge base from local files...')
    const knowledgeBase = new KnowledgeBase()
    await knowledgeBase.initialize()

    // Get all document chunks
    const chunks = knowledgeBase.getAllDocumentChunks()
    console.log(`📦 Found ${chunks.length} document chunks to upload`)

    if (chunks.length === 0) {
      console.log('❌ No document chunks found. Please ensure your knowledge base is properly configured.')
      return
    }

    // Show breakdown by course type
    const chunksByType = chunks.reduce((acc, chunk) => {
      const type = chunk.metadata.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('📋 Document breakdown by type:')
    Object.entries(chunksByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} chunks`)
    })

    // Upload chunks to ChromaDB Cloud
    console.log('☁️  Uploading chunks to ChromaDB Cloud...')
    const startTime = Date.now()

    await chromaStore.addDocuments(chunks)

    const uploadTime = Date.now() - startTime
    console.log(`⏱️  Upload completed in ${uploadTime}ms`)

    // Verify upload
    const finalInfo = await chromaStore.getCollectionInfo()
    console.log(`✅ Upload completed successfully!`)
    console.log(`📊 Final collection stats:`)
    console.log(`   - Total documents: ${finalInfo.count}`)
    console.log(`   - Collection name: ${finalInfo.name}`)
    console.log(`   - Upload time: ${(uploadTime / 1000).toFixed(2)}s`)

    // Test search functionality
    console.log('🔍 Testing search functionality...')
    const testQueries = [
      'How do I create a basic skirt pattern?',
      'What are the steps for draping?',
      'Adobe Illustrator tools for fashion design'
    ]

    for (const query of testQueries) {
      const testResults = await chromaStore.searchSimilar(query, 3, 0.5)
      console.log(`🎯 Query: "${query}"`)
      console.log(`   Results: ${testResults.length} relevant documents`)
      if (testResults.length > 0) {
        const topResult = testResults[0]
        console.log(`   Top result: ${topResult.metadata.title} (score: ${topResult.score.toFixed(3)})`)
      }
    }

    console.log('🎉 ChromaDB Cloud population completed successfully!')
    console.log('🌐 Your knowledge base is now available in ChromaDB Cloud')
    console.log('💡 You can now use the chatbot with persistent vector storage')

  } catch (error) {
    console.error('❌ Error populating ChromaDB:', error)
    console.error('💡 Troubleshooting tips:')
    console.error('   - Check your CHROMADB_API_KEY in .env.local')
    console.error('   - Check your CHROMADB_TENANT in .env.local')
    console.error('   - Check your CHROMADB_DATABASE in .env.local')
    console.error('   - Ensure your internet connection is stable')
    console.error('   - Verify ChromaDB Cloud service is available')
    console.error('   - Check that your API key has write permissions')
    process.exit(1)
  }
}

// Run the population script
populateChromaDB().catch(console.error)