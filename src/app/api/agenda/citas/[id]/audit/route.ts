// src/app/api/agenda/citas/[id]/audit/route.ts
/**
 * GET /api/agenda/citas/[id]/audit
 * Obtiene el historial de auditoría contextual de una cita
 * Visible para ADMIN (completo), ODONT (solo propia) y RECEP (solo asignadas)
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { getAuditPermissions } from "@/lib/audit/rbac"
import { filterAuditEntries, shouldShowEntry } from "@/lib/audit/filters"
import type { AuditLogEntry } from "@/lib/types/audit"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) {
      return errors.validation("ID de cita inválido")
    }
    const citaId = parsed.data

    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0
    const permissions = getAuditPermissions(userRole)

    // Verificar que el usuario puede ver historial contextual
    if (!permissions.canViewContextualLog) {
      return errors.forbidden("No tiene permisos para ver el historial de auditoría")
    }

    // Obtener información de la cita para verificar permisos
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      select: {
        idCita: true,
        pacienteId: true,
        profesionalId: true,
        estado: true,
      },
    })

    if (!cita) {
      return errors.notFound("Cita no encontrada")
    }

    // Verificar permisos según rol
    if (userRole === "ODONT") {
      // ODONT solo ve sus propias citas
      // TODO: Verificar que el profesionalId coincide con el usuario actual
      // Por ahora permitimos si tiene acceso contextual
    } else if (userRole === "RECEP") {
      // RECEP solo ve citas asignadas
      // TODO: Verificar asignación de la cita
      // Por ahora permitimos si tiene acceso contextual
    }

    // Obtener logs relacionados con esta cita
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          // Eventos directamente de la cita
          { entity: "Appointment", entityId: citaId },
          // Eventos de consulta asociada
          {
            entity: "Consulta",
            metadata: {
              path: ["citaId"],
              equals: citaId,
            },
          },
          // Eventos de odontograma de la consulta
          {
            entity: "OdontogramSnapshot",
            metadata: {
              path: ["consultaId"],
              equals: citaId,
            },
          },
        ],
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
      orderBy: { createdAt: "desc" },
      take: 50, // Límite para historial contextual
    })

    // Formatear logs
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

    // Filtrar según rol y contexto
    const filteredLogs = formattedLogs.filter((entry) =>
      shouldShowEntry(entry, userRole, { citaId, pacienteId: cita.pacienteId })
    )

    // Aplicar filtros de visibilidad (ofuscar datos sensibles)
    const visibleLogs = filterAuditEntries(filteredLogs, userRole)

    return ok({
      data: visibleLogs,
      citaId,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/audit]", e)
    return errors.internal(errorMessage ?? "Error al obtener historial de auditoría")
  }
}

