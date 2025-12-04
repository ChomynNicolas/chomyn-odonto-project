// src/lib/validation/reportes.ts
/**
 * Zod validation schemas for the Reporting Module.
 * Shared between frontend and backend for consistent validation.
 */

import { z } from "zod"
import { REPORT_TYPES } from "@/types/reportes"

// ============================================================================
// Base Schemas
// ============================================================================

/** Valid report type enum */
export const reportTypeSchema = z.enum(REPORT_TYPES)

/** Date string in ISO format */
export const isoDateSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "Fecha inválida. Usar formato ISO (YYYY-MM-DD)" }
)

/** Pagination parameters */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

/** Optional pagination (for reports that may not need it) */
export const optionalPaginationSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
})

// ============================================================================
// Enum Schemas (matching Prisma enums)
// ============================================================================

export const estadoCitaSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
])

export const tipoCitaSchema = z.enum([
  "CONSULTA",
  "LIMPIEZA",
  "ENDODONCIA",
  "EXTRACCION",
  "URGENCIA",
  "ORTODONCIA",
  "CONTROL",
  "OTRO",
])

export const generoSchema = z.enum([
  "MASCULINO",
  "FEMENINO",
  "OTRO",
  "NO_ESPECIFICADO",
])

// ============================================================================
// Filter Schemas for Each Report
// ============================================================================

/** Citas Summary Report filters */
export const citasSummaryFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  estados: z.array(estadoCitaSchema).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  consultorioIds: z.array(z.number().int().positive()).optional(),
  tipos: z.array(tipoCitaSchema).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Active Patients Report filters */
export const pacientesActivosFiltersSchema = z.object({
  edadMin: z.number().int().min(0).max(150).optional(),
  edadMax: z.number().int().min(0).max(150).optional(),
  generos: z.array(generoSchema).optional(),
  inactivosDesdeDias: z.number().int().min(0).optional(),
  soloConCitasPendientes: z.boolean().optional(),
  busqueda: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.edadMin !== undefined && data.edadMax !== undefined) {
    if (data.edadMin > data.edadMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La edad mínima debe ser menor o igual a la máxima",
        path: ["edadMax"],
      })
    }
  }
})

/** Performed Procedures Report filters */
export const procedimientosFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  procedimientoIds: z.array(z.number().int().positive()).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  pacienteIds: z.array(z.number().int().positive()).optional(),
  soloConValor: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Appointment Status Analysis Report filters */
export const estadosCitasFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  consultorioIds: z.array(z.number().int().positive()).optional(),
  agruparPor: z.enum(["dia", "semana", "mes"]).default("semana"),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Top Procedures Ranking Report filters */
export const topProcedimientosFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  limite: z.number().int().min(1).max(50).default(10),
  ordenarPor: z.enum(["cantidad", "ingresos"]).default("cantidad"),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Active Diagnoses Report filters */
export const diagnosticosActivosFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  pacienteIds: z.array(z.number().int().positive()).optional(),
  diagnosisCatalogIds: z.array(z.number().int().positive()).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  busqueda: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Resolved Diagnoses Report filters */
export const diagnosticosResueltosFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  pacienteIds: z.array(z.number().int().positive()).optional(),
  diagnosisCatalogIds: z.array(z.number().int().positive()).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  busqueda: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Diagnoses by Type Report filters */
export const diagnosticosPorTipoFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  diagnosisCatalogIds: z.array(z.number().int().positive()).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  status: z.array(z.enum(["ACTIVE", "UNDER_FOLLOW_UP", "RESOLVED", "DISCARDED", "RULED_OUT"])).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
})

/** Pending Follow-up Diagnoses Report filters */
export const diagnosticosPendientesSeguimientoFiltersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  pacienteIds: z.array(z.number().int().positive()).optional(),
  diagnosisCatalogIds: z.array(z.number().int().positive()).optional(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  busqueda: z.string().max(100).optional(),
  diasMinimos: z.number().int().min(0).optional(),
  diasMaximos: z.number().int().min(0).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
}).superRefine((data, ctx) => {
  if (new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La fecha de inicio debe ser anterior o igual a la fecha de fin",
      path: ["endDate"],
    })
  }
  if (data.diasMinimos !== undefined && data.diasMaximos !== undefined) {
    if (data.diasMinimos > data.diasMaximos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los días mínimos deben ser menores o iguales a los días máximos",
        path: ["diasMaximos"],
      })
    }
  }
})

// ============================================================================
// Request Body Schema (API Route)
// ============================================================================

/** Generic report request body */
export const reportRequestSchema = z.object({
  filters: z.record(z.string(), z.unknown()),
})

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type CitasSummaryFiltersInput = z.infer<typeof citasSummaryFiltersSchema>
export type PacientesActivosFiltersInput = z.infer<typeof pacientesActivosFiltersSchema>
export type ProcedimientosFiltersInput = z.infer<typeof procedimientosFiltersSchema>
export type EstadosCitasFiltersInput = z.infer<typeof estadosCitasFiltersSchema>
export type TopProcedimientosFiltersInput = z.infer<typeof topProcedimientosFiltersSchema>
export type DiagnosticosActivosFiltersInput = z.infer<typeof diagnosticosActivosFiltersSchema>
export type DiagnosticosResueltosFiltersInput = z.infer<typeof diagnosticosResueltosFiltersSchema>
export type DiagnosticosPorTipoFiltersInput = z.infer<typeof diagnosticosPorTipoFiltersSchema>
export type DiagnosticosPendientesSeguimientoFiltersInput = z.infer<typeof diagnosticosPendientesSeguimientoFiltersSchema>

// ============================================================================
// Schema Map by Report Type
// ============================================================================

/** Map of report type to its filter schema */
export const reportFilterSchemas = {
  "citas-summary": citasSummaryFiltersSchema,
  "pacientes-activos": pacientesActivosFiltersSchema,
  "procedimientos": procedimientosFiltersSchema,
  "estados-citas": estadosCitasFiltersSchema,
  "top-procedimientos": topProcedimientosFiltersSchema,
  "diagnosticos-activos": diagnosticosActivosFiltersSchema,
  "diagnosticos-resueltos": diagnosticosResueltosFiltersSchema,
  "diagnosticos-por-tipo": diagnosticosPorTipoFiltersSchema,
  "diagnosticos-pendientes-seguimiento": diagnosticosPendientesSeguimientoFiltersSchema,
} as const

type ReportFilterSchemas = typeof reportFilterSchemas
type ReportTypeKey = keyof ReportFilterSchemas

/**
 * Validates filters for a specific report type.
 * Returns parsed filters or throws ZodError.
 */
export function validateReportFilters(
  reportType: ReportTypeKey,
  filters: unknown
) {
  const schema = reportFilterSchemas[reportType]
  return schema.parse(filters)
}

/**
 * Safe validation that returns result object instead of throwing.
 */
export function safeValidateReportFilters(
  reportType: ReportTypeKey,
  filters: unknown
) {
  const schema = reportFilterSchemas[reportType]
  return schema.safeParse(filters)
}

// ============================================================================
// Response Validation Schemas (for runtime checking)
// ============================================================================

/** KPI response item schema */
export const reportKpiSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]),
  format: z.enum(["number", "percent", "currency", "time"]).optional(),
  decimals: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  helpText: z.string().optional(),
  comparison: z.object({
    previousValue: z.number(),
    delta: z.number(),
    deltaPercent: z.number(),
  }).optional(),
  variant: z.enum(["default", "success", "warning", "danger"]).optional(),
})

/** Pagination meta schema */
export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
})

/** Report metadata schema */
export const reportMetadataSchema = z.object({
  reportType: reportTypeSchema,
  generatedAt: z.string(),
  generatedBy: z.object({
    userId: z.number().int(),
    username: z.string(),
    role: z.enum(["ADMIN", "ODONT", "RECEP"]),
  }),
  filters: z.record(z.string(), z.unknown()),
  executionTimeMs: z.number(),
})

// ============================================================================
// Default Values Helpers
// ============================================================================

/** Get default date range (last 30 days) */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  }
}

/** Get default filters for a report type */
export function getDefaultFilters(reportType: ReportTypeKey): Record<string, unknown> {
  const dateRange = getDefaultDateRange()
  
  switch (reportType) {
    case "citas-summary":
      return { ...dateRange, page: 1, pageSize: 20 }
    case "pacientes-activos":
      return { page: 1, pageSize: 20 }
    case "procedimientos":
      return { ...dateRange, page: 1, pageSize: 20 }
    case "estados-citas":
      return { ...dateRange, agruparPor: "semana" }
    case "top-procedimientos":
      return { ...dateRange, limite: 10, ordenarPor: "cantidad" }
    case "diagnosticos-activos":
      return { ...dateRange, page: 1, pageSize: 20 }
    case "diagnosticos-resueltos":
      return { ...dateRange, page: 1, pageSize: 20 }
    case "diagnosticos-por-tipo":
      return { ...dateRange }
    case "diagnosticos-pendientes-seguimiento":
      return { ...dateRange, page: 1, pageSize: 20 }
    default:
      return dateRange
  }
}
