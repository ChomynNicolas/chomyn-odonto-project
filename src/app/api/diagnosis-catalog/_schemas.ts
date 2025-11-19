// src/app/api/diagnosis-catalog/_schemas.ts
/**
 * Schemas de validación para endpoints de diagnosis catalog
 */

import { z } from "zod"

// Query params for list endpoint
export const DiagnosisCatalogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["code", "name", "idDiagnosisCatalog", "createdAt"]).optional().default("code"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const DiagnosisCatalogCreateBodySchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

// Update body (all fields optional, code can be updated but discouraged)
export const DiagnosisCatalogUpdateBodySchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

// Path params
export const DiagnosisCatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const DiagnosisCatalogItemSchema = z.object({
  idDiagnosisCatalog: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  referenceCount: z.number().int().nonnegative(), // Count of PatientDiagnosis references
})

export const DiagnosisCatalogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(DiagnosisCatalogItemSchema),
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
export type DiagnosisCatalogListQuery = z.infer<typeof DiagnosisCatalogListQuerySchema>
export type DiagnosisCatalogCreateBody = z.infer<typeof DiagnosisCatalogCreateBodySchema>
export type DiagnosisCatalogUpdateBody = z.infer<typeof DiagnosisCatalogUpdateBodySchema>
export type DiagnosisCatalogItem = z.infer<typeof DiagnosisCatalogItemSchema>
export type DiagnosisCatalogListResponse = z.infer<typeof DiagnosisCatalogListResponseSchema>

