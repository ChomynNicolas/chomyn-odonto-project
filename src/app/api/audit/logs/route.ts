// src/app/api/audit/logs/route.ts
/**
 * GET /api/audit/logs
 * Endpoint principal para consultar registros de auditoría con filtros avanzados
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { parseAuditLogFilters } from "../_schemas"
import { prisma } from "@/lib/prisma"
import { canAccessGlobalAuditLog } from "@/lib/audit/rbac"
import { filterAuditEntries } from "@/lib/audit/filters"
import { buildAuditLogWhere } from "@/lib/audit/build-audit-where"
import type { AuditLogEntry } from "@/lib/types/audit"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    // Verificar permisos usando RBAC
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    if (!canAccessGlobalAuditLog(userRole)) {
      return errors.forbidden("Solo administradores pueden ver el log de auditoría completo")
    }

    // Parsear y validar query params
    let filters
    try {
      filters = parseAuditLogFilters(req.nextUrl.searchParams)
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        const zodError = error as { issues?: Array<{ path: (string | number)[]; message: string }> }
        const firstIssue = zodError.issues?.[0]
        const field = firstIssue?.path?.join(".") || "filtro"
        const message = firstIssue?.message || "Parámetro de filtro inválido"
        console.error("[GET /api/audit/logs] Error de validación:", zodError.issues)
        return errors.validation(`Error en el filtro '${field}': ${message}`)
      }
      throw error
    }

    // Construir condiciones de filtro usando helper centralizado
    const where = buildAuditLogWhere(filters)

    // Calcular paginación
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const skip = (page - 1) * limit

    // Contar total de registros
    const total = await prisma.auditLog.count({ where })

    // Construir orderBy - manejar sorting por relación actor
    const sortBy = filters.sortBy ?? "createdAt"
    const sortOrder = filters.sortOrder ?? "desc"
    
    let orderBy: Record<string, "asc" | "desc"> | { actor: { nombreApellido: "asc" | "desc" } }
    
    if (sortBy === "actor") {
      orderBy = {
        actor: {
          nombreApellido: sortOrder,
        },
      }
    } else {
      orderBy = {
        [sortBy]: sortOrder,
      }
    }

    // Obtener registros con paginación
    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        actor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            email: true,
            rol: {
              select: {
                nombreRol: true,
              },
            },
          },
        },
      },
    })

    // Formatear respuesta (ADMIN ve todo sin filtros)
    const formattedLogs: AuditLogEntry[] = logs.map((log) => ({
      id: log.idAuditLog,
      createdAt: log.createdAt.toISOString(),
      actor: {
        id: log.actor.idUsuario,
        nombre: log.actor.nombreApellido,
        email: log.actor.email,
        role: log.actor.rol.nombreRol as "ADMIN" | "ODONT" | "RECEP",
      },
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ip: log.ip,
      metadata: log.metadata as Record<string, unknown> | null,
    }))
    
    // Aplicar filtros según rol (aunque aquí solo ADMIN accede, mantener consistencia)
    const filteredLogs = filterAuditEntries(formattedLogs, userRole)

    const totalPages = Math.ceil(total / limit)

    return ok({
      data: filteredLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        ...filters,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      },
    })
  } catch (e: unknown) {
    // Los errores de validación ya se manejan arriba, aquí solo errores inesperados
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/audit/logs]", e)
    return errors.internal(errorMessage ?? "Error al obtener registros de auditoría")
  }
}

