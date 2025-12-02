// src/app/api/pacientes/[id]/audit/route.ts
/**
 * GET /api/pacientes/[id]/audit
 * Obtiene el historial de auditoría contextual de un paciente
 * Visible para ADMIN (completo) y ODONT (solo clínico)
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
      return errors.validation("ID de paciente inválido")
    }
    const pacienteId = parsed.data.id

    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const permissions = getAuditPermissions(userRole)

    // Verificar que el usuario puede ver historial contextual
    if (!permissions.canViewContextualLog) {
      return errors.forbidden("No tiene permisos para ver el historial de auditoría")
    }

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return errors.notFound("Paciente no encontrado")
    }

    // Para ODONT: verificar que puede ver este paciente (opcional, según reglas de negocio)
    // Por ahora permitimos que ODONT vea cualquier paciente si tiene acceso contextual

    // Obtener logs relacionados con este paciente
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          // Eventos directamente del paciente
          { entity: "Patient", entityId: pacienteId },
          // Eventos de odontograma del paciente
          {
            entity: "OdontogramSnapshot",
            metadata: {
              path: ["pacienteId"],
              equals: pacienteId,
            },
          },
          // Eventos de diagnósticos del paciente
          {
            entity: "PatientDiagnosis",
            metadata: {
              path: ["pacienteId"],
              equals: pacienteId,
            },
          },
          // Eventos de consultas del paciente (a través de cita)
          {
            entity: "Consulta",
            metadata: {
              path: ["pacienteId"],
              equals: pacienteId,
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
      take: 100, // Límite para historial contextual
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
      shouldShowEntry(entry, userRole, { pacienteId })
    )

    // Aplicar filtros de visibilidad (ofuscar datos sensibles)
    const visibleLogs = filterAuditEntries(filteredLogs, userRole)

    return ok({
      data: visibleLogs,
      pacienteId,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/pacientes/[id]/audit]", e)
    return errors.internal(errorMessage ?? "Error al obtener historial de auditoría")
  }
}

