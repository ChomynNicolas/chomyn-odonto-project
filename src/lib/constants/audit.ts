// src/lib/constants/audit.ts
/**
 * Constants for audit log system
 */

export const AUDIT_PAGE_SIZES = [10, 20, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_DEBOUNCE_DELAY = 400 // milliseconds
export const MAX_EXPORT_RECORDS = 10000
export const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const DATE_PRESETS = [
  { label: "Hoy", days: 0 },
  { label: "24h", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
] as const

