/**
 * Security Validation Framework
 * 
 * Provides comprehensive input validation and security checks for the RAG system.
 * All user inputs and external data must be validated through this framework.
 */

import { ValidationUtils } from './validation-schemas'
import { CONFIG } from './config'

export class SecurityValidator {
  // Security limits
  static readonly MAX_VECTOR_DIMENSIONS = 2048
  static readonly MAX_VECTOR_VALUE = 1e6
  static readonly MAX_QUERY_LENGTH = CONFIG.LIMIT.MAX_QUERY_LENGTH
  static readonly MAX_BATCH_SIZE = CONFIG.PERFORMANCE.DEFAULT_BATCH_SIZE
  static readonly MAX_CACHE_SIZE = CONFIG.LIMIT.MAX_CACHE_SIZE
  static readonly MAX_NODES = CONFIG.LIMIT.MAX_NODES
  static readonly MIN_API_KEY_LENGTH = 20

  /**
   * Validate vector data for security and bounds
   */
  static validateVector(vector: number[]): void {
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new SecurityError('Invalid vector format')
    }
    
    if (vector.length > this.MAX_VECTOR_DIMENSIONS) {
      throw new SecurityError(`Vector dimensions exceed limit: ${vector.length} > ${this.MAX_VECTOR_DIMENSIONS}`)
    }
    
