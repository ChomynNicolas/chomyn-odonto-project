// src/app/api/admin/procedimientos/_schemas.ts
/**
 * Schemas de validación para endpoints de procedimientos catalog
 */

import { z } from "zod"

// Query params for list endpoint
export const ProcedimientoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  activo: z.enum(["true", "false", "all"]).optional().default("all"),
  sortBy: z.enum(["code", "nombre", "idProcedimiento", "updatedAt"]).optional().default("code"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body
export const ProcedimientoCreateSchema = z
  .object({
    code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
    nombre: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
    defaultDurationMin: z.number().int().positive().max(1440).optional().nullable(), // Max 24 hours
    defaultPriceCents: z.number().int().nonnegative().optional().nullable(),
    aplicaDiente: z.boolean().default(false),
    aplicaSuperficie: z.boolean().default(false),
    activo: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // If aplicaSuperficie is true, aplicaDiente must also be true
      return !data.aplicaSuperficie || data.aplicaDiente
    },
    {
      message: "Si aplica a superficie, debe aplicar a diente",
      path: ["aplicaSuperficie"],
    }
  )

// Update body (all fields optional except code which can be changed only if unused)
export const ProcedimientoUpdateSchema = z
  .object({
    code: z.string().min(1).max(50).optional(),
    nombre: z.string().min(1).max(255).optional(),
    descripcion: z.string().max(1000).optional().nullable(),
    defaultDurationMin: z.number().int().positive().max(1440).optional().nullable(),
    defaultPriceCents: z.number().int().nonnegative().optional().nullable(),
    aplicaDiente: z.boolean().optional(),
    aplicaSuperficie: z.boolean().optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If aplicaSuperficie is true, aplicaDiente must also be true
      if (data.aplicaSuperficie === true && data.aplicaDiente === false) {
        return false
      }
      return true
    },
    {
      message: "Si aplica a superficie, debe aplicar a diente",
      path: ["aplicaSuperficie"],
    }
  )

// Path params
export const ProcedimientoIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const ProcedimientoItemSchema = z.object({
  idProcedimiento: z.number().int().positive(),
  code: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  defaultDurationMin: z.number().int().nullable(),
  defaultPriceCents: z.number().int().nullable(),
  aplicaDiente: z.boolean(),
  aplicaSuperficie: z.boolean(),
  activo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Reference counts
  tratamientoStepsCount: z.number().int().nonnegative(),
  consultaProcedimientosCount: z.number().int().nonnegative(),
})

export const ProcedimientoDetailSchema = z.object({
  idProcedimiento: z.number().int().positive(),
  code: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  defaultDurationMin: z.number().int().nullable(),
  defaultPriceCents: z.number().int().nullable(),
  aplicaDiente: z.boolean(),
  aplicaSuperficie: z.boolean(),
  activo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Reference counts
  tratamientoStepsCount: z.number().int().nonnegative(),
  consultaProcedimientosCount: z.number().int().nonnegative(),
  // Flag indicating if code can be changed
  canChangeCode: z.boolean(),
})

export const ProcedimientoListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(ProcedimientoItemSchema),
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
export type ProcedimientoListQuery = z.infer<typeof ProcedimientoListQuerySchema>
export type ProcedimientoCreateBody = z.infer<typeof ProcedimientoCreateSchema>
export type ProcedimientoUpdateBody = z.infer<typeof ProcedimientoUpdateSchema>
export type ProcedimientoItem = z.infer<typeof ProcedimientoItemSchema>
export type ProcedimientoDetail = z.infer<typeof ProcedimientoDetailSchema>
export type ProcedimientoListResponse = z.infer<typeof ProcedimientoListResponseSchema>

