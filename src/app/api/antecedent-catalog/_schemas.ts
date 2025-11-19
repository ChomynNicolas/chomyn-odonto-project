// src/app/api/antecedent-catalog/_schemas.ts
/**
 * Schemas de validación para endpoints de antecedent catalog
 */

import { z } from "zod"

// AntecedentCategory enum values
const AntecedentCategoryEnum = z.enum([
  "CARDIOVASCULAR",
  "ENDOCRINE",
  "RESPIRATORY",
  "GASTROINTESTINAL",
  "NEUROLOGICAL",
  "SURGICAL_HISTORY",
  "SMOKING",
  "ALCOHOL",
  "OTHER",
])

// Query params for list endpoint
export const AntecedentCatalogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  category: AntecedentCategoryEnum.optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["code", "name", "category", "idAntecedentCatalog", "createdAt"]).optional().default("code"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const AntecedentCatalogCreateBodySchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  category: AntecedentCategoryEnum,
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

// Update body (all fields optional)
export const AntecedentCatalogUpdateBodySchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(255).optional(),
  category: AntecedentCategoryEnum.optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

// Path params
export const AntecedentCatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const AntecedentCatalogItemSchema = z.object({
  idAntecedentCatalog: z.number().int().positive(),
  code: z.string(),
  name: z.string(),
  category: AntecedentCategoryEnum,
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  referenceCount: z.number().int().nonnegative(), // Count of AnamnesisAntecedent references
})

export const AntecedentCatalogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(AntecedentCatalogItemSchema),
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
export type AntecedentCatalogListQuery = z.infer<typeof AntecedentCatalogListQuerySchema>
export type AntecedentCatalogCreateBody = z.infer<typeof AntecedentCatalogCreateBodySchema>
export type AntecedentCatalogUpdateBody = z.infer<typeof AntecedentCatalogUpdateBodySchema>
export type AntecedentCatalogItem = z.infer<typeof AntecedentCatalogItemSchema>
export type AntecedentCatalogListResponse = z.infer<typeof AntecedentCatalogListResponseSchema>
export type AntecedentCategory = z.infer<typeof AntecedentCategoryEnum>

