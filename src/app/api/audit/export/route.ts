// src/app/api/audit/export/route.ts
/**
 * GET /api/audit/export
 * Exporta registros de auditoría filtrados a CSV
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { errors } from "@/app/api/_http"
import { auditLogFiltersSchema } from "../_schemas"
import { prisma } from "@/lib/prisma"
import { buildAuditLogWhere } from "@/lib/audit/build-audit-where"
import { ACTION_LABELS, ENTITY_LABELS } from "@/lib/types/audit"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    // Solo ADMIN puede exportar logs
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    if (userRole !== "ADMIN") {
      return errors.forbidden("Solo administradores pueden exportar registros de auditoría")
    }

    // Parsear y validar query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = auditLogFiltersSchema.parse(searchParams)

    // Construir condiciones de filtro usando helper centralizado
    const where = buildAuditLogWhere(filters)

    // Obtener todos los registros (sin límite de paginación para exportación)
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        [filters.sortBy ?? "createdAt"]: filters.sortOrder ?? "desc",
      },
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
      take: 10000, // Límite máximo para exportación
    })

    // Generar CSV
    const headers = [
      "ID",
      "Fecha y Hora",
      "Usuario",
      "Email",
      "Rol",
      "Acción",
      "Entidad",
      "ID Recurso",
      "IP",
      "Resumen",
      "Metadata",
    ]

    const rows = logs.map((log) => {
      const actionLabel = ACTION_LABELS[log.action] || log.action
      const entityLabel = ENTITY_LABELS[log.entity] || log.entity
      const metadata = log.metadata as Record<string, unknown> | null
      const summary = metadata?.summary || metadata?.entriesCount
        ? `${metadata.summary || `${metadata.entriesCount} entrada(s)`}`
        : ""

      return [
        log.idAuditLog,
        log.createdAt.toISOString(),
        log.actor.nombreApellido,
        log.actor.email || "",
        log.actor.rol.nombreRol,
        actionLabel,
        entityLabel,
        log.entityId,
        log.ip || "",
        summary,
        JSON.stringify(metadata || {}),
      ]
    })

    // Escapar valores CSV
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return ""
      const str = String(value)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n")

    // Retornar CSV
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return errors.validation(zodError.issues?.[0]?.message ?? "Parámetros de filtro inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/audit/export]", e)
    return errors.internal(errorMessage ?? "Error al exportar registros de auditoría")
  }
}
