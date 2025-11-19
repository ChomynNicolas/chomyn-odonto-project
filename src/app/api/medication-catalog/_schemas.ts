// src/app/api/medication-catalog/_schemas.ts
/**
 * Schemas de validación para endpoints de medication catalog
 */

import { z } from "zod"

// Query params for list endpoint
export const MedicationCatalogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["name", "idMedicationCatalog", "createdAt"]).optional().default("name"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const MedicationCatalogCreateBodySchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

// Update body (all fields optional)
export const MedicationCatalogUpdateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
})

// Path params
export const MedicationCatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const MedicationCatalogItemSchema = z.object({
  idMedicationCatalog: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  patientMedicationCount: z.number().int().nonnegative(), // Count of PatientMedication references
})

export const MedicationCatalogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(MedicationCatalogItemSchema),
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
export type MedicationCatalogListQuery = z.infer<typeof MedicationCatalogListQuerySchema>
export type MedicationCatalogCreateBody = z.infer<typeof MedicationCatalogCreateBodySchema>
export type MedicationCatalogUpdateBody = z.infer<typeof MedicationCatalogUpdateBodySchema>
export type MedicationCatalogItem = z.infer<typeof MedicationCatalogItemSchema>
export type MedicationCatalogListResponse = z.infer<typeof MedicationCatalogListResponseSchema>

