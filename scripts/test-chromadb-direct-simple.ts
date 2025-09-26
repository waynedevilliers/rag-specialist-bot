#!/usr/bin/env npx tsx

/**
 * Simple test to verify ChromaDB is working
 */

import { config } from 'dotenv'
import { join } from 'path'
config({ path: join(process.cwd(), '.env.local') })

import { CloudClient } from 'chromadb'
import { OpenAIEmbeddings } from '@langchain/openai'

async function testChromaDBSimple() {
  console.log('🔍 Testing ChromaDB Cloud direct access...')

  try {
    const client = new CloudClient({
      apiKey: process.env.CHROMADB_API_KEY,
      tenant: process.env.CHROMADB_TENANT,
      database: process.env.CHROMADB_DATABASE || 'ellu-studios-chat-bot'
    })

    // Test connection
    await client.heartbeat()
    console.log('✅ ChromaDB connection successful')

    // Get collection
    const collection = await client.getCollection({ name: 'fashion_design_knowledge' })
    const count = await collection.count()
    console.log(`📊 Collection has ${count} documents`)

    if (count === 0) {
      console.log('❌ ChromaDB Cloud collection is empty!')
      return false
    }

    // Test search with existing embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY || '',
      modelName: 'text-embedding-3-small',
      dimensions: 1536
    })

    const query = "How to create a skirt pattern?"
    const queryEmbedding = await embeddings.embedQuery(query)

    const searchResults = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 3,
      include: ['documents', 'metadatas', 'distances']
    })

    console.log(`🔍 Search results for "${query}":`)
    console.log(`   Found: ${searchResults.ids?.[0]?.length || 0} results`)

    if (searchResults.metadatas?.[0]) {
      searchResults.metadatas[0].forEach((meta: any, idx: number) => {
        const distance = searchResults.distances?.[0]?.[idx] || 1
        const similarity = 1 - distance
        console.log(`   ${idx + 1}. ${meta.title} (similarity: ${similarity.toFixed(3)})`)
      })
    }

    console.log('✅ ChromaDB Cloud is working perfectly!')
    return true

  } catch (error) {
    console.error('❌ ChromaDB test failed:', error)
    return false
  }
}

testChromaDBSimple().then(success => {
  console.log(success ? '\n🎉 RESULT: ChromaDB Cloud is functional' : '\n💔 RESULT: ChromaDB Cloud has issues')
  process.exit(success ? 0 : 1)
})