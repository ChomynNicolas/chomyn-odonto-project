// src/lib/audit/build-audit-where.ts
/**
 * Helper para construir condiciones de filtro de auditoría para Prisma
 * Centraliza la lógica duplicada entre /api/audit/logs y /api/audit/export
 */

import type { Prisma } from "@prisma/client"
import type { AuditLogFiltersInput } from "@/app/api/audit/_schemas"

/**
 * Construye el objeto `where` de Prisma para consultas de AuditLog
 * basándose en los filtros proporcionados.
 */
export function buildAuditLogWhere(
  filters: AuditLogFiltersInput
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}

  // Filtro por rango de fechas
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom)
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo)
    }
  }

  // Filtro por usuario
  if (filters.actorId) {
    where.actorId = filters.actorId
  }

  // Filtro por acción(es) - soporta múltiples acciones o una sola
  if (filters.actions && filters.actions.length > 0) {
    where.action = { in: filters.actions }
  } else if (filters.action) {
    where.action = filters.action
  }

  // Filtro por entidad(es) - soporta múltiples entidades o una sola
  if (filters.entities && filters.entities.length > 0) {
    where.entity = { in: filters.entities }
  } else if (filters.entity) {
    where.entity = filters.entity
  }

  // Filtro por ID de entidad
  if (filters.entityId) {
    where.entityId = filters.entityId
  }

  // Filtro por IP
  if (filters.ip) {
    where.ip = filters.ip
  }

  // Búsqueda en metadata (búsqueda de texto en acción, entidad y summary)
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: "insensitive" } },
      { entity: { contains: filters.search, mode: "insensitive" } },
      {
        metadata: {
          path: ["summary"],
          string_contains: filters.search,
        },
      },
    ]
  }

  return where
}

