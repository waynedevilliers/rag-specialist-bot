'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface UpdateResult {
  success: boolean
  message: string
  data?: {
    chunksAdded: number
    chunksUpdated: number
    chunksRemoved: number
    vectorsUpdated: number
    backupId?: string
  }
  errors?: string[]
}

interface KnowledgeBaseStats {
  totalChunks: number
  vectorCount: number
  backupCount: number
  lastUpdate?: number
  courseTypes: Record<string, number>
}

interface BackupInfo {
  id: string
  timestamp: number
  description: string
  chunkCount: number
}

export default function KnowledgeUpdateManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<UpdateResult | null>(null)
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Form state
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [courseType, setCourseType] = useState<string>('construction')
  const [courseNumber, setCourseNumber] = useState('')
  const [updateType, setUpdateType] = useState<'add' | 'update' | 'remove'>('add')
  const [sourceId, setSourceId] = useState('')

  useEffect(() => {
    loadStats()
    loadBackups()
    checkUpdateStatus()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch('/api/knowledge-update?action=statistics')
      const data = await response.json()
      if (data.success) {
        setStats(data.data.knowledgeBase)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/knowledge-update?action=backups')
      const data = await response.json()
      if (data.success) {
        setBackups(data.data.backups)
      }
    } catch (error) {
      console.error('Error loading backups:', error)
    }
  }

  const checkUpdateStatus = async () => {
    try {
      const response = await fetch('/api/knowledge-update?action=status')
      const data = await response.json()
      if (data.success) {
        setIsUpdating(data.data.isUpdating)
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const payload: Record<string, unknown> = {
        action: updateType
      }

      if (updateType === 'remove') {
        payload.sourceId = sourceId
      } else {
        if (updateType === 'update') {
          payload.sourceId = sourceId
        }
        payload.source = {
          type: 'text',
          content: content,
          metadata: {
            title: title || 'Untitled Content',
            courseType: courseType,
            courseNumber: courseNumber || '999'
          }
        }
      }

      const response = await fetch('/api/knowledge-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        // Refresh stats and backups
        await loadStats()
        await loadBackups()
        
        // Clear form on success
        if (updateType === 'add') {
          setContent('')
          setTitle('')
          setCourseNumber('')
        }
      }
    } catch (error) {
      console.error('Error submitting update:', error)
      setResult({
        success: false,
        message: 'Failed to submit update. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/knowledge-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'restore',
          backupId: backupId
        })
      })

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        await loadStats()
        await loadBackups()
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      setResult({
        success: false,
        message: 'Failed to restore backup. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base Management</h1>
        <p className="text-gray-600">Manage your fashion course knowledge base in real-time</p>
      </div>

      {/* Status Alert */}
      {isUpdating && (
        <Alert className="mb-6">
          <AlertDescription>
            Knowledge base update is currently in progress. Please wait for it to complete.
          </AlertDescription>
        </Alert>
      )}

      {/* Result Alert */}
      {result && (
        <Alert className={`mb-6 ${result.success ? 'border-green-500' : 'border-red-500'}`}>
          <AlertDescription>
            <div className="font-medium">{result.message}</div>
            {result.data && (
              <div className="mt-2 text-sm">
                Added: {result.data.chunksAdded}, Updated: {result.data.chunksUpdated}, 
                Removed: {result.data.chunksRemoved}, Vectors: {result.data.vectorsUpdated}
                {result.data.backupId && <div>Backup ID: {result.data.backupId}</div>}
              </div>
            )}
            {result.errors && (
              <div className="mt-2 text-sm text-red-600">
                {result.errors.join(', ')}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="stats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="update">Update Content</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Statistics Tab */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base Overview</CardTitle>
                <CardDescription>Current state of your fashion knowledge base</CardDescription>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Chunks:</span>
                      <Badge variant="outline">{stats.totalChunks}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Vector Count:</span>
                      <Badge variant="outline">{stats.vectorCount}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Backups:</span>
                      <Badge variant="outline">{stats.backupCount}</Badge>
                    </div>
                    {stats.lastUpdate && (
                      <div className="flex justify-between">
                        <span>Last Update:</span>
                        <span className="text-sm">{formatTimestamp(stats.lastUpdate)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Loading statistics...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Course Types</CardTitle>
                <CardDescription>Distribution of content by course type</CardDescription>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="space-y-3">
                    {Object.entries(stats.courseTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('-', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>Loading course types...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Update Content Tab */}
        <TabsContent value="update">
          <Card>
            <CardHeader>
              <CardTitle>Update Knowledge Base</CardTitle>
              <CardDescription>Add, update, or remove content from your knowledge base</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="updateType">Update Type</Label>
                    <Select value={updateType} onValueChange={(value: string) => setUpdateType(value as 'add' | 'update' | 'remove')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add New Content</SelectItem>
                        <SelectItem value="update">Update Existing Content</SelectItem>
                        <SelectItem value="remove">Remove Content</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(updateType === 'update' || updateType === 'remove') && (
                    <div>
                      <Label htmlFor="sourceId">Source ID</Label>
                      <Input
                        id="sourceId"
                        placeholder="Enter source ID to update/remove"
                        value={sourceId}
                        onChange={(e) => setSourceId(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {updateType !== 'remove' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">Content Title</Label>
                        <Input
                          id="title"
                          placeholder="Enter content title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="courseType">Course Type</Label>
                        <Select value={courseType} onValueChange={setCourseType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pattern-making">Pattern Making</SelectItem>
                            <SelectItem value="illustrator-fashion">Illustrator Fashion</SelectItem>
                            <SelectItem value="draping">Draping</SelectItem>
                            <SelectItem value="construction">Construction</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="courseNumber">Course Number</Label>
                      <Input
                        id="courseNumber"
                        placeholder="e.g., 101, 201, 301"
                        value={courseNumber}
                        onChange={(e) => setCourseNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Enter your fashion course content here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                        required
                      />
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  disabled={isLoading || isUpdating}
                  className="w-full"
                >
                  {isLoading ? 'Processing...' : `${updateType.charAt(0).toUpperCase() + updateType.slice(1)} Content`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Backups</CardTitle>
              <CardDescription>Manage and restore knowledge base backups</CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length > 0 ? (
                <div className="space-y-4">
                  {backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{backup.description}</div>
                        <div className="text-sm text-gray-600">
                          {formatTimestamp(backup.timestamp)} • {backup.chunkCount} chunks
                        </div>
                        <div className="text-xs text-gray-500">ID: {backup.id}</div>
                      </div>
                      <Button
                        onClick={() => handleRestore(backup.id)}
                        disabled={isLoading || isUpdating}
                        variant="outline"
                        size="sm"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No backups available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Actions</CardTitle>
                <CardDescription>Advanced operations for system maintenance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={loadStats} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    Refresh Statistics
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={checkUpdateStatus} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    Check Update Status
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Guidelines</CardTitle>
                <CardDescription>Best practices for knowledge base updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2 text-gray-600">
                  <p>• Always create backups before major updates</p>
                  <p>• Use descriptive titles for better organization</p>
                  <p>• Choose appropriate course types and numbers</p>
                  <p>• Keep content focused on fashion education</p>
                  <p>• Monitor system performance after updates</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}