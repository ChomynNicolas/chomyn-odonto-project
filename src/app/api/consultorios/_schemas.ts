// src/app/api/consultorios/_schemas.ts
/**
 * Schemas de validación para endpoints de consultorios
 */

import { z } from "zod"

// Query params for list endpoint
export const ConsultorioListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  activo: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["nombre", "idConsultorio", "createdAt"]).optional().default("nombre"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const ConsultorioCreateBodySchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100).trim(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "El color debe ser un código hexadecimal válido (ej: #FF5733)")
    .optional()
    .nullable(),
  activo: z.boolean().default(true),
})

// Update body (all fields optional)
export const ConsultorioUpdateBodySchema = z.object({
  nombre: z.string().min(1).max(100).trim().optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "El color debe ser un código hexadecimal válido (ej: #FF5733)")
    .optional()
    .nullable(),
  activo: z.boolean().optional(),
})

// Path params
export const ConsultorioIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const ConsultorioItemSchema = z.object({
  idConsultorio: z.number().int().positive(),
  nombre: z.string(),
  colorHex: z.string().nullable(),
  activo: z.boolean(),
  countFutureCitas: z.number().int().nonnegative(), // Count of future citas (inicio > now())
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const ConsultorioListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(ConsultorioItemSchema),
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
export type ConsultorioListQuery = z.infer<typeof ConsultorioListQuerySchema>
export type ConsultorioCreateBody = z.infer<typeof ConsultorioCreateBodySchema>
export type ConsultorioUpdateBody = z.infer<typeof ConsultorioUpdateBodySchema>
export type ConsultorioItem = z.infer<typeof ConsultorioItemSchema>
export type ConsultorioListResponse = z.infer<typeof ConsultorioListResponseSchema>

