// src/app/api/anamnesis-config/_schemas.ts
/**
 * Schemas de validación para endpoints de AnamnesisConfig
 */

import { z } from "zod"

// Known key schemas map for per-key validation
export const KNOWN_KEY_SCHEMAS: Record<string, z.ZodTypeAny> = {
  MANDATORY_FIRST_CONSULTATION: z.boolean(),
  ALLOW_EDIT_SUBSEQUENT: z.boolean(),
  ALERT_IF_SEVERE_ALLERGY: z.boolean(),
  PEDIATRIC_EXTRA_SECTIONS: z.union([
    z.array(z.string()),
    z.record(z.string(), z.unknown()),
  ]),
}

// High-impact keys that require confirmation
export const HIGH_IMPACT_KEYS = [
  "MANDATORY_FIRST_CONSULTATION",
  "ALLOW_EDIT_SUBSEQUENT",
  "ALERT_IF_SEVERE_ALLERGY",
] as const

/**
 * Validates a config value based on its key
 * For known keys, uses specific schema; for unknown keys, validates as valid JSON
 */
export function validateConfigValue(key: string, value: unknown): unknown {
  const schema = KNOWN_KEY_SCHEMAS[key]
  if (schema) {
    return schema.parse(value)
  }
  // For unknown keys, validate as valid JSON (any valid JSON value)
  return z.any().parse(value)
}

// Query params for list endpoint
export const AnamnesisConfigListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(["key", "idAnamnesisConfig", "updatedAt"]).optional().default("key"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
})

// Create body schema
export const AnamnesisConfigCreateBodySchema = z.object({
  key: z
    .string()
    .min(1, "La clave es requerida")
    .max(100)
    .trim()
    .regex(/^[A-Z0-9_]+$/, "La clave debe contener solo letras mayúsculas, números y guiones bajos"),
  value: z.unknown(), // Will be validated by validateConfigValue
  description: z.string().max(500).trim().optional().nullable(),
}).refine(
  (data) => {
    try {
      validateConfigValue(data.key, data.value)
      return true
    } catch {
      return false
    }
  },
  {
    message: "El valor no es válido para esta clave",
    path: ["value"],
  }
)

// Update body schema (value and description only, no key)
export const AnamnesisConfigUpdateBodySchema = z.object({
  value: z.unknown(), // Will be validated by validateConfigValue based on existing key
  description: z.string().max(500).trim().optional().nullable(),
})

// Path params
export const AnamnesisConfigIdSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Response schemas
export const AnamnesisConfigItemSchema = z.object({
  idAnamnesisConfig: z.number().int().positive(),
  key: z.string(),
  value: z.unknown(),
  description: z.string().nullable(),
  updatedAt: z.date(),
  updatedBy: z.object({
    idUsuario: z.number(),
    nombreApellido: z.string(),
    usuario: z.string(),
  }),
})

export const AnamnesisConfigListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(AnamnesisConfigItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
})

export const AnamnesisConfigDetailResponseSchema = z.object({
  ok: z.literal(true),
  data: AnamnesisConfigItemSchema,
})

// Type exports
export type AnamnesisConfigListQuery = z.infer<typeof AnamnesisConfigListQuerySchema>
export type AnamnesisConfigCreateBody = z.infer<typeof AnamnesisConfigCreateBodySchema>
export type AnamnesisConfigUpdateBody = z.infer<typeof AnamnesisConfigUpdateBodySchema>
export type AnamnesisConfigItem = z.infer<typeof AnamnesisConfigItemSchema>
export type AnamnesisConfigListResponse = z.infer<typeof AnamnesisConfigListResponseSchema>
export type AnamnesisConfigDetailResponse = z.infer<typeof AnamnesisConfigDetailResponseSchema>

