// src/lib/services/reportes/orchestrator.ts
/**
 * Report Orchestrator Service
 * Central dispatcher that routes report requests to appropriate services.
 */

import type {
  ReportType,
  ReportUserContext,
  ReportResult,
} from "@/types/reportes"
import { canAccessReport, REPORT_CONFIGS } from "@/types/reportes"
import { safeValidateReportFilters } from "@/lib/validation/reportes"
import {
  createReportError,
  ReportErrorCode,
  type ReportFiltersMap,
  type ReportResponseMap,
} from "./types"

// Service imports (will be implemented in Phase 2)
import { citasSummaryService } from "./citas-summary.service"
import { pacientesActivosService } from "./pacientes-activos.service"
import { procedimientosService } from "./procedimientos.service"
import { estadosCitasService } from "./estados-citas.service"
import { topProcedimientosService } from "./top-procedimientos.service"
import { diagnosticosActivosService } from "./diagnosticos-activos.service"
import { diagnosticosResueltosService } from "./diagnosticos-resueltos.service"
import { diagnosticosPorTipoService } from "./diagnosticos-por-tipo.service"
import { diagnosticosPendientesSeguimientoService } from "./diagnosticos-pendientes-seguimiento.service"

// ============================================================================
// Service Registry
// ============================================================================

/**
 * Registry of all report services.
 * Each service is mapped to its report type.
 */
const serviceRegistry = {
  "citas-summary": citasSummaryService,
  "pacientes-activos": pacientesActivosService,
  "procedimientos": procedimientosService,
  "estados-citas": estadosCitasService,
  "top-procedimientos": topProcedimientosService,
  "diagnosticos-activos": diagnosticosActivosService,
  "diagnosticos-resueltos": diagnosticosResueltosService,
  "diagnosticos-por-tipo": diagnosticosPorTipoService,
  "diagnosticos-pendientes-seguimiento": diagnosticosPendientesSeguimientoService,
} as const

// ============================================================================
// Orchestrator Functions
// ============================================================================

/**
 * Execute a report with full validation and RBAC checks.
 * 
 * @param reportType - Type of report to execute
 * @param rawFilters - Raw filter object (will be validated)
 * @param user - User context for RBAC
 * @returns Report result with data or error
 */
export async function executeReport<T extends ReportType>(
  reportType: T,
  rawFilters: unknown,
  user: ReportUserContext
): Promise<ReportResult<ReportResponseMap[T]>> {
  const startTime = performance.now()
  
  try {
    // 1. Validate report type exists
    const config = REPORT_CONFIGS[reportType]
    if (!config) {
      return createReportError(
        ReportErrorCode.NOT_FOUND,
        `Tipo de reporte no encontrado: ${reportType}`
      )
    }

    // 2. Check RBAC permissions
    if (!canAccessReport(user.role, reportType)) {
      return createReportError(
        ReportErrorCode.FORBIDDEN,
        `No tiene permisos para acceder al reporte: ${config.name}`,
        { requiredRoles: config.allowedRoles, userRole: user.role }
      )
    }

    // 3. Validate filters
    // For export mode (pageSize > 100), validate without pageSize to avoid schema limits
    const rawFiltersObj = rawFilters as Record<string, unknown>
    const isExportMode = typeof rawFilters === "object" && 
                        rawFilters !== null && 
                        "pageSize" in rawFiltersObj &&
                        typeof rawFiltersObj.pageSize === "number" &&
                        rawFiltersObj.pageSize > 100
    
    const filtersToValidate = isExportMode 
      ? (() => {
          // Remove pageSize for validation, will add it back after
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { pageSize, ...rest } = rawFiltersObj
          return rest
        })()
      : rawFilters
    
    const validationResult = safeValidateReportFilters(reportType, filtersToValidate)
    if (!validationResult.success) {
      const flattenedErrors = validationResult.error.flatten()
      
      // Build a descriptive error message with field-specific errors
      const fieldErrors = Object.entries(flattenedErrors.fieldErrors || {})
        .map(([field, messages]) => {
          const msgArray = Array.isArray(messages) ? messages : [messages]
          return `${field}: ${msgArray.join(", ")}`
        })
      
      const formErrors = flattenedErrors.formErrors || []
      
      let errorMessage = "Filtros inválidos"
      if (fieldErrors.length > 0) {
        errorMessage += `. Errores: ${fieldErrors.join("; ")}`
      } else if (formErrors.length > 0) {
        errorMessage += `. ${formErrors.join("; ")}`
      }
      
      return createReportError(
        ReportErrorCode.VALIDATION_ERROR,
        errorMessage,
        { errors: flattenedErrors }
      )
    }
    
    // Restore pageSize for export mode after validation
    const finalFilters = isExportMode
      ? {
          ...validationResult.data,
          pageSize: rawFiltersObj.pageSize,
          page: rawFiltersObj.page ?? 1,
        }
      : validationResult.data

    // 4. Get service and execute
    const service = serviceRegistry[reportType]
    if (!service) {
      return createReportError(
        ReportErrorCode.INTERNAL_ERROR,
        `Servicio no implementado para: ${reportType}`
      )
    }

    // 5. Execute with typed filters (including pageSize for export mode)
    // Type assertion is safe here because validationResult.data is already validated
    // and matches the expected filter type for the report type T
    const result = await (service as { execute: (filters: ReportFiltersMap[T], user: ReportUserContext) => Promise<ReportResult<ReportResponseMap[T]>> }).execute(
      finalFilters as ReportFiltersMap[T],
      user
    )

    // 6. Log execution time for monitoring
    const executionTime = performance.now() - startTime
    if (executionTime > 5000) {
      console.warn(`[ReportOrchestrator] Slow report execution: ${reportType} took ${executionTime.toFixed(0)}ms`)
    }

    return result as ReportResult<ReportResponseMap[T]>
  } catch (error) {
    console.error(`[ReportOrchestrator] Error executing report ${reportType}:`, error)
    
    return createReportError(
      ReportErrorCode.INTERNAL_ERROR,
      "Error interno al generar el reporte",
      { 
        reportType,
        errorMessage: error instanceof Error ? error.message : "Unknown error"
      }
    )
  }
}

/**
 * Get available reports for a user based on their role.
 */
export function getAvailableReports(role: ReportUserContext["role"]) {
  return Object.values(REPORT_CONFIGS)
    .filter((config) => config.allowedRoles.includes(role))
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Check if a user can access a specific report.
 */
export function checkReportAccess(
  reportType: ReportType,
  user: ReportUserContext
): { allowed: boolean; reason?: string } {
  const config = REPORT_CONFIGS[reportType]
  
  if (!config) {
    return { allowed: false, reason: "Reporte no encontrado" }
  }
  
  if (!config.allowedRoles.includes(user.role)) {
    return { 
      allowed: false, 
      reason: `Este reporte requiere uno de los siguientes roles: ${config.allowedRoles.join(", ")}`
    }
  }
  
  return { allowed: true }
}

// ============================================================================
// Type-safe Report Execution Helpers
// ============================================================================

/**
 * Type-safe wrapper for executing Citas Summary report.
 */
export async function executeCitasSummaryReport(
  filters: ReportFiltersMap["citas-summary"],
  user: ReportUserContext
) {
  return executeReport("citas-summary", filters, user)
}

/**
 * Type-safe wrapper for executing Pacientes Activos report.
 */
export async function executePacientesActivosReport(
  filters: ReportFiltersMap["pacientes-activos"],
  user: ReportUserContext
) {
  return executeReport("pacientes-activos", filters, user)
}

/**
 * Type-safe wrapper for executing Procedimientos report.
 */
export async function executeProcedimientosReport(
  filters: ReportFiltersMap["procedimientos"],
  user: ReportUserContext
) {
  return executeReport("procedimientos", filters, user)
}

/**
 * Type-safe wrapper for executing Estados Citas report.
 */
export async function executeEstadosCitasReport(
  filters: ReportFiltersMap["estados-citas"],
  user: ReportUserContext
) {
  return executeReport("estados-citas", filters, user)
}

/**
 * Type-safe wrapper for executing Top Procedimientos report.
 */
export async function executeTopProcedimientosReport(
  filters: ReportFiltersMap["top-procedimientos"],
  user: ReportUserContext
) {
  return executeReport("top-procedimientos", filters, user)
}

/**
 * Type-safe wrapper for executing Diagnosticos Activos report.
 */
export async function executeDiagnosticosActivosReport(
  filters: ReportFiltersMap["diagnosticos-activos"],
  user: ReportUserContext
) {
  return executeReport("diagnosticos-activos", filters, user)
}

/**
 * Type-safe wrapper for executing Diagnosticos Resueltos report.
 */
export async function executeDiagnosticosResueltosReport(
  filters: ReportFiltersMap["diagnosticos-resueltos"],
  user: ReportUserContext
) {
  return executeReport("diagnosticos-resueltos", filters, user)
}

/**
 * Type-safe wrapper for executing Diagnosticos por Tipo report.
 */
export async function executeDiagnosticosPorTipoReport(
  filters: ReportFiltersMap["diagnosticos-por-tipo"],
  user: ReportUserContext
) {
  return executeReport("diagnosticos-por-tipo", filters, user)
}

/**
 * Type-safe wrapper for executing Diagnosticos Pendientes de Seguimiento report.
 */
export async function executeDiagnosticosPendientesSeguimientoReport(
  filters: ReportFiltersMap["diagnosticos-pendientes-seguimiento"],
  user: ReportUserContext
) {
  return executeReport("diagnosticos-pendientes-seguimiento", filters, user)
}

// Re-export types for convenience
export type { ReportFiltersMap, ReportResponseMap } from "./types"

