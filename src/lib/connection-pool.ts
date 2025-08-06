/**
 * API Connection Pool Manager
 * 
 * Provides connection pooling, request queuing, and retry logic for API calls.
 * Improves performance by reusing HTTP connections and managing rate limits.
 */

import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

interface PoolConfig {
  maxSockets: number;
  keepAlive: boolean;
  keepAliveMsecs: number;
  timeout: number;
}

interface RequestQueue {
  id: string;
  request: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  retries: number;
  maxRetries: number;
  timestamp: number;
}

interface RateLimitInfo {
  requestsPerMinute: number;
  currentRequests: number;
  resetTime: number;
  windowStart: number;
}

export class ConnectionPoolManager {
  private httpAgent: HttpAgent;
  private httpsAgent: HttpsAgent;
  private requestQueue: Map<string, RequestQueue[]> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private isProcessing = false;

  // Default configuration optimized for AI API calls
  private defaultConfig: PoolConfig = {
    maxSockets: 10,           // Maximum concurrent connections per host
    keepAlive: true,          // Reuse connections
    keepAliveMsecs: 30000,    // Keep connections alive for 30s
    timeout: 45000            // 45s timeout for AI API calls
  };

  constructor(config?: Partial<PoolConfig>) {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Create HTTP agents with connection pooling
    this.httpAgent = new HttpAgent({
      maxSockets: finalConfig.maxSockets,
      keepAlive: finalConfig.keepAlive,
      keepAliveMsecs: finalConfig.keepAliveMsecs,
      timeout: finalConfig.timeout
    });

    this.httpsAgent = new HttpsAgent({
      maxSockets: finalConfig.maxSockets,
      keepAlive: finalConfig.keepAlive,
      keepAliveMsecs: finalConfig.keepAliveMsecs,
      timeout: finalConfig.timeout
    });

    // Initialize rate limits for common AI providers
    this.initializeRateLimits();
    
    // Start processing queue
    this.processQueue();
  }

  private initializeRateLimits(): void {
    // OpenAI rate limits (adjust based on your tier)
    this.rateLimits.set('openai', {
      requestsPerMinute: 60,    // Tier 1 limit
      currentRequests: 0,
      resetTime: Date.now() + 60000,
      windowStart: Date.now()
    });

    // Anthropic rate limits
    this.rateLimits.set('anthropic', {
      requestsPerMinute: 50,
      currentRequests: 0,
      resetTime: Date.now() + 60000,
      windowStart: Date.now()
    });

    // Google Gemini rate limits
    this.rateLimits.set('gemini', {
      requestsPerMinute: 60,
      currentRequests: 0,
      resetTime: Date.now() + 60000,
      windowStart: Date.now()
    });
  }

  /**
   * Get HTTP agent for connection pooling
   */
  getHttpAgent(secure: boolean = true): HttpAgent | HttpsAgent {
    return secure ? this.httpsAgent : this.httpAgent;
  }

  /**
   * Queue a request with automatic retry and rate limiting
   */
  async queueRequest<T>(
    provider: string,
    requestFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queueItem: RequestQueue = {
        id: requestId,
        request: requestFn,
        resolve,
        reject,
        retries: 0,
        maxRetries,
        timestamp: Date.now()
      };

      // Add to provider queue
      if (!this.requestQueue.has(provider)) {
        this.requestQueue.set(provider, []);
      }
      this.requestQueue.get(provider)!.push(queueItem);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.hasQueuedRequests()) {
      // Process each provider's queue
      for (const [provider, queue] of this.requestQueue.entries()) {
        if (queue.length === 0) continue;

        // Check rate limits
        if (!this.canMakeRequest(provider)) {
          continue; // Skip this provider for now
        }

        // Get next request
        const request = queue.shift()!;
        this.incrementRequestCount(provider);

        // Process request with retry logic
        try {
          const result = await this.executeWithRetry(request);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }

        // Small delay between requests to avoid overwhelming APIs
        await this.delay(100);
      }

      // Update rate limit windows
      this.updateRateLimitWindows();
      
      // Short pause before next iteration
      await this.delay(50);
    }