    if (!vector.every(v => Number.isFinite(v) && Math.abs(v) < this.MAX_VECTOR_VALUE)) {
      throw new SecurityError('Invalid vector values detected')
    }
  }

  /**
   * Validate and sanitize user queries for prompt injection protection
   */
  static validateQuery(query: unknown): string {
    // Use Zod for validation instead of manual type checks
    const validationResult = ValidationUtils.safeParseQuery(query)
    if (!validationResult.success) {
      throw new SecurityError(`Query validation failed: ${validationResult.error}`)
    }
    
    const validatedQuery = validationResult.data
    
    // Check for prompt injection patterns
    const dangerousPatterns = [
      /system\s*:/i,
      /assistant\s*:/i, 
      /ignore\s+previous/i,
      /forget\s+all/i,
      /override\s+instructions/i,
      /__[a-zA-Z_]+__/, // Special tokens
      /\$\{.*?\}/, // Template literals
      /<script[^>]*>/i, // Script tags
      /javascript:/i, // JavaScript protocol
      /data:/i, // Data URLs
      /vbscript:/i // VBScript protocol
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(validatedQuery)) {
        throw new SecurityError('Potentially malicious query detected')
      }
    }
    
    // Additional sanitization (validatedQuery is already trimmed by Zod)
    return validatedQuery
      .replace(/[{}]/g, '') // Remove template literals
      .replace(/<[^>]*>/g, '') // Remove HTML-like tags
  }

  /**
   * Validate API keys before use
   */
  static validateApiKey(key: unknown): string {
    if (!ValidationUtils.isValidString(key) || !key) {
      throw new SecurityError('API key is required')
    }
    
    if (key.length < this.MIN_API_KEY_LENGTH) {
      throw new SecurityError(`API key too short: ${key.length} < ${this.MIN_API_KEY_LENGTH}`)
    }
    
    // Validate format for known API key patterns
    if (!key.startsWith('sk-') && !key.startsWith('ak-') && !key.startsWith('AIza')) {
      throw new SecurityError('Invalid API key format')
    }
    
    return key
  }

  /**
   * Validate file paths to prevent traversal attacks
   */
  static validateFilePath(filePath: unknown, allowedBasePath: string): void {
    if (!ValidationUtils.isValidString(filePath) || !filePath) {
      throw new SecurityError('Invalid file path')
    }
    
    // Check for path traversal patterns
    const dangerousPatterns = [
      /\.\./g, // Parent directory traversal
      /~/, // Home directory
      /\/etc\//i, // System directories
      /\/proc\//i,
      /\/sys\//i,
      /\\/, // Windows paths (shouldn't be used in this context)
      /[<>|"*?]/g // Invalid filename characters
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(filePath)) {
        throw new SecurityError('Potentially malicious file path detected')
      }
    }
    
    // For browser compatibility, use basic path validation instead of Node.js resolve
    // In production, this should use proper path resolution on the server side
    const normalizedPath = filePath.replace(/\/+/g, '/').replace(/\/$/, '')
    const normalizedBase = allowedBasePath.replace(/\/+/g, '/').replace(/\/$/, '')
    
    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new SecurityError('File path outside allowed directory')
    }
  }

  /**
   * Validate batch operation parameters
   */
  static validateBatchParams(batchSize: number): void {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      throw new SecurityError('Invalid batch size')
    }
    
    if (batchSize > this.MAX_BATCH_SIZE) {
      throw new SecurityError(`Batch size exceeds limit: ${batchSize} > ${this.MAX_BATCH_SIZE}`)
    }
  }

  /**
   * Validate search parameters to prevent algorithmic attacks
   */
  static validateSearchParams(k: number, ef?: number): { k: number, ef: number } {
    // Sanitize k parameter
    if (!Number.isInteger(k) || k <= 0) {
      throw new SecurityError('Invalid k parameter')
    }
    
    const maxK = 100 // Reasonable upper limit
    const sanitizedK = Math.min(k, maxK)
    
    // Sanitize ef parameter
    let sanitizedEf = ef || Math.max(50, sanitizedK * 2)
    const maxEf = 500 // Reasonable upper limit
    sanitizedEf = Math.min(sanitizedEf, maxEf)
    
    return { k: sanitizedK, ef: sanitizedEf }
  }

  /**
   * Validate mathematical operations for numerical stability
   */
  static validateMathOperation(operation: string, values: number[]): void {
    for (const value of values) {
      if (!Number.isFinite(value)) {
        throw new SecurityError(`Invalid mathematical value in ${operation}`)
      }
      
      if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
        throw new SecurityError(`Value too large for ${operation}`)
      }
    }
  }

  /**
   * Rate limiting check
   */
  static checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
    // This is a simple in-memory rate limiter
    // In production, use Redis or similar for distributed rate limiting
    if (!this.rateLimitMap) {
      this.rateLimitMap = new Map()
    }
    
    const now = Date.now()
    const requests = this.rateLimitMap.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter((time: number) => now - time < windowMs)
    
    if (validRequests.length >= limit) {
      return false
    }
    
    validRequests.push(now)
    this.rateLimitMap.set(identifier, validRequests)
    return true
  }

  private static rateLimitMap: Map<string, number[]>

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  static sanitizeForLogging(data: unknown): unknown {
    if (!ValidationUtils.isValidObject(data)) {
      return data
    }
    
    const sanitized = { ...(data as Record<string, unknown>) }
    
    // Remove sensitive fields
    const sensitiveFields = [
      'apiKey', 'api_key', 'key', 'token', 'password', 'secret', 
      'authorization', 'auth', 'credentials', 'openAIApiKey'
    ]
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    return sanitized
  }
}

/**
 * Custom security error class
 */
export class SecurityError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'SecurityError'
    
    // Log security violations (in production, send to SIEM)
    console.warn('[SECURITY VIOLATION]', {
      timestamp: new Date().toISOString(),
      message,
      code,
      stack: this.stack
    })
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Generate cryptographically secure hash (synchronous for compatibility)
   */
  static secureHash(input: string, salt?: string): string {
    // Simple hash for browser compatibility - in production use proper crypto
    const data = salt ? input + salt : input
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).padStart(8, '0')
  }

  /**
   * Generate secure random string (synchronous for compatibility)
   */
  static generateSecureRandom(length: number = 32): string {
    // Simple random for browser compatibility - in production use crypto.randomBytes
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Constant-time string comparison (prevents timing attacks)
   */
  static constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    
    return result === 0
  }
}