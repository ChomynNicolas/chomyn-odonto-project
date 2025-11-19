// src/app/api/admin/especialidades/_schemas.ts
/**
 * Schemas de validación para endpoints de especialidades
 */

import { z } from "zod"

// Query params for list endpoint
export const EspecialidadListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["nombre", "idEspecialidad"]).optional().default("nombre"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const EspecialidadCreateBodySchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(255),
  descripcion: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
})

// Update body (all fields optional)
export const EspecialidadUpdateBodySchema = z.object({
  nombre: z.string().min(1).max(255).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

// Path params
export const EspecialidadIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const EspecialidadItemSchema = z.object({
  idEspecialidad: z.number().int().positive(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  isActive: z.boolean(),
  profesionalCount: z.number().int().nonnegative(), // Count of ProfesionalEspecialidad
})

export const EspecialidadListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(EspecialidadItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

// Type exports
export type EspecialidadListQuery = z.infer<typeof EspecialidadListQuerySchema>
export type EspecialidadCreateBody = z.infer<typeof EspecialidadCreateBodySchema>
export type EspecialidadUpdateBody = z.infer<typeof EspecialidadUpdateBodySchema>
export type EspecialidadItem = z.infer<typeof EspecialidadItemSchema>
export type EspecialidadListResponse = z.infer<typeof EspecialidadListResponseSchema>

