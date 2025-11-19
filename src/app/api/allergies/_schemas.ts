// src/app/api/allergies/_schemas.ts
/**
 * Schemas de validación para endpoints de allergy catalog
 */

import { z } from "zod"

// Query params for list endpoint
export const AllergyCatalogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["name", "idAllergyCatalog", "createdAt"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const AllergyCatalogCreateBodySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

// Update body (all fields optional)
export const AllergyCatalogUpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

// Path params
export const AllergyCatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const AllergyCatalogItemSchema = z.object({
  idAllergyCatalog: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  referenceCount: z.number().int().nonnegative(), // Count of PatientAllergy references
})

export const AllergyCatalogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(AllergyCatalogItemSchema),
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
export type AllergyCatalogListQuery = z.infer<typeof AllergyCatalogListQuerySchema>
export type AllergyCatalogCreateBody = z.infer<typeof AllergyCatalogCreateBodySchema>
export type AllergyCatalogUpdateBody = z.infer<typeof AllergyCatalogUpdateBodySchema>
export type AllergyCatalogItem = z.infer<typeof AllergyCatalogItemSchema>
export type AllergyCatalogListResponse = z.infer<typeof AllergyCatalogListResponseSchema>

