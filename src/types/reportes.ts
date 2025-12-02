// src/types/reportes.ts
/**
 * TypeScript DTOs for the Reporting Module
 * Defines types for filters, responses, and shared structures across all reports.
 */

import type { EstadoCita, TipoCita, Genero } from "@prisma/client"

// ============================================================================
// Base Types & Enums
// ============================================================================

/** Available report types in the system */
export const REPORT_TYPES = [
  "citas-summary",
  "pacientes-activos",
  "procedimientos",
  "estados-citas",
  "top-procedimientos",
] as const

export type ReportType = (typeof REPORT_TYPES)[number]

/** User roles for RBAC */
export type ReportRole = "ADMIN" | "ODONT" | "RECEP"

/** Date range filter common to most reports */
export interface DateRangeFilter {
  startDate: string // ISO date string
  endDate: string   // ISO date string
}

/** Pagination parameters */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** Pagination response metadata */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/** Report metadata included in all responses */
export interface ReportMetadata {
  reportType: ReportType
  generatedAt: string // ISO timestamp
  generatedBy: {
    userId: number
    username: string
    role: ReportRole
  }
  filters: Record<string, unknown>
  executionTimeMs: number
}

/** Generic KPI structure for report dashboards */
export interface ReportKpi {
  id: string
  label: string
  value: number | string
  format?: "number" | "percent" | "currency" | "time"
  decimals?: number
  unit?: string
  helpText?: string
  comparison?: {
    previousValue: number
    delta: number
    deltaPercent: number
  }
  variant?: "default" | "success" | "warning" | "danger"
}

/** Table column definition for report tables */
export interface ReportTableColumn<T = unknown> {
  key: keyof T | string
  label: string
  sortable?: boolean
  align?: "left" | "center" | "right"
  format?: "text" | "number" | "currency" | "date" | "datetime" | "boolean"
  width?: string
}

// ============================================================================
// Report-Specific Filter Types
// ============================================================================

/** Filters for Citas Summary Report */
export interface CitasSummaryFilters extends DateRangeFilter, Partial<PaginationParams> {
  estados?: EstadoCita[]
  profesionalIds?: number[]
  consultorioIds?: number[]
  tipos?: TipoCita[]
}

/** Filters for Active Patients Report */
export interface PacientesActivosFilters extends Partial<PaginationParams> {
  edadMin?: number
  edadMax?: number
  generos?: Genero[]
  inactivosDesdeDias?: number // Patients inactive for N days
  soloConCitasPendientes?: boolean
  busqueda?: string // Name/document search
}

/** Filters for Performed Procedures Report */
export interface ProcedimientosFilters extends DateRangeFilter, Partial<PaginationParams> {
  procedimientoIds?: number[]
  profesionalIds?: number[]
  pacienteIds?: number[]
  soloConValor?: boolean // Only procedures with monetary value
}

/** Filters for Appointment Status Analysis Report */
export interface EstadosCitasFilters extends DateRangeFilter {
  profesionalIds?: number[]
  consultorioIds?: number[]
  agruparPor?: "dia" | "semana" | "mes"
}

/** Filters for Top Procedures Ranking Report */
export interface TopProcedimientosFilters extends DateRangeFilter {
  profesionalIds?: number[]
  limite?: number // Top N procedures
  ordenarPor?: "cantidad" | "ingresos"
}

// ============================================================================
// Report-Specific Response Types
// ============================================================================

/** Single appointment row in Citas Summary */
export interface CitaSummaryRow {
  idCita: number
  inicio: string
  fin: string
  estado: EstadoCita
  tipo: TipoCita
  paciente: {
    idPaciente: number
    nombreCompleto: string
    documento?: string
  }
  profesional: {
    idProfesional: number
    nombreCompleto: string
  }
  consultorio?: {
    idConsultorio: number
    nombre: string
  }
  motivo?: string
}

/** Response for Citas Summary Report */
export interface CitasSummaryResponse {
  metadata: ReportMetadata
  kpis: ReportKpi[]
  data: CitaSummaryRow[]
  pagination: PaginationMeta
}

/** Single patient row in Active Patients */
export interface PacienteActivoRow {
  idPaciente: number
  nombreCompleto: string
  documento?: string
  fechaNacimiento?: string
  edad?: number
  genero?: Genero
  telefono?: string
  email?: string
  ultimaCita?: {
    fecha: string
    tipo: TipoCita
    estado: EstadoCita
  }
  totalCitas: number
  diasDesdeUltimaCita?: number
  tieneAlertas: boolean
}

/** Response for Active Patients Report */
export interface PacientesActivosResponse {
  metadata: ReportMetadata
  kpis: ReportKpi[]
  data: PacienteActivoRow[]
  pagination: PaginationMeta
}

/** Single procedure row in Performed Procedures */
export interface ProcedimientoRealizadoRow {
  idConsultaProcedimiento: number
  fecha: string
  procedimiento: {
    idProcedimiento?: number
    codigo?: string
    nombre: string
  }
  paciente: {
    idPaciente: number
    nombreCompleto: string
  }
  profesional: {
    idProfesional: number
    nombreCompleto: string
  }
  cantidad: number
  precioUnitarioCents?: number
  totalCents?: number
  diente?: number
  superficie?: string
}

