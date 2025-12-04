// src/app/api/treatment-plan-catalog/_schemas.ts
/**
 * Schemas de validación para endpoints de treatment plan catalog
 */

import { z } from "zod"
import { DienteSuperficie } from "@prisma/client"

const DienteSuperficieSchema = z.nativeEnum(DienteSuperficie)

// Query params for list endpoint
export const TreatmentPlanCatalogListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["code", "nombre", "idTreatmentPlanCatalog", "createdAt"]).optional().default("code"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Step schema for catalog steps
const CatalogStepSchema = z.object({
  order: z.number().int().positive(),
  procedureId: z.number().int().positive().nullable().optional(),
  serviceType: z.string().max(200).nullable().optional(),
  toothNumber: z
    .number()
    .int()
    .refine((n) => (n >= 1 && n <= 32) || (n >= 51 && n <= 85), {
      message: "toothNumber debe estar entre 1-32 o 51-85",
    })
    .nullable()
    .optional(),
  toothSurface: DienteSuperficieSchema.nullable().optional(),
  estimatedDurationMin: z.number().int().positive().nullable().optional(),
  estimatedCostCents: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  requiresMultipleSessions: z.boolean().optional(),
  totalSessions: z.number().int().min(2).max(10).nullable().optional(),
  currentSession: z.number().int().positive().nullable().optional(),
})

// Create body
export const TreatmentPlanCatalogCreateBodySchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
  steps: z.array(CatalogStepSchema).min(1, "Debe haber al menos un paso en el plan"),
})

// Update body (all fields optional)
export const TreatmentPlanCatalogUpdateBodySchema = z.object({
  code: z.string().min(1).max(50).optional(),
  nombre: z.string().min(1).max(200).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  steps: z.array(CatalogStepSchema.extend({ id: z.number().int().positive().optional() })).optional(),
})

// Path params
export const TreatmentPlanCatalogIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const TreatmentPlanCatalogStepItemSchema = z.object({
  idTreatmentPlanCatalogStep: z.number().int().positive(),
  catalogPlanId: z.number().int().positive(),
  order: z.number().int().positive(),
  procedureId: z.number().int().positive().nullable(),
  serviceType: z.string().nullable(),
  toothNumber: z.number().int().nullable(),
  toothSurface: DienteSuperficieSchema.nullable(),
  estimatedDurationMin: z.number().int().nullable(),
  estimatedCostCents: z.number().int().nullable(),
  priority: z.number().int().nullable(),
  notes: z.string().nullable(),
  requiresMultipleSessions: z.boolean(),
  totalSessions: z.number().int().nullable(),
  currentSession: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const TreatmentPlanCatalogItemSchema = z.object({
  idTreatmentPlanCatalog: z.number().int().positive(),
  code: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  steps: z.array(TreatmentPlanCatalogStepItemSchema),
  referenceCount: z.number().int().nonnegative(), // Count of TreatmentPlan references
})

export const TreatmentPlanCatalogListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(TreatmentPlanCatalogItemSchema),
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
export type TreatmentPlanCatalogListQuery = z.infer<typeof TreatmentPlanCatalogListQuerySchema>
export type TreatmentPlanCatalogCreateBody = z.infer<typeof TreatmentPlanCatalogCreateBodySchema>
export type TreatmentPlanCatalogUpdateBody = z.infer<typeof TreatmentPlanCatalogUpdateBodySchema>
export type TreatmentPlanCatalogItem = z.infer<typeof TreatmentPlanCatalogItemSchema>
export type TreatmentPlanCatalogStepItem = z.infer<typeof TreatmentPlanCatalogStepItemSchema>
export type TreatmentPlanCatalogListResponse = z.infer<typeof TreatmentPlanCatalogListResponseSchema>