    this.isProcessing = false;
  }

  private async executeWithRetry(request: RequestQueue): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= request.maxRetries; attempt++) {
      try {
        const result = await request.request();
        
        // Log successful retry if it wasn't the first attempt
        if (attempt > 0) {
          console.log(`[ConnectionPool] Request ${request.id} succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        request.retries = attempt + 1;

        // Don't retry on final attempt
        if (attempt === request.maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
        console.warn(`[ConnectionPool] Request ${request.id} failed (attempt ${attempt + 1}), retrying in ${Math.round(delay)}ms:`, error instanceof Error ? error.message : String(error));
        
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  private canMakeRequest(provider: string): boolean {
    const rateLimit = this.rateLimits.get(provider);
    if (!rateLimit) return true;

    const now = Date.now();
    
    // Reset window if it's expired
    if (now >= rateLimit.resetTime) {
      rateLimit.currentRequests = 0;
      rateLimit.windowStart = now;
      rateLimit.resetTime = now + 60000; // 1 minute window
    }

    return rateLimit.currentRequests < rateLimit.requestsPerMinute;
  }

  private incrementRequestCount(provider: string): void {
    const rateLimit = this.rateLimits.get(provider);
    if (rateLimit) {
      rateLimit.currentRequests++;
    }
  }

  private updateRateLimitWindows(): void {
    const now = Date.now();
    
    for (const [provider, rateLimit] of this.rateLimits.entries()) {
      if (now >= rateLimit.resetTime) {
        rateLimit.currentRequests = 0;
        rateLimit.windowStart = now;
        rateLimit.resetTime = now + 60000;
      }
    }
  }

  private hasQueuedRequests(): boolean {
    for (const queue of this.requestQueue.values()) {
      if (queue.length > 0) return true;
    }
    return false;
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection pool statistics
   */
  getStats(): {
    queueSizes: Record<string, number>;
    rateLimits: Record<string, { current: number; limit: number; resetIn: number }>;
    connections: {
      http: { created: number; destroyed: number; free: number; pending: number };
      https: { created: number; destroyed: number; free: number; pending: number };
    };
  } {
    const queueSizes: Record<string, number> = {};
    for (const [provider, queue] of this.requestQueue.entries()) {
      queueSizes[provider] = queue.length;
    }

    const rateLimitStats: Record<string, any> = {};
    const now = Date.now();
    for (const [provider, rateLimit] of this.rateLimits.entries()) {
      rateLimitStats[provider] = {
        current: rateLimit.currentRequests,
        limit: rateLimit.requestsPerMinute,
        resetIn: Math.max(0, rateLimit.resetTime - now)
      };
    }

    return {
      queueSizes,
      rateLimits: rateLimitStats,
      connections: {
        http: {
          created: Array.isArray(this.httpAgent.requests) ? this.httpAgent.requests.length : (this.httpAgent.requests ? Object.keys(this.httpAgent.requests).length : 0),
          destroyed: 0,
          free: this.httpAgent.freeSockets ? Object.keys(this.httpAgent.freeSockets).length : 0,
          pending: this.httpAgent.requests ? Object.keys(this.httpAgent.requests).length : 0
        },
        https: {
          created: Array.isArray(this.httpsAgent.requests) ? this.httpsAgent.requests.length : (this.httpsAgent.requests ? Object.keys(this.httpsAgent.requests).length : 0),
          destroyed: 0,
          free: this.httpsAgent.freeSockets ? Object.keys(this.httpsAgent.freeSockets).length : 0,
          pending: this.httpsAgent.requests ? Object.keys(this.httpsAgent.requests).length : 0
        }
      }
    };
  }

  /**
   * Clean up connections and queues
   */
  destroy(): void {
    // Clear all queues
    this.requestQueue.clear();
    
    // Destroy agents
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
    
    this.isProcessing = false;
  }
}

// Singleton instance for global use
export const connectionPool = new ConnectionPoolManager();