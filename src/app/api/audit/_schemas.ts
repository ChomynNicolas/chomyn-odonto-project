// src/app/api/audit/_schemas.ts
/**
 * Schemas de validación para endpoints de auditoría
 */

import { z } from "zod"

/**
 * Preprocessa los parámetros de búsqueda para convertir strings separados por comas en arrays
 * Esto es necesario porque URLSearchParams siempre devuelve strings
 */
function preprocessSearchParams(params: Record<string, string | string[]>): Record<string, unknown> {
  const processed: Record<string, unknown> = { ...params }
  
  // Convertir actions de string a array si es necesario
  if (processed.actions) {
    if (typeof processed.actions === "string") {
      processed.actions = processed.actions.split(",").filter(Boolean)
    }
  }
  
  // Convertir entities de string a array si es necesario
  if (processed.entities) {
    if (typeof processed.entities === "string") {
      processed.entities = processed.entities.split(",").filter(Boolean)
    }
  }
  
  return processed
}

// Schema helper para convertir string o array a array
const stringOrArrayToArray = z.preprocess(
  (val) => {
    if (!val) return undefined
    if (Array.isArray(val)) return val
    if (typeof val === "string") {
      // Si es un string separado por comas, convertirlo a array
      const parts = val.split(",").map((s) => s.trim()).filter(Boolean)
      return parts.length > 0 ? parts : undefined
    }
    return undefined
  },
  z.array(z.string()).optional()
)

export const auditLogFiltersSchema = z
  .object({
    // Rango de fechas
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    
    // Usuario
    actorId: z.coerce.number().int().positive().optional(),
    
    // Tipo de acción - soporta string (single) o array (multiple)
    action: z.string().optional(),
    actions: stringOrArrayToArray,
    
    // Entidad/Recurso - soporta string (single) o array (multiple)
    entity: z.string().optional(),
    entities: stringOrArrayToArray,
    
    // ID del recurso
    entityId: z.coerce.number().int().positive().optional(),
    
    // Búsqueda en metadata
    search: z.string().min(1).max(200).optional(),
    
    // IP (validación básica, se valida más estrictamente en el backend si es necesario)
    ip: z.string().optional(),
    
    // Paginación
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().min(1).max(100).default(20),
    
    // Ordenamiento
    sortBy: z.enum(["createdAt", "action", "entity", "actor"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (data) => {
      // No permitir action y actions al mismo tiempo
      if (data.action && data.actions && data.actions.length > 0) {
        return false
      }
      // No permitir entity y entities al mismo tiempo
      if (data.entity && data.entities && data.entities.length > 0) {
        return false
      }
      return true
    },
    {
      message: "No se puede usar action y actions, o entity y entities al mismo tiempo",
    }
  )

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>

/**
 * Helper para parsear y validar los parámetros de búsqueda de auditoría
 * Preprocesa los parámetros antes de la validación
 */
export function parseAuditLogFilters(
  searchParams: URLSearchParams | Record<string, string | string[]>
): AuditLogFiltersInput {
  const params =
    searchParams instanceof URLSearchParams
      ? Object.fromEntries(searchParams.entries())
      : searchParams
  
  const processed = preprocessSearchParams(params)
  return auditLogFiltersSchema.parse(processed)
}

