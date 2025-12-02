// src/lib/utils/audit-format.ts
/**
 * Utility functions for consistent audit log formatting
 */

import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Format date for audit log display
 * Shows relative time for recent dates, absolute for older ones
 */
export function formatAuditDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    
    // Show relative time for today/yesterday
    if (isToday(date)) {
      return `Hoy, ${format(date, "HH:mm:ss")}`
    }
    if (isYesterday(date)) {
      return `Ayer, ${format(date, "HH:mm:ss")}`
    }
    
    // Show relative for last 7 days
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAgo <= 7) {
      return `${formatDistanceToNow(date, { addSuffix: true, locale: es })}`
    }
    
    // Absolute format for older dates
    return format(date, "dd/MM/yyyy HH:mm:ss", { locale: es })
  } catch {
    return String(dateString)
  }
}

/**
 * Format date in ISO format
 */
export function formatAuditDateISO(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    return date.toISOString()
  } catch {
    return String(dateString)
  }
}

/**
 * Format date for table display (compact)
 */
export function formatAuditDateCompact(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    
    if (isToday(date)) {
      return format(date, "HH:mm:ss")
    }
    
    return format(date, "dd/MM/yyyy HH:mm", { locale: es })
  } catch {
    return String(dateString)
  }
}

/**
 * Format date for detail view (full)
 */
export function formatAuditDateFull(dateString: string | Date): string {
  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : dateString
    return format(date, "EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm:ss", { locale: es })
  } catch {
    return String(dateString)
  }
}