/** Response for Performed Procedures Report */
export interface ProcedimientosResponse {
  metadata: ReportMetadata
  kpis: ReportKpi[]
  data: ProcedimientoRealizadoRow[]
  pagination: PaginationMeta
}

/** Status breakdown for a time period */
export interface EstadoCitaPeriodo {
  periodo: string // Date or period label
  periodoInicio: string
  periodoFin: string
  estadisticas: {
    estado: EstadoCita
    cantidad: number
    porcentaje: number
  }[]
  total: number
}

/** Response for Appointment Status Analysis Report */
export interface EstadosCitasResponse {
  metadata: ReportMetadata
  kpis: ReportKpi[]
  data: EstadoCitaPeriodo[]
  resumenGeneral: {
    estado: EstadoCita
    cantidad: number
    porcentaje: number
  }[]
}

/** Single procedure in Top Procedures ranking */
export interface TopProcedimientoRow {
  ranking: number
  procedimiento: {
    idProcedimiento?: number
    codigo?: string
    nombre: string
  }
  cantidad: number
  ingresosTotalCents: number
  porcentajeCantidad: number
  porcentajeIngresos: number
}

/** Response for Top Procedures Ranking Report */
export interface TopProcedimientosResponse {
  metadata: ReportMetadata
  kpis: ReportKpi[]
  data: TopProcedimientoRow[]
}

// ============================================================================
// Union Types for Generic Handling
// ============================================================================

/** Union of all filter types */
export type ReportFilters =
  | CitasSummaryFilters
  | PacientesActivosFilters
  | ProcedimientosFilters
  | EstadosCitasFilters
  | TopProcedimientosFilters

/** Union of all response types */
export type ReportResponse =
  | CitasSummaryResponse
  | PacientesActivosResponse
  | ProcedimientosResponse
  | EstadosCitasResponse
  | TopProcedimientosResponse

// ============================================================================
// Report Configuration Types
// ============================================================================

/** Configuration for a report type */
export interface ReportConfig {
  type: ReportType
  name: string
  description: string
  icon: string // Lucide icon name
  allowedRoles: ReportRole[]
  category: "operativo" | "clinico" | "financiero"
  priority: number // For sorting in UI
}

/** RBAC context passed to services */
export interface ReportUserContext {
  userId: number
  username: string
  role: ReportRole
  profesionalId?: number // For ODONT role data scoping
}

/** Service execution result */
export interface ReportServiceResult<T extends ReportResponse> {
  success: true
  data: T
}

/** Service execution error */
export interface ReportServiceError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/** Combined service result type */
export type ReportResult<T extends ReportResponse> = ReportServiceResult<T> | ReportServiceError

// ============================================================================
// Report Definitions (Static Configuration)
// ============================================================================

/** Static configuration for all available reports */
export const REPORT_CONFIGS: Record<ReportType, ReportConfig> = {
  "citas-summary": {
    type: "citas-summary",
    name: "Resumen de Citas",
    description: "Visualiza y analiza las citas agendadas con filtros por estado, profesional y período.",
    icon: "Calendar",
    allowedRoles: ["ADMIN", "ODONT", "RECEP"],
    category: "operativo",
    priority: 1,
  },
  "pacientes-activos": {
    type: "pacientes-activos",
    name: "Pacientes Activos",
    description: "Lista de pacientes activos con información demográfica y última actividad.",
    icon: "Users",
    allowedRoles: ["ADMIN", "ODONT", "RECEP"],
    category: "operativo",
    priority: 2,
  },
  "procedimientos": {
    type: "procedimientos",
    name: "Procedimientos Realizados",
    description: "Detalle de procedimientos clínicos realizados con valores monetarios.",
    icon: "Stethoscope",
    allowedRoles: ["ADMIN", "ODONT"],
    category: "clinico",
    priority: 3,
  },
  "estados-citas": {
    type: "estados-citas",
    name: "Análisis de Estados de Citas",
    description: "Análisis de distribución de estados de citas y tendencias temporales.",
    icon: "PieChart",
    allowedRoles: ["ADMIN", "ODONT", "RECEP"],
    category: "operativo",
    priority: 4,
  },
  "top-procedimientos": {
    type: "top-procedimientos",
    name: "Ranking de Procedimientos",
    description: "Los procedimientos más frecuentes y con mayores ingresos.",
    icon: "TrendingUp",
    allowedRoles: ["ADMIN", "ODONT"],
    category: "financiero",
    priority: 5,
  },
}

/** Helper to check if a role can access a report */
export function canAccessReport(role: ReportRole, reportType: ReportType): boolean {
  const config = REPORT_CONFIGS[reportType]
  return config?.allowedRoles.includes(role) ?? false
}

/** Get reports accessible by a role, sorted by priority */
export function getAccessibleReports(role: ReportRole): ReportConfig[] {
  return Object.values(REPORT_CONFIGS)
    .filter((config) => config.allowedRoles.includes(role))
    .sort((a, b) => a.priority - b.priority)
}

