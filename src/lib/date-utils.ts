/**
 * Centralized Date Formatting Utilities
 * 
 * This file consolidates all date formatting logic scattered throughout
 * the codebase for consistent date handling and localization.
 */

import { CONFIG } from './config'

/**
 * Standard date format configurations
 */
export const DATE_FORMATS = {
  ISO_FULL: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  ISO_DATE: 'YYYY-MM-DD',
  ISO_TIME: 'HH:mm:ss',
  DISPLAY_FULL: 'MMM DD, YYYY HH:mm:ss',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_TIME: 'HH:mm',
  FILENAME_SAFE: 'YYYY-MM-DD_HH-mm-ss',
  EXPORT_TIMESTAMP: 'YYYYMMDD_HHmmss'
} as const

/**
 * Time duration constants in milliseconds
 */
export const TIME_DURATIONS = {
  SECOND: CONFIG.TIME.MILLISECONDS_PER_SECOND,
  MINUTE: CONFIG.TIME.ONE_MINUTE,
  HOUR: CONFIG.TIME.ONE_HOUR,
  DAY: CONFIG.TIME.ONE_DAY,
  WEEK: CONFIG.TIME.ONE_WEEK
} as const

/**
 * Centralized date utility class
 */
export class DateUtils {
  
  /**
   * Get current timestamp in milliseconds
   */
  static now(): number {
    return Date.now()
  }

  /**
   * Get current date as ISO string
   */
  static nowISO(): string {
    return new Date().toISOString()
  }

  /**
   * Get current date split by day (for file naming)
   */
  static nowDateString(): string {
    return new Date().toISOString().split('T')[0]
  }

