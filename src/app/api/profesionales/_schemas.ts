// src/app/api/profesionales/_schemas.ts
/**
 * Schemas de validación para endpoints de profesionales
 */

import { z } from "zod"

// Schema para estructura de disponibilidad JSON
const TimeRangeSchema = z.object({
  start: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm requerido"),
  end: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Formato HH:mm requerido"),
})

const WeeklyScheduleSchema = z.object({
  monday: z.array(TimeRangeSchema).optional(),
  tuesday: z.array(TimeRangeSchema).optional(),
  wednesday: z.array(TimeRangeSchema).optional(),
  thursday: z.array(TimeRangeSchema).optional(),
  friday: z.array(TimeRangeSchema).optional(),
  saturday: z.array(TimeRangeSchema).optional(),
  sunday: z.array(TimeRangeSchema).optional(),
})

const ExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD requerido"),
  timeRanges: z.array(TimeRangeSchema).optional(), // Si está vacío o ausente, no disponible ese día
  note: z.string().max(500).optional(),
})

export const DisponibilidadSchema = z.object({
  weekly: WeeklyScheduleSchema.optional(),
  exceptions: z.array(ExceptionSchema).optional(),
  timezone: z.string().default("America/Asuncion").optional(),
})

export type Disponibilidad = z.infer<typeof DisponibilidadSchema>

// Schema para query params de listado
export const ProfesionalListQuerySchema = z.object({
  // Filtros
  estaActivo: z
    .string()
    .optional()
    .transform((val) => {
      if (val === "true") return true
      if (val === "false") return false
      return undefined
    }),
  especialidadId: z.coerce.number().int().positive().optional(),
  search: z.string().min(1).max(200).optional(), // Búsqueda por nombre/licencia

  // Paginación
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),

  // Ordenamiento
  sortBy: z.enum(["nombre", "numeroLicencia", "createdAt"]).default("nombre"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export type ProfesionalListQuery = z.infer<typeof ProfesionalListQuerySchema>

// Schema para creación de profesional
export const ProfesionalCreateBodySchema = z.object({
  personaId: z.number().int().positive(),
  userId: z.number().int().positive(),
  numeroLicencia: z.string().max(100).optional().nullable(),
  estaActivo: z.boolean().default(true),
  disponibilidad: DisponibilidadSchema.optional().nullable(),
  especialidadIds: z.array(z.number().int().positive()).default([]),
})

export type ProfesionalCreateBody = z.infer<typeof ProfesionalCreateBodySchema>

// Schema para actualización de profesional
export const ProfesionalUpdateBodySchema = z.object({
  numeroLicencia: z.string().max(100).optional().nullable(),
  estaActivo: z.boolean().optional(),
  disponibilidad: DisponibilidadSchema.optional().nullable(),
  especialidadIds: z.array(z.number().int().positive()).optional(),
})

export type ProfesionalUpdateBody = z.infer<typeof ProfesionalUpdateBodySchema>

// Schema para actualización solo de disponibilidad
export const DisponibilidadUpdateBodySchema = z.object({
  disponibilidad: DisponibilidadSchema,
})

export type DisponibilidadUpdateBody = z.infer<typeof DisponibilidadUpdateBodySchema>

// Schema para toggle activo
export const ToggleActivoBodySchema = z.object({
  estaActivo: z.boolean(),
})

export type ToggleActivoBody = z.infer<typeof ToggleActivoBodySchema>

// Schemas para búsqueda en wizard
export const PersonaSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().positive().min(1).max(50).default(20),
})

export type PersonaSearchQuery = z.infer<typeof PersonaSearchQuerySchema>

export const UsuarioSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().positive().min(1).max(50).default(20),
})

export type UsuarioSearchQuery = z.infer<typeof UsuarioSearchQuerySchema>

