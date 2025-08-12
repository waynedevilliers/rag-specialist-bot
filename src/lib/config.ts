/**
 * Centralized Configuration Constants
 * 
 * This file consolidates all magic numbers and configuration values
 * scattered throughout the codebase for better maintainability.
 */

// Cache and TTL Configuration
export const CACHE_CONFIG = {
  // RAG System Cache
  RAG_CACHE_TTL: 1000 * 60 * 30, // 30 minutes
  
  // Vector Store Cache
  EMBEDDING_CACHE_TTL: 1000 * 60 * 60 * 24, // 24 hours
  
  // Knowledge Update Cache
  BACKUP_TTL: 24 * 60 * 60 * 1000, // 24 hours
} as const

// Timeout Configuration
export const TIMEOUT_CONFIG = {
  // API Timeouts
  DEFAULT_API_TIMEOUT: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 45000, // 45 seconds
  KEEP_ALIVE_TIMEOUT: 30000, // 30 seconds
  
  // Circuit Breaker
  CIRCUIT_BREAKER_TIMEOUT: 1000 * 60 * 5, // 5 minutes
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
} as const

// Token and Limit Configuration
export const LIMIT_CONFIG = {
  // Token Limits
  DEFAULT_MAX_TOKENS: 2000,
  MAX_OUTPUT_TOKENS: 4000,
  
  // Query Limits
  MAX_QUERY_LENGTH: 1000,
  MAX_MESSAGE_LENGTH: 2000,
  
  // Cache Limits
  MAX_CACHE_SIZE: 1000,
  MAX_NODES: 100000,
  
  // Knowledge Base
  MAX_WORD_COUNT: 10000,
  MAX_CHUNK_SIZE: 50000, // 50KB
  DEFAULT_CHUNK_SIZE: 1000,
  
  // Rate Limiting
  DEFAULT_RATE_LIMIT: 100,
} as const

// Retry and Backoff Configuration
export const RETRY_CONFIG = {
  // Retry Delays
  BASE_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 10000, // 10 seconds
  
  // Retry Attempts
  MAX_RETRY_ATTEMPTS: 3,
  
  // Exponential Backoff
  BACKOFF_MULTIPLIER: 2,
} as const

// Model and Pricing Configuration
export const MODEL_CONFIG = {
  // Default Model
  DEFAULT_MODEL: 'gpt-4o-mini',
  
  // Pricing (per 1K tokens)
  PRICING: {
    'gpt-4o-mini': {
      input: 0.00015,  // $0.15 per 1M tokens
      output: 0.0006   // $0.60 per 1M tokens
    },
    'text-embedding-3-small': {
      input: 0.00002   // $0.02 per 1M tokens
    }
  },
  
  // Model Limits
  CONTEXT_WINDOWS: {
    'gpt-4o-mini': 128000,
    'gpt-4': 128000,
    'claude-3-sonnet': 200000,
    'gemini-pro': 32000
  }
} as const

// Date and Time Configuration
export const TIME_CONFIG = {
  // Time Conversions
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  
  // Common Time Periods (in milliseconds)
  ONE_MINUTE: 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

// Validation Configuration
export const VALIDATION_CONFIG = {
  // UUID Pattern
  UUID_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // Content Validation
  MIN_CONTENT_LENGTH: 1,
  MAX_CONTENT_LENGTH: 10000,
  
  // Security
  HASH_ALGORITHM: 'sha256',
  SALT_LENGTH: 32,
} as const

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Vector Store
  HNSW_M: 16, // Number of connections per node
  HNSW_EF_CONSTRUCTION: 200, // Size of dynamic candidate list
  
  // Quantization
  QUANTIZATION_ENABLED: true,
  QUANTIZATION_BITS: 8,
  
  // Batch Processing
  DEFAULT_BATCH_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
} as const

// Export all configurations
export const CONFIG = {
  CACHE: CACHE_CONFIG,
  TIMEOUT: TIMEOUT_CONFIG,
  LIMIT: LIMIT_CONFIG,
  RETRY: RETRY_CONFIG,
  MODEL: MODEL_CONFIG,
  TIME: TIME_CONFIG,
  VALIDATION: VALIDATION_CONFIG,
  PERFORMANCE: PERFORMANCE_CONFIG,
} as const

// Type exports for usage in other files
export type CacheConfig = typeof CACHE_CONFIG
export type TimeoutConfig = typeof TIMEOUT_CONFIG
export type LimitConfig = typeof LIMIT_CONFIG
export type RetryConfig = typeof RETRY_CONFIG
export type ModelConfig = typeof MODEL_CONFIG
export type TimeConfig = typeof TIME_CONFIG
export type ValidationConfig = typeof VALIDATION_CONFIG
export type PerformanceConfig = typeof PERFORMANCE_CONFIG