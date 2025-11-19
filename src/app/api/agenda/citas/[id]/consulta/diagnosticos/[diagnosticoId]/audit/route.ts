// src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit/route.ts
/**
 * GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit
 * Obtiene el historial completo de auditoría para un diagnóstico específico
 */

import { type NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { CONSULTA_RBAC } from "../../../_rbac"
import { AuditAction } from "@/lib/audit/actions"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  diagnosticoId: z.coerce.number().int().positive(),
})

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; diagnosticoId: string }> }
) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, diagnosticoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver historial de auditoría")
    }

    // Verify diagnosis exists and belongs to the consultation
    const diagnostico = await prisma.patientDiagnosis.findUnique({
      where: { idPatientDiagnosis: diagnosticoId },
      select: {
        idPatientDiagnosis: true,
        pacienteId: true,
        consultaId: true,
        label: true,
        status: true,
      },
    })

    if (!diagnostico) {
      return errors.notFound("Diagnóstico no encontrado")
    }

    // Verify consultation exists
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })

    if (!consulta) {
      return errors.notFound("Consulta no encontrada")
    }

    // Verify diagnosis belongs to same patient
    if (diagnostico.pacienteId !== consulta.cita.pacienteId) {
      return errors.forbidden("El diagnóstico no pertenece al paciente de esta consulta")
    }

    // Fetch all audit logs for this diagnosis
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: "PatientDiagnosis",
        entityId: diagnosticoId,
        action: {
          in: [
            AuditAction.DIAGNOSIS_CREATE,
            AuditAction.DIAGNOSIS_UPDATE,
            AuditAction.DIAGNOSIS_STATUS_CHANGE,
            AuditAction.DIAGNOSIS_DELETE,
            AuditAction.DIAGNOSIS_RESOLVE,
            AuditAction.DIAGNOSIS_DISCARD,
          ],
        },
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
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Fetch status history from DiagnosisStatusHistory table
    const statusHistory = await prisma.diagnosisStatusHistory.findMany({
      where: {
        diagnosisId: diagnosticoId,
      },
      include: {
        changedBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
        consulta: {
          select: {
            cita: {
              select: {
                inicio: true,
              },
            },
          },
        },
      },
      orderBy: {
        changedAt: "desc",
      },
    })

    // Format response
    const formattedAuditLogs = auditLogs.map((log) => ({
      id: log.idAuditLog,
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      actor: {
        id: log.actor.idUsuario,
        nombre:
          log.actor.profesional?.persona?.nombres && log.actor.profesional?.persona?.apellidos
            ? `${log.actor.profesional.persona.nombres} ${log.actor.profesional.persona.apellidos}`.trim()
            : log.actor.nombreApellido ?? "Usuario",
        email: log.actor.email,
        role: log.actor.rol.nombreRol as "ADMIN" | "ODONT" | "RECEP",
      },
      metadata: log.metadata as Record<string, unknown> | null,
      ip: log.ip,
    }))

    const formattedStatusHistory = statusHistory.map((entry) => ({
      id: entry.idDiagnosisStatusHistory,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      reason: entry.reason,
      changedAt: entry.changedAt.toISOString(),
      changedBy: {
        id: entry.changedBy.idUsuario,
        nombre:
          entry.changedBy.profesional?.persona?.nombres && entry.changedBy.profesional?.persona?.apellidos
            ? `${entry.changedBy.profesional.persona.nombres} ${entry.changedBy.profesional.persona.apellidos}`.trim()
            : entry.changedBy.nombreApellido ?? "Usuario",
      },
      consultaDate: entry.consulta?.cita.inicio.toISOString() ?? null,
    }))

    return ok({
      diagnosis: {
        id: diagnostico.idPatientDiagnosis,
        label: diagnostico.label,
        status: diagnostico.status,
      },
      auditLogs: formattedAuditLogs,
      statusHistory: formattedStatusHistory,
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/audit]", e)
    return errors.internal(errorMessage ?? "Error al obtener historial de auditoría")
  }
}

