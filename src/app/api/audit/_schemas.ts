// src/app/api/audit/_schemas.ts
/**
 * Schemas de validación para endpoints de auditoría
 */

import { z } from "zod"

export const auditLogFiltersSchema = z.object({
  // Rango de fechas
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  
  // Usuario
  actorId: z.coerce.number().int().positive().optional(),
  
  // Tipo de acción
  action: z.string().optional(),
  actions: z.array(z.string()).optional(),
  
  // Entidad/Recurso
  entity: z.string().optional(),
  entities: z.array(z.string()).optional(),
  
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

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>

