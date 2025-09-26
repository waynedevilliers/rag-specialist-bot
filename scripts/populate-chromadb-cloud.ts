#!/usr/bin/env npx tsx

/**
 * Full ChromaDB Cloud population with all knowledge base data
 * Run with: npx tsx scripts/populate-chromadb-cloud.ts
 */

// Load environment variables
import { config } from 'dotenv'
import { join } from 'path'

config({ path: join(process.cwd(), '.env.local') })

import { CloudClient } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { KnowledgeBase } from '../src/lib/knowledge-base'

async function populateChromaDBCloud() {
  console.log('🚀 Starting full ChromaDB Cloud population...')
  console.log('🔑 Using ChromaDB Cloud credentials')

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

    console.log('📡 Connecting to ChromaDB Cloud...')
    await client.heartbeat()
    console.log('✅ ChromaDB Cloud connection successful')

    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'text-embedding-3-small',
      dimensions: 1536
    })

    const collectionName = 'fashion_design_knowledge'

    // Check if collection exists and clear it for fresh data
    let collection
    try {
      collection = await client.getCollection({ name: collectionName })
      const count = await collection.count()
      console.log(`📊 Found existing collection with ${count} documents`)

      if (count > 0) {
        console.log('🧹 Clearing existing collection for fresh data...')
        await client.deleteCollection({ name: collectionName })
        console.log('✅ Existing collection cleared')

        // Create fresh collection after clearing
        collection = await client.createCollection({
          name: collectionName,
          metadata: {
            description: 'Fashion design knowledge base for ELLU Studios courses',
            created_at: new Date().toISOString(),
            version: '1.0'
          }
        })
        console.log('✅ Created fresh collection')
      } else {
        console.log('📝 Collection exists but is empty, reusing it')
      }
    } catch (error) {
      console.log(`📝 Collection doesn't exist, creating new one`)

      // Create fresh collection
      collection = await client.createCollection({
        name: collectionName,
        metadata: {
          description: 'Fashion design knowledge base for ELLU Studios courses',
          created_at: new Date().toISOString(),
          version: '1.0'
        }
      })
      console.log('✅ Created new collection')
    }

    // Load knowledge base
    console.log('📚 Loading knowledge base from local files...')
    const knowledgeBase = new KnowledgeBase()
    await knowledgeBase.loadDocuments()

    const chunks = knowledgeBase.getChunks()
    console.log(`📦 Found ${chunks.length} document chunks to upload`)

    if (chunks.length === 0) {
      console.error('❌ No document chunks found')
      process.exit(1)
    }

    // Show breakdown by course type
    const chunksByType = chunks.reduce((acc, chunk) => {
      const type = chunk.metadata.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('📋 Document breakdown by course type:')
    Object.entries(chunksByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} chunks`)
    })

    // Process in batches to avoid memory issues and API limits
    console.log('☁️  Uploading chunks to ChromaDB Cloud...')
    const batchSize = 50
    const startTime = Date.now()
    let uploadedCount = 0

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      console.log(`📤 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} chunks)...`)

      // Prepare batch data
      const documents = batch.map(chunk => chunk.content)
      const ids = batch.map(chunk => chunk.id)
      const metadatas = batch.map(chunk => ({
        section: chunk.section,
        title: chunk.metadata.title,
        type: chunk.metadata.type,
        courseNumber: chunk.metadata.courseNumber,
        moduleNumber: chunk.metadata.moduleNumber,
        content_preview: chunk.content.substring(0, 100) + '...'
      }))

      // Generate embeddings for batch
      const batchEmbeddings = await embeddings.embedDocuments(documents)

      // Upload to ChromaDB
      await collection.add({
        ids,
        documents,
        embeddings: batchEmbeddings,
        metadatas
      })

      uploadedCount += batch.length
      console.log(`✅ Uploaded ${uploadedCount}/${chunks.length} chunks`)

      // Add small delay to be kind to the API
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    const uploadTime = Date.now() - startTime
    console.log(`⏱️  Upload completed in ${(uploadTime / 1000).toFixed(2)}s`)

    // Verify final upload
    const finalCount = await collection.count()
    console.log(`📊 Final verification: ${finalCount} documents in collection`)

    if (finalCount !== chunks.length) {
      console.warn(`⚠️  Count mismatch: Expected ${chunks.length}, got ${finalCount}`)
    }

    // Test comprehensive search functionality
    console.log('🔍 Testing search functionality with various queries...')

    const testQueries = [
      'How do I create a basic skirt pattern?',
      'What are the steps for draping a dress?',
      'Adobe Illustrator tools for fashion design',
      'Pattern construction techniques',
      'Fabric preparation for sewing',
      'Wie erstelle ich ein Schnittmuster?', // German test
      'Drapieren Grundlagen'  // German test
    ]

    for (const query of testQueries) {
      try {
        const queryEmbedding = await embeddings.embedQuery(query)
        const searchResults = await collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: 3,
          include: ['documents', 'metadatas', 'distances']
        })

        console.log(`🎯 Query: "${query}"`)
        console.log(`   Results: ${searchResults.ids?.[0]?.length || 0}`)

        if (searchResults.documents?.[0] && searchResults.distances?.[0]) {
          const topResult = searchResults.documents[0][0]
          const topDistance = searchResults.distances[0][0]
          const similarity = topDistance ? 1 - topDistance : 0
          const metadata = searchResults.metadatas?.[0]?.[0] as any

          console.log(`   Top result: "${metadata?.title || 'Unknown'}" (similarity: ${similarity.toFixed(3)})`)
        }
      } catch (error) {
        console.error(`   ❌ Search failed for query: ${query}`)
      }
    }

    console.log('🎉 ChromaDB Cloud population completed successfully!')
    console.log('📈 Final Statistics:')
    console.log(`   - Total documents uploaded: ${finalCount}`)
    console.log(`   - Upload time: ${(uploadTime / 1000).toFixed(2)}s`)
    console.log(`   - Average per document: ${((uploadTime / chunks.length)).toFixed(0)}ms`)
    console.log(`   - Collection name: ${collectionName}`)
    console.log(`   - Database: ${process.env.CHROMADB_DATABASE || 'ellu-studios-chat-bot'}`)
    console.log('')
    console.log('🌐 Your knowledge base is now fully available in ChromaDB Cloud!')
    console.log('💡 You can now use the chatbot with persistent vector storage')
    console.log('🎯 Try asking questions about fashion design, draping, or Adobe Illustrator')

  } catch (error) {
    console.error('❌ Error during ChromaDB Cloud population:', error)
    process.exit(1)
  }
}

populateChromaDBCloud().catch(console.error)