#!/usr/bin/env npx tsx

/**
 * Direct ChromaDB Cloud test - bypasses the existing store
 * Run with: npx tsx scripts/test-chromadb-direct.ts
 */

// Load environment variables
import { config } from 'dotenv'
import { join } from 'path'

config({ path: join(process.cwd(), '.env.local') })

import { CloudClient } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'

async function testChromaDBDirect() {
  console.log('🚀 Testing ChromaDB Cloud direct connection...')
  console.log('🔑 Environment check:')
  console.log(`   - CHROMADB_API_KEY: ${process.env.CHROMADB_API_KEY ? 'present' : 'missing'}`)
  console.log(`   - CHROMADB_TENANT: ${process.env.CHROMADB_TENANT ? 'present' : 'missing'}`)
  console.log(`   - CHROMADB_DATABASE: ${process.env.CHROMADB_DATABASE || 'not set'}`)

  if (!process.env.CHROMADB_API_KEY || !process.env.CHROMADB_TENANT) {
    console.error('❌ Missing ChromaDB credentials')
    process.exit(1)
  }

  try {
    // Create CloudClient directly
    const client = new CloudClient({
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE || 'ellu-studios-chat-bot'
    })

    console.log('📡 Testing ChromaDB Cloud connection...')

    // Test heartbeat
    await client.heartbeat()
    console.log('✅ ChromaDB Cloud connection successful')

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'text-embedding-3-small',
      dimensions: 1536
    })

    const collectionName = 'fashion_design_knowledge'

    // Try to get collection
    let collection
    try {
      collection = await client.getCollection({ name: collectionName })
      console.log(`📊 Found existing collection: ${collectionName}`)

      // Get count
      const count = await collection.count()
      console.log(`📦 Collection has ${count} documents`)

      if (count > 0) {
        console.log('✅ ChromaDB Cloud already has data!')

        // Test a search
        const queryText = 'How to create a skirt pattern?'
        const queryEmbedding = await embeddings.embedQuery(queryText)

        const searchResults = await collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: 3
        })

        console.log(`🔍 Test search for "${queryText}":`)
        console.log(`   Found ${searchResults.ids?.[0]?.length || 0} results`)

        return
      }

    } catch (error) {
      console.log(`📝 Collection doesn't exist, will create: ${collectionName}`)

      // Create collection
      collection = await client.createCollection({
        name: collectionName,
        metadata: {
          description: 'Fashion design knowledge base for ELLU Studios courses'
        }
      })
      console.log('✅ Created new collection')
    }

    // Load a small test document
    console.log('📚 Adding test document...')

    const testDocuments = [
      'Fashion design involves creating clothing patterns and garments.',
      'Draping is a technique where fabric is pinned and shaped directly on a dress form.',
      'Pattern making involves creating templates for cutting fabric pieces.'
    ]

    const testEmbeddings = await embeddings.embedDocuments(testDocuments)

    await collection.add({
      ids: ['test-1', 'test-2', 'test-3'],
      documents: testDocuments,
      embeddings: testEmbeddings,
      metadatas: [
        { type: 'test', title: 'Fashion Basics' },
        { type: 'test', title: 'Draping Techniques' },
        { type: 'test', title: 'Pattern Making' }
      ]
    })

    console.log('✅ Test documents added successfully')

    // Test search
    const queryText = 'What is draping?'
    const queryEmbedding = await embeddings.embedQuery(queryText)

    const searchResults = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 2,
      include: ['documents', 'metadatas', 'distances']
    })

    console.log(`🔍 Test search for "${queryText}":`)
    console.log(`   Results: ${searchResults.ids?.[0]?.length || 0}`)

    if (searchResults.documents?.[0] && searchResults.distances?.[0]) {
      searchResults.documents[0].forEach((doc, idx) => {
        const distance = searchResults.distances![0][idx]
        const similarity = 1 - distance
        console.log(`   - "${doc}" (similarity: ${similarity.toFixed(3)})`)
      })
    }

    console.log('🎉 ChromaDB Cloud test completed successfully!')
    console.log('✅ Your ChromaDB Cloud is working and ready for full population')

  } catch (error) {
    console.error('❌ Error testing ChromaDB Cloud:', error)
    process.exit(1)
  }
}

testChromaDBDirect().catch(console.error)