'use client'

import { useEffect, useState } from 'react'

interface DashboardData {
  timestamp: string
  health: {
    systemHealth: boolean
    issues: string[]
  }
  stats: {
    totalQueries: number
    totalErrors: number
    avgResponseTime: number
    errorRate: number
  }
  metrics: Record<string, { avg: number; min: number; max: number; count: number }>
  recentActivity: Array<{
    timestamp: string
    level: string
    message: string
    type: string
    responseTime?: number
  }>
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/logs?action=dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setDashboardData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    const interval = setInterval(fetchDashboardData, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [refreshInterval])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) return null

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ELLU System Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
            <div className="text-sm text-gray-500">
              Last updated: {formatTime(dashboardData.timestamp)}
            </div>
          </div>
        </div>

        {/* Health Status */}
        <div className="mb-6">
          <div className={`p-4 rounded-lg ${dashboardData.health.systemHealth ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${dashboardData.health.systemHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`font-semibold ${dashboardData.health.systemHealth ? 'text-green-800' : 'text-red-800'}`}>
                System {dashboardData.health.systemHealth ? 'Healthy' : 'Issues Detected'}
              </span>
            </div>
            {dashboardData.health.issues.length > 0 && (
              <div className="mt-2">
                {dashboardData.health.issues.map((issue, index) => (
                  <div key={index} className="text-red-600 text-sm">{issue}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Queries</div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalQueries}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Avg Response Time</div>
            <div className="text-2xl font-bold text-gray-900">{dashboardData.stats.avgResponseTime}ms</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Error Rate</div>
            <div className={`text-2xl font-bold ${dashboardData.stats.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {dashboardData.stats.errorRate}%
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Errors</div>
            <div className="text-2xl font-bold text-red-600">{dashboardData.stats.totalErrors}</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.metrics).map(([metric, data]) => (
                <div key={metric} className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">{metric.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-medium">
                    Avg: {Math.round(data.avg)}ms ({data.count} samples)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-2">
              {dashboardData.recentActivity.map((activity, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.level === 'ERROR' ? 'bg-red-500' :
                      activity.level === 'WARN' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="text-sm">{activity.message.substring(0, 50)}...</div>
                  </div>
                  <div className="text-xs text-gray-500">{formatTime(activity.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => window.open('/api/logs?action=health', '_blank')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Health Check
            </button>
            <button
              onClick={() => window.open('/api/logs?action=metrics', '_blank')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Performance Metrics
            </button>
            <button
              onClick={() => window.open('/api/logs?action=report', '_blank')}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              Performance Report
            </button>
            <button
              onClick={() => window.open('/api/logs?action=logs&type=application', '_blank')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}