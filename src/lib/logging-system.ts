import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface QueryLog {
  timestamp: string;
  sessionId: string;
  query: string;
  queryType: 'video-specific' | 'calculation' | 'course-navigation' | 'general' | 'function-calling';
  language: 'en' | 'de';
  responseTime: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    embedding: number;
  };
  vectorResults: {
    found: number;
    relevanceScores: number[];
    topScore: number;
  };
  functionCalls?: {
    functions: string[];
    confidence: number;
    successful: boolean;
    errors?: string[];
  };
  response: {
    length: number;
    hasVideoReference: boolean;
    hasCourseReference: boolean;
    hasCalculation: boolean;
  };
  userSatisfaction?: number; // 1-5 rating if provided
  errors?: string[];
}

export interface SystemMetrics {
  timestamp: string;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  performanceMetrics: {
    avgResponseTime: number;
    totalQueries: number;
    errorRate: number;
    functionCallSuccessRate: number;
  };
  vectorDbHealth: {
    totalChunks: number;
    avgRetrievalTime: number;
    indexHealth: 'healthy' | 'degraded' | 'error';
  };
}

export class LoggingSystem {
  private logsDir: string;
  private currentSessionId: string;

  constructor() {
    this.logsDir = join(process.cwd(), 'logs');
    this.currentSessionId = this.generateSessionId();
    this.ensureLogsDirectory();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureLogsDirectory(): Promise<void> {
    if (!existsSync(this.logsDir)) {
      await mkdir(this.logsDir, { recursive: true });
    }
  }

  /**
   * Log a user query and system response
   */
  async logQuery(queryData: Omit<QueryLog, 'timestamp' | 'sessionId'>): Promise<void> {
    const logEntry: QueryLog = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSessionId,
      ...queryData
    };

    await this.writeLog('queries', logEntry);

    // Log to console for development
    console.log(`[QUERY] ${queryData.queryType} | ${queryData.responseTime}ms | Tokens: ${queryData.tokensUsed.prompt + queryData.tokensUsed.completion}`);
  }

  /**
   * Log system performance metrics
   */
  async logSystemMetrics(metrics: Omit<SystemMetrics, 'timestamp'>): Promise<void> {
    const logEntry: SystemMetrics = {
      timestamp: new Date().toISOString(),
      ...metrics
    };

    await this.writeLog('system-metrics', logEntry);
  }

  /**
   * Log general application events
   */
  async log(level: LogLevel, message: string, metadata?: Record<string, any>): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.currentSessionId,
      metadata
    };

    await this.writeLog('application', logEntry);

    // Console output with color coding
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m'  // Red
    };

    console.log(`${colors[level]}[${level}]\x1b[0m ${message}`, metadata ? metadata : '');
  }

  /**
   * Log function calling activity
   */
  async logFunctionCall(data: {
    query: string;
    functions: string[];
    confidence: number;
    executionTime: number;
    successful: boolean;
    results?: any;
    errors?: string[];
  }): Promise<void> {
    await this.log('INFO', 'Function call executed', {
      type: 'function-call',
      query: data.query,
      functions: data.functions,
      confidence: data.confidence,
      executionTime: data.executionTime,
      successful: data.successful,
      results: data.results,
      errors: data.errors
    });
  }

  /**
   * Log vector database operations
   */
  async logVectorOperation(data: {
    operation: 'search' | 'index' | 'health-check';
    query?: string;
    resultsCount?: number;
    executionTime: number;
    relevanceScores?: number[];
    errors?: string[];
  }): Promise<void> {
    await this.log('DEBUG', `Vector DB ${data.operation}`, {
      type: 'vector-db',
      ...data
    });
  }

  /**
   * Log RAG system performance
   */
  async logRAGOperation(data: {
    query: string;
    retrievalTime: number;
    generationTime: number;
    documentsRetrieved: number;
    chunkSources: string[];
    confidence: number;
  }): Promise<void> {
    await this.log('INFO', 'RAG operation completed', {
      type: 'rag-operation',
      ...data
    });
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<string> {
    try {
      // This would typically read from log files and generate statistics
      const report = {
        timeframe,
        timestamp: new Date().toISOString(),
        summary: {
          totalQueries: 0,
          avgResponseTime: 0,
          errorRate: 0,
          functionCallSuccessRate: 0,
          mostCommonQueryTypes: [],
          topErrors: []
        }
      };

      await this.writeLog('reports', report);

      return `Performance Report (${timeframe}):\n` +
             `- Total Queries: ${report.summary.totalQueries}\n` +
             `- Avg Response Time: ${report.summary.avgResponseTime}ms\n` +
             `- Error Rate: ${report.summary.errorRate}%\n` +
             `- Function Call Success Rate: ${report.summary.functionCallSuccessRate}%`;

    } catch (error) {
      await this.log('ERROR', 'Failed to generate performance report', { error: error.message });
      return 'Error generating performance report';
    }
  }

  /**
   * Health check for the logging system
   */
  async healthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if logs directory is writable
      await this.writeLog('health-check', { test: true });

      // Check memory usage
      const memUsage = process.memoryUsage();
      if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        issues.push('High memory usage detected');
      }

      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Logging system error: ${error.message}`);
      return { healthy: false, issues };
    }
  }

  /**
   * Start new session
   */
  startNewSession(): string {
    this.currentSessionId = this.generateSessionId();
    this.log('INFO', 'New session started', { sessionId: this.currentSessionId });
    return this.currentSessionId;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.currentSessionId;
  }

  /**
   * Write log entry to file
   */
  private async writeLog(logType: string, data: any): Promise<void> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${logType}-${date}.jsonl`;
      const filepath = join(this.logsDir, filename);

      const logLine = JSON.stringify(data) + '\n';
      await writeFile(filepath, logLine, { flag: 'a' });

    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }
}

// Singleton instance
export const logger = new LoggingSystem();

// Performance monitoring middleware
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => number {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  /**
   * Record a metric value
   */
  recordMetric(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }

    const values = this.metrics.get(metric)!;
    values.push(value);

    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get metric statistics
   */
  getMetricStats(metric: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};

    for (const [metric, values] of this.metrics) {
      const stats = this.getMetricStats(metric);
      if (stats) {
        result[metric] = stats;
      }
    }

    return result;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();