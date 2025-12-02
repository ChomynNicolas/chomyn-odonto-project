// src/lib/services/reportes/audit.ts
/**
 * Report Audit Service
 * Handles audit logging for all report operations.
 */

import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { ReportType, ReportRole } from "@/types/reportes"

/**
 * Parameters for auditing report access.
 */
export interface AuditReportAccessParams {
  userId: number
  username: string
  role: ReportRole
  reportType: ReportType
  filters: Record<string, unknown>
  success: boolean
  errorMessage?: string
  executionTimeMs?: number
  headers?: Headers
  resultRowCount?: number
}

/**
 * Extract IP address from request headers.
 */
function extractIp(headers?: Headers): string | undefined {
  if (!headers) return undefined
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    undefined
  )
}

/**
 * Audit a report access/generation event.
 */
export async function auditReportAccess(params: AuditReportAccessParams): Promise<void> {
  const {
    userId,
    username,
    role,
    reportType,
    filters,
    success,
    errorMessage,
    executionTimeMs,
    headers,
    resultRowCount,
  } = params

  const ip = extractIp(headers)
  const userAgent = headers?.get("user-agent") || undefined

  // Build metadata (without sensitive filter values)
  const sanitizedFilters = sanitizeFilters(filters)

  const metadata: Record<string, unknown> = {
    reportType,
    filters: sanitizedFilters,
    success,
    role,
    username,
    executionTimeMs,
    resultRowCount,
    userAgent,
  }

  if (!success && errorMessage) {
    metadata.errorMessage = errorMessage
  }

  await safeAuditWrite({
    actorId: userId,
    action: success ? AuditAction.REPORT_GENERATE : AuditAction.REPORT_GENERATE_FAILED,
    entity: AuditEntity.Report,
    entityId: 0, // Reports don't have a specific entity ID
    ip,
    metadata,
    path: `/api/reportes/${reportType}`,
  })
}

/**
 * Audit a PDF export event.
 */
export async function auditReportExport(params: {
  userId: number
  username: string
  role: ReportRole
  reportType: ReportType
  filters: Record<string, unknown>
  format: "pdf" | "csv" | "excel" | "export"
  headers?: Headers
  scope?: "currentPage" | "fullDataset"
  recordCount?: number
  fileSizeBytes?: number
}): Promise<void> {
  const { userId, username, role, reportType, filters, format, headers, scope, recordCount, fileSizeBytes } = params

  const ip = extractIp(headers)
  const userAgent = headers?.get("user-agent") || undefined
  const sanitizedFilters = sanitizeFilters(filters)

  // Determine audit action based on format
  let action = AuditAction.REPORT_EXPORT_PDF
  if (format === "csv") {
    action = AuditAction.REPORT_EXPORT_PDF // Use same action for now, or add REPORT_EXPORT_CSV if needed
  }

  const metadata: Record<string, unknown> = {
    reportType,
    filters: sanitizedFilters,
    exportFormat: format,
    role,
    username,
    userAgent,
  }

  if (scope) {
    metadata.exportScope = scope
  }

  if (recordCount !== undefined) {
    metadata.recordCount = recordCount
  }

  if (fileSizeBytes !== undefined) {
    metadata.fileSizeBytes = fileSizeBytes
    metadata.fileSizeKB = Math.round(fileSizeBytes / 1024)
  }

  await safeAuditWrite({
    actorId: userId,
    action,
    entity: AuditEntity.Report,
    entityId: 0,
    ip,
    metadata,
    path: `/api/reportes/${reportType}/export`,
  })
}

/**
 * Audit a print event.
 */
export async function auditReportPrint(params: {
  userId: number
  username: string
  role: ReportRole
  reportType: ReportType
  filters: Record<string, unknown>
  headers?: Headers
}): Promise<void> {
  const { userId, username, role, reportType, filters, headers } = params

  const ip = extractIp(headers)
  const userAgent = headers?.get("user-agent") || undefined
  const sanitizedFilters = sanitizeFilters(filters)

  await safeAuditWrite({
    actorId: userId,
    action: AuditAction.REPORT_PRINT,
    entity: AuditEntity.Report,
    entityId: 0,
    ip,
    metadata: {
      reportType,
      filters: sanitizedFilters,
      role,
      username,
      userAgent,
    },
    path: `/api/reportes/${reportType}/print`,
  })
}

/**
 * Sanitize filters to remove potentially sensitive information.
 * Keeps structure but may redact specific values.
 */
function sanitizeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(filters)) {
    // Keep date ranges, IDs, and non-sensitive filters
    if (
      key.includes("Date") ||
      key.includes("Id") ||
      key.includes("tipo") ||
      key.includes("estado") ||
      key.includes("page") ||
      key.includes("limite") ||
      key.includes("ordenar") ||
      key.includes("agrupar")
    ) {
      sanitized[key] = value
    } else if (key === "busqueda" && typeof value === "string") {
      // Redact search terms but indicate a search was performed
      sanitized[key] = value.length > 0 ? "[SEARCH_TERM]" : ""
    } else if (Array.isArray(value)) {
      // For arrays, just show count
      sanitized[key] = `[${value.length} items]`
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

