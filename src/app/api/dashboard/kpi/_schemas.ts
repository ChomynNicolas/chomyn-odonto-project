// src/app/api/dashboard/kpi/_schemas.ts
import { z } from "zod"

const asDate = z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date())

export const getKpiQuerySchema = z.object({
  // filtros opcionales (scopes por rol)
  profesionalId: z.coerce.number().int().positive().optional(),
  consultorioId: z.coerce.number().int().positive().optional(),
  fecha: asDate.optional(), // por defecto hoy
  slotMin: z.coerce.number().int().positive().default(30), // tamaño de slot para ocupación
})

export type GetKpiQuery = z.infer<typeof getKpiQuerySchema>




// ============== Schema de filtros ==============
export const kpiFiltersSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  profesionalIds: z.array(z.number().int().positive()).optional(),
  consultorioIds: z.array(z.number().int().positive()).optional(),
  tipoCita: z.array(z.string()).optional(),
  estadoCita: z.array(z.string()).optional(),
  procedimientoIds: z.array(z.number().int().positive()).optional(),
  diagnosisIds: z.array(z.number().int().positive()).optional(),
  genero: z.array(z.string()).optional(),
  edadMin: z.number().int().min(0).max(150).optional(),
  edadMax: z.number().int().min(0).max(150).optional(),
  pacienteNuevo: z.boolean().optional(),
  privacyMode: z.boolean().optional().default(false),
})

export type KpiFiltersInput = z.infer<typeof kpiFiltersSchema>

// ============== Schema para drill-down pagination ==============
export const drillDownQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

export type DrillDownQuery = z.infer<typeof drillDownQuerySchema>

// ============== Presets de rango de fechas ==============
export const dateRangePresetSchema = z.enum([
  "today",
  "last7days",
  "last30days",
  "last90days",
  "currentMonth",
  "custom",
])

export type DateRangePreset = z.infer<typeof dateRangePresetSchema>