  /**
   * Format date for display purposes
   */
  static formatForDisplay(date: Date | string | number): string {
    const d = this.ensureDate(date)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  /**
   * Format date for filename use (no special characters)
   */
  static formatForFilename(date: Date | string | number): string {
    const d = this.ensureDate(date)
    return d.toISOString()
      .replace(/[:.]/g, '-')
      .replace(/T/, '_')
      .replace(/Z$/, '')
  }

  /**
   * Format date for export timestamps
   */
  static formatForExport(date: Date | string | number): string {
    const d = this.ensureDate(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const minute = String(d.getMinutes()).padStart(2, '0')
    const second = String(d.getSeconds()).padStart(2, '0')
    
    return `${year}${month}${day}_${hour}${minute}${second}`
  }

  /**
   * Format date for CSV export (ISO format)
   */
  static formatForCSV(date: Date | string | number): string {
    return this.ensureDate(date).toISOString()
  }

  /**
   * Format relative time (e.g., "2 hours ago", "just now")
   */
  static formatRelative(date: Date | string | number): string {
    const d = this.ensureDate(date)
    const now = new Date()
    const diffInMs = now.getTime() - d.getTime()

    if (diffInMs < TIME_DURATIONS.MINUTE) {
      return 'just now'
    }

    if (diffInMs < TIME_DURATIONS.HOUR) {
      const minutes = Math.floor(diffInMs / TIME_DURATIONS.MINUTE)
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    }

    if (diffInMs < TIME_DURATIONS.DAY) {
      const hours = Math.floor(diffInMs / TIME_DURATIONS.HOUR)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    }

    if (diffInMs < TIME_DURATIONS.WEEK) {
      const days = Math.floor(diffInMs / TIME_DURATIONS.DAY)
      return `${days} day${days === 1 ? '' : 's'} ago`
    }

    // For older dates, show the actual date
    return this.formatForDisplay(d)
  }

  /**
   * Calculate time difference in hours
   */
  static diffInHours(date1: Date | string | number, date2: Date | string | number): number {
    const d1 = this.ensureDate(date1)
    const d2 = this.ensureDate(date2)
    return Math.abs(d1.getTime() - d2.getTime()) / TIME_DURATIONS.HOUR
  }

  /**
   * Calculate time difference in milliseconds
   */
  static diffInMs(date1: Date | string | number, date2: Date | string | number): number {
    const d1 = this.ensureDate(date1)
    const d2 = this.ensureDate(date2)
    return Math.abs(d1.getTime() - d2.getTime())
  }

  /**
   * Check if a date is within a time window (in milliseconds)
   */
  static isWithinWindow(date: Date | string | number, windowMs: number): boolean {
    const d = this.ensureDate(date)
    const now = new Date()
    return (now.getTime() - d.getTime()) <= windowMs
  }

  /**
   * Check if date is expired based on TTL
   */
  static isExpired(date: Date | string | number, ttlMs: number): boolean {
    return !this.isWithinWindow(date, ttlMs)
  }

  /**
   * Get cache expiry time
   */
  static getCacheExpiry(ttlMs: number): number {
    return Date.now() + ttlMs
  }

  /**
   * Create session ID with timestamp
   */
  static createSessionId(): string {
    return `session_${Date.now()}`
  }

  /**
   * Create backup ID with timestamp and random suffix
   */
  static createBackupId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `backup_${timestamp}_${random}`
  }

  /**
   * Format duration in milliseconds to human readable
   */
  static formatDuration(durationMs: number): string {
    if (durationMs < TIME_DURATIONS.SECOND) {
      return `${durationMs}ms`
    }

    if (durationMs < TIME_DURATIONS.MINUTE) {
      const seconds = Math.round(durationMs / TIME_DURATIONS.SECOND * 10) / 10
      return `${seconds}s`
    }

    if (durationMs < TIME_DURATIONS.HOUR) {
      const minutes = Math.round(durationMs / TIME_DURATIONS.MINUTE * 10) / 10
      return `${minutes}m`
    }

    const hours = Math.round(durationMs / TIME_DURATIONS.HOUR * 10) / 10
    return `${hours}h`
  }

  /**
   * Get timestamp for a specific number of time units in the future
   */
  static getFutureTimestamp(amount: number, unit: 'seconds' | 'minutes' | 'hours' | 'days'): number {
    const multipliers = {
      seconds: TIME_DURATIONS.SECOND,
      minutes: TIME_DURATIONS.MINUTE,
      hours: TIME_DURATIONS.HOUR,
      days: TIME_DURATIONS.DAY
    }

    return Date.now() + (amount * multipliers[unit])
  }

  /**
   * Parse and validate date input
   */
  static parseDate(input: unknown): Date | null {
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input
    }

    if (typeof input === 'string') {
      const parsed = new Date(input)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    if (typeof input === 'number') {
      const parsed = new Date(input)
      return isNaN(parsed.getTime()) ? null : parsed
    }

    return null
  }

  /**
   * Ensure input is a valid Date object
   */
  private static ensureDate(input: Date | string | number): Date {
    if (input instanceof Date) {
      if (isNaN(input.getTime())) {
        throw new Error('Invalid Date object')
      }
      return input
    }

    const parsed = new Date(input)
    if (isNaN(parsed.getTime())) {
      throw new Error(`Cannot parse date from: ${input}`)
    }

    return parsed
  }

  /**
   * Validate that a timestamp is not too old or too far in the future
   */
  static validateTimestamp(timestamp: number, maxAgeMs: number = TIME_DURATIONS.DAY): boolean {
    const now = Date.now()
    const age = now - timestamp
    
    // Check if timestamp is too old
    if (age > maxAgeMs) {
      return false
    }

    // Check if timestamp is too far in the future (allow some clock skew)
    if (age < -TIME_DURATIONS.MINUTE) {
      return false
    }

    return true
  }
}

/**
 * Specialized formatting for different contexts
 */
export class ContextualDateFormatter {
  
  /**
   * Format date for conversation history display
   */
  static forConversationHistory(date: Date | string | number): string {
    return DateUtils.formatRelative(date)
  }

  /**
   * Format date for log entries
   */
  static forLogging(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString()
  }

  /**
   * Format date for export filenames
   */
  static forExportFilename(sessionTitle: string, date: Date | string | number): string {
    const dateStr = DateUtils.formatForExport(date)
    const cleanTitle = sessionTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    return `${cleanTitle}_${dateStr}`
  }

  /**
   * Format date for cache keys (should be stable)
   */
  static forCacheKey(date: Date | string | number): string {
    // Use day precision for cache keys to group related queries
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString().split('T')[0]
  }

  /**
   * Format date for API responses
   */
  static forAPI(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date)
    return d.toISOString()
  }

  /**
   * Format date for user display with locale support
   */
  static forUserDisplay(date: Date | string | number, language: 'en' | 'de' = 'en'): string {
    const d = date instanceof Date ? date : new Date(date)
    
    const locales = {
      en: 'en-US',
      de: 'de-DE'
    }

    return d.toLocaleString(locales[language], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

// Export commonly used functions for convenience
export const {
  now,
  nowISO,
  formatForDisplay,
  formatRelative,
  diffInHours,
  isExpired,
  createSessionId
} = DateUtils