/**
 * Centralized Zod Validation Schemas
 * 
 * This file consolidates all validation logic using Zod instead of
 * manual type checks scattered throughout the codebase.
 */

import { z } from 'zod'
import { CONFIG } from './config'

// Basic primitive validations
export const NonEmptyStringSchema = z.string().min(1, 'String cannot be empty')

export const QuerySchema = z.string()
  .min(1, 'Query cannot be empty')
  .max(CONFIG.LIMIT.MAX_QUERY_LENGTH, `Query cannot exceed ${CONFIG.LIMIT.MAX_QUERY_LENGTH} characters`)
  .transform(s => s.trim())

export const MessageSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(CONFIG.LIMIT.MAX_MESSAGE_LENGTH, `Message cannot exceed ${CONFIG.LIMIT.MAX_MESSAGE_LENGTH} characters`)

// UUID validation
export const UUIDSchema = z.string().regex(
  CONFIG.VALIDATION.UUID_PATTERN,
  'Invalid UUID format'
)

// API request validation
export const ChatRequestSchema = z.object({
  message: MessageSchema,
  conversationId: UUIDSchema.optional(),
  language: z.enum(['en', 'de']).default('en'),
  modelConfig: z.object({
    provider: z.enum(['openai', 'anthropic', 'google']).default('openai'),
    model: z.string().default(CONFIG.MODEL.DEFAULT_MODEL),
    maxTokens: z.number()
      .min(1)
      .max(CONFIG.LIMIT.MAX_OUTPUT_TOKENS)
      .default(CONFIG.LIMIT.DEFAULT_MAX_TOKENS),
    temperature: z.number().min(0).max(2).default(0.1)
  }).optional()
})

// Security validation schemas
export const SecurityValidationSchema = z.object({
  query: QuerySchema,
  clientId: z.string().min(1),
  timestamp: z.number().positive(),
  rateLimitWindowMs: z.number().positive().default(CONFIG.TIMEOUT.RATE_LIMIT_WINDOW),
  maxRequests: z.number().positive().default(CONFIG.LIMIT.DEFAULT_RATE_LIMIT)
})

// Knowledge base validation
export const KnowledgeSourceSchema = z.object({
  id: z.string().min(1),
  content: z.string()
    .min(CONFIG.VALIDATION.MIN_CONTENT_LENGTH)
    .max(CONFIG.VALIDATION.MAX_CONTENT_LENGTH),
  metadata: z.object({
    source: z.string(),
    title: z.string().optional(),
    lastModified: z.string().datetime().optional(),
    language: z.enum(['en', 'de']).default('en'),
    category: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
})

export const KnowledgeUpdateRequestSchema = z.object({
  sources: z.array(KnowledgeSourceSchema).min(1),
  overwrite: z.boolean().default(false),
  validateOnly: z.boolean().default(false)
})

// Vector store validation
export const VectorMatchSchema = z.object({
  content: z.string(),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional()
})

export const SearchResultSchema = z.object({
  matches: z.array(VectorMatchSchema),
  query: z.string(),
  totalResults: z.number().min(0),
  processingTime: z.number().min(0)
})

// Token usage validation
export const TokenUsageSchema = z.object({
  promptTokens: z.number().min(0),
  completionTokens: z.number().min(0),
  totalTokens: z.number().min(0),
  embeddingTokens: z.number().min(0).optional()
})

// Cost calculation validation
export const CostBreakdownSchema = z.object({
  promptCost: z.number().min(0),
  completionCost: z.number().min(0),
  embeddingCost: z.number().min(0),
  totalCost: z.number().min(0)
})

// Response validation
export const RAGResponseSchema = z.object({
  response: z.string().min(1),
  sources: z.array(z.object({
    content: z.string(),
    source: z.string(),
    relevanceScore: z.number().min(0).max(1)
  })),
  tokenUsage: TokenUsageSchema,
  cost: CostBreakdownSchema,
  processingTime: z.number().min(0),
  cached: z.boolean().optional(),
  model: z.string()
})

// Configuration validation
export const ModelConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  model: z.string(),
  maxTokens: z.number().min(1).max(CONFIG.LIMIT.MAX_OUTPUT_TOKENS),
  temperature: z.number().min(0).max(2),
  timeout: z.number().min(1000).max(120000).optional()
})

// Environment validation
export const EnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  LANGSMITH_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

// Conversation management validation
export const ConversationMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
  tokenUsage: TokenUsageSchema.optional(),
  cost: z.number().min(0).optional(),
  sources: z.array(z.string()).optional(),
  processingTime: z.number().min(0).optional()
})

export const ConversationSessionSchema = z.object({
  id: UUIDSchema,
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  messages: z.array(ConversationMessageSchema),
  totalTokens: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0)
})

// Export format validation
export const ExportFormatSchema = z.enum(['json', 'csv', 'pdf'])

export const ExportRequestSchema = z.object({
  sessionId: UUIDSchema,
  format: ExportFormatSchema,
  includeMetadata: z.boolean().default(true),
  dateRange: z.object({
    start: z.date().optional(),
    end: z.date().optional()
  }).optional()
})

// Type exports for usage in other files
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type SecurityValidation = z.infer<typeof SecurityValidationSchema>
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>
export type KnowledgeUpdateRequest = z.infer<typeof KnowledgeUpdateRequestSchema>
export type VectorMatch = z.infer<typeof VectorMatchSchema>
export type SearchResult = z.infer<typeof SearchResultSchema>
export type TokenUsage = z.infer<typeof TokenUsageSchema>
export type CostBreakdown = z.infer<typeof CostBreakdownSchema>
export type RAGResponse = z.infer<typeof RAGResponseSchema>
export type ModelConfig = z.infer<typeof ModelConfigSchema>
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>
export type ConversationSession = z.infer<typeof ConversationSessionSchema>
export type ExportRequest = z.infer<typeof ExportRequestSchema>

// Utility functions for validation
export class ValidationUtils {
  static validateQuery(query: unknown): string {
    return QuerySchema.parse(query)
  }

  static validateMessage(message: unknown): string {
    return MessageSchema.parse(message)
  }

  static validateUUID(uuid: unknown): string {
    return UUIDSchema.parse(uuid)
  }

  static validateChatRequest(request: unknown): ChatRequest {
    return ChatRequestSchema.parse(request)
  }

  static validateKnowledgeSource(source: unknown): KnowledgeSource {
    return KnowledgeSourceSchema.parse(source)
  }

  static validateTokenUsage(usage: unknown): TokenUsage {
    return TokenUsageSchema.parse(usage)
  }

  static validateModelConfig(config: unknown): ModelConfig {
    return ModelConfigSchema.parse(config)
  }

  static isValidObject(data: unknown): data is Record<string, unknown> {
    return typeof data === 'object' && data !== null && !Array.isArray(data)
  }

  static isValidString(data: unknown): data is string {
    return typeof data === 'string'
  }

  static isValidNumber(data: unknown): data is number {
    return typeof data === 'number' && !isNaN(data)
  }

  // Safe parsing with error handling
  static safeParseQuery(query: unknown): { success: true; data: string } | { success: false; error: string } {
    try {
      const result = QuerySchema.parse(query)
      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof z.ZodError 
          ? error.issues.map(i => i.message).join(', ')
          : 'Unknown validation error'
      }
    }
  }

  static safeParseChatRequest(request: unknown): { success: true; data: ChatRequest } | { success: false; error: string } {
    try {
      const result = ChatRequestSchema.parse(request)
      return { success: true, data: result }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof z.ZodError 
          ? error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
          : 'Unknown validation error'
      }
    }
  }
}