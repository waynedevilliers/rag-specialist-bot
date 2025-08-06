import { NextRequest, NextResponse } from 'next/server'
import { knowledgeBase } from '@/lib/knowledge-base'
import { vectorStore } from '@/lib/vector-store'
import { KnowledgeUpdateService, UpdateSource } from '@/lib/knowledge-update-service'
import { SecurityValidator, SecurityError } from '@/lib/security-validator'

// Initialize the update service
const updateService = new KnowledgeUpdateService(knowledgeBase, vectorStore)

export async function POST(req: NextRequest) {
  try {
    // Security validation for request
    const contentLength = req.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({
        error: 'Request too large'
      }, { status: 413 })
    }

    const body = await req.json()
    
    // Validate required fields
    if (!body.action) {
      return NextResponse.json({
        error: 'Action is required'
      }, { status: 400 })
    }

    switch (body.action) {
      case 'add':
        return await handleAddContent(body)
      
      case 'update':
        return await handleUpdateContent(body)
      
      case 'remove':
        return await handleRemoveContent(body)
      
      case 'restore':
        return await handleRestoreBackup(body)
      
      case 'status':
        return await handleGetStatus()
      
      case 'backups':
        return await handleGetBackups()
      
      case 'statistics':
        return await handleGetStatistics()
      
      default:
        return NextResponse.json({
          error: `Unknown action: ${body.action}`
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Knowledge update API error:', error)
    
    if (error instanceof SecurityError) {
      return NextResponse.json({
        error: 'Security validation failed',
        details: error.message
      }, { status: 403 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function handleAddContent(body: Record<string, unknown>) {
  try {
    // Validate required fields for add action
    if (!body.source) {
      return NextResponse.json({
        error: 'Source is required for add action'
      }, { status: 400 })
    }

    // Security validation
    const sourceData = body.source as any
    SecurityValidator.validateQuery(sourceData?.content || '')
    if (sourceData?.metadata?.title) {
      SecurityValidator.validateQuery(sourceData.metadata.title)
    }

    const source: UpdateSource = {
      type: sourceData.type || 'text',
      content: sourceData.content,
      metadata: {
        title: sourceData.metadata?.title || 'Untitled Content',
        courseType: sourceData.metadata?.courseType || 'construction',
        courseNumber: sourceData.metadata?.courseNumber || '999',
        source: sourceData.metadata?.source,
        author: sourceData.metadata?.author,
        lastModified: new Date().toISOString()
      }
    }

    const result = await updateService.addContent(source)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        chunksAdded: result.chunksAdded,
        chunksUpdated: result.chunksUpdated,
        chunksRemoved: result.chunksRemoved,
        vectorsUpdated: result.vectorsUpdated,
        backupId: result.backupId
      },
      errors: result.errors
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Error in handleAddContent:', error)
    return NextResponse.json({
      error: 'Failed to add content'
    }, { status: 500 })
  }
}

async function handleUpdateContent(body: Record<string, unknown>) {
  try {
    if (!body.sourceId || !body.source) {
      return NextResponse.json({
        error: 'Source ID and source are required for update action'
      }, { status: 400 })
    }

    // Security validation
    const sourceData = body.source as any
    SecurityValidator.validateQuery(sourceData?.content || '')
    SecurityValidator.validateQuery(body.sourceId as string)

    const source: UpdateSource = {
      type: sourceData.type || 'text',
      content: sourceData.content,
      metadata: {
        title: sourceData.metadata?.title || 'Updated Content',
        courseType: sourceData.metadata?.courseType || 'construction',
        courseNumber: sourceData.metadata?.courseNumber || '999',
        source: sourceData.metadata?.source,
        author: sourceData.metadata?.author,
        lastModified: new Date().toISOString()
      }
    }

    const result = await updateService.updateContent(body.sourceId as string, source)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        chunksAdded: result.chunksAdded,
        chunksUpdated: result.chunksUpdated,
        chunksRemoved: result.chunksRemoved,
        vectorsUpdated: result.vectorsUpdated,
        backupId: result.backupId
      },
      errors: result.errors
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Error in handleUpdateContent:', error)
    return NextResponse.json({
      error: 'Failed to update content'
    }, { status: 500 })
  }
}

async function handleRemoveContent(body: Record<string, unknown>) {
  try {
    if (!body.sourceId) {
      return NextResponse.json({
        error: 'Source ID is required for remove action'
      }, { status: 400 })
    }

    // Security validation
    SecurityValidator.validateQuery(body.sourceId as string)

    const result = await updateService.removeContent(body.sourceId as string)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        chunksAdded: result.chunksAdded,
        chunksUpdated: result.chunksUpdated,
        chunksRemoved: result.chunksRemoved,
        vectorsUpdated: result.vectorsUpdated,
        backupId: result.backupId
      },
      errors: result.errors
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Error in handleRemoveContent:', error)
    return NextResponse.json({
      error: 'Failed to remove content'
    }, { status: 500 })
  }
}

async function handleRestoreBackup(body: Record<string, unknown>) {
  try {
    if (!body.backupId) {
      return NextResponse.json({
        error: 'Backup ID is required for restore action'
      }, { status: 400 })
    }

    // Security validation
    SecurityValidator.validateQuery(body.backupId as string)

    const result = await updateService.restoreFromBackup(body.backupId as string)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: {
        chunksAdded: result.chunksAdded,
        chunksUpdated: result.chunksUpdated,
        chunksRemoved: result.chunksRemoved,
        vectorsUpdated: result.vectorsUpdated
      },
      errors: result.errors
    }, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Error in handleRestoreBackup:', error)
    return NextResponse.json({
      error: 'Failed to restore backup'
    }, { status: 500 })
  }
}

async function handleGetStatus() {
  try {
    const isUpdating = updateService.isUpdateInProgress()
    const statistics = updateService.getStatistics()
    
    return NextResponse.json({
      success: true,
      data: {
        isUpdating,
        statistics
      }
    })
  } catch (error) {
    console.error('Error in handleGetStatus:', error)
    return NextResponse.json({
      error: 'Failed to get status'
    }, { status: 500 })
  }
}

async function handleGetBackups() {
  try {
    const backups = updateService.getBackups()
    
    return NextResponse.json({
      success: true,
      data: {
        backups
      }
    })
  } catch (error) {
    console.error('Error in handleGetBackups:', error)
    return NextResponse.json({
      error: 'Failed to get backups'
    }, { status: 500 })
  }
}

async function handleGetStatistics() {
  try {
    const statistics = updateService.getStatistics()
    const vectorOptimization = vectorStore.getOptimizationStats()
    const cacheStats = vectorStore.getCacheStats()
    
    return NextResponse.json({
      success: true,
      data: {
        knowledgeBase: statistics,
        vectorStore: vectorOptimization,
        cache: cacheStats,
        performance: {
          indexingType: vectorOptimization.indexType,
          searchComplexity: vectorOptimization.performance.searchComplexity,
          memoryOptimization: `${Math.round(vectorOptimization.memoryUsage.compressionRatio * 100) / 100}x compression`,
          cacheHitRate: 'Available in production'
        }
      }
    })
  } catch (error) {
    console.error('Error in handleGetStatistics:', error)
    return NextResponse.json({
      error: 'Failed to get statistics'
    }, { status: 500 })
  }
}

// GET endpoint for status and statistics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'backups':
        return await handleGetBackups()
      
      case 'statistics':
        return await handleGetStatistics()
      
      default:
        return await handleGetStatus()
    }
  } catch (error) {
    console.error('Knowledge update GET API error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}