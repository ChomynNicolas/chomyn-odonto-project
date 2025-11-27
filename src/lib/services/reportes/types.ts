// src/lib/services/reportes/types.ts
/**
 * Shared types for report services.
 * Defines service interfaces and common structures.
 */

import type {
  ReportType,
  ReportUserContext,
  ReportResponse,
  ReportResult,
  CitasSummaryFilters,
  PacientesActivosFilters,
  ProcedimientosFilters,
  EstadosCitasFilters,
  TopProcedimientosFilters,
  CitasSummaryResponse,
  PacientesActivosResponse,
  ProcedimientosResponse,
  EstadosCitasResponse,
  TopProcedimientosResponse,
} from "@/types/reportes"

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Base interface for all report services.
 * Each service must implement execute() with its specific filter and response types.
 */
export interface ReportService<TFilters, TResponse extends ReportResponse> {
  /** Unique identifier matching ReportType */
  readonly reportType: ReportType
  
  /**
   * Execute the report with given filters and user context.
   * @param filters - Validated filters for the report
   * @param user - User context for RBAC scoping
   * @returns Promise resolving to report data or error
   */
  execute(filters: TFilters, user: ReportUserContext): Promise<ReportResult<TResponse>>
}

// ============================================================================
// Specific Service Types
// ============================================================================

export type CitasSummaryService = ReportService<CitasSummaryFilters, CitasSummaryResponse>
export type PacientesActivosService = ReportService<PacientesActivosFilters, PacientesActivosResponse>
export type ProcedimientosService = ReportService<ProcedimientosFilters, ProcedimientosResponse>
export type EstadosCitasService = ReportService<EstadosCitasFilters, EstadosCitasResponse>
export type TopProcedimientosService = ReportService<TopProcedimientosFilters, TopProcedimientosResponse>

// ============================================================================
// Orchestrator Types
// ============================================================================

/** Map of report type to its filter type */
export interface ReportFiltersMap {
  "citas-summary": CitasSummaryFilters
  "pacientes-activos": PacientesActivosFilters
  "procedimientos": ProcedimientosFilters
  "estados-citas": EstadosCitasFilters
  "top-procedimientos": TopProcedimientosFilters
}

/** Map of report type to its response type */
export interface ReportResponseMap {
  "citas-summary": CitasSummaryResponse
  "pacientes-activos": PacientesActivosResponse
  "procedimientos": ProcedimientosResponse
  "estados-citas": EstadosCitasResponse
  "top-procedimientos": TopProcedimientosResponse
}

// ============================================================================
// Error Types
// ============================================================================

export const ReportErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const

export type ReportErrorCode = (typeof ReportErrorCode)[keyof typeof ReportErrorCode]

/**
 * Creates a standardized error result for services.
 */
export function createReportError(
  code: ReportErrorCode,
  message: string,
  details?: Record<string, unknown>
): { success: false; error: { code: string; message: string; details?: Record<string, unknown> } } {
  return {
    success: false,
    error: { code, message, details },
  }
}

/**
 * Creates a successful result wrapper.
 */
export function createReportSuccess<T extends ReportResponse>(data: T): { success: true; data: T } {
  return { success: true, data }
}

// ============================================================================
// Utility Types
// ============================================================================

/** Helper type for extracting filters for a report type */
export type FiltersFor<T extends ReportType> = ReportFiltersMap[T]

/** Helper type for extracting response for a report type */
export type ResponseFor<T extends ReportType> = ReportResponseMap[T]

