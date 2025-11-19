// src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/history/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../../_rbac"
import { prisma } from "@/lib/prisma"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  diagnosticoId: z.coerce.number().int().positive(),
})

/**
 * GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/history
 * Returns full history of a diagnosis across all encounters
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; diagnosticoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, diagnosticoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver historial de diagnósticos")
    }

    // Verify diagnosis exists and get patient info
    const diagnostico = await prisma.patientDiagnosis.findUnique({
      where: { idPatientDiagnosis: diagnosticoId },
      select: {
        idPatientDiagnosis: true,
        pacienteId: true,
        label: true,
        code: true,
        status: true,
        notedAt: true,
        resolvedAt: true,
        notes: true,
      },
    })
    if (!diagnostico) return errors.notFound("Diagnóstico no encontrado")

    // Verify consulta exists and belongs to same patient
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
    if (!consulta) return errors.notFound("Consulta no encontrada")

    if (diagnostico.pacienteId !== consulta.cita.pacienteId) {
      return errors.forbidden("El diagnóstico no pertenece al paciente de esta consulta")
    }

    // Fetch status history
    const statusHistory = await prisma.diagnosisStatusHistory.findMany({
      where: { diagnosisId: diagnosticoId },
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
            citaId: true,
            cita: {
              select: {
                inicio: true,
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
        },
      },
      orderBy: { changedAt: "desc" },
    })

    // Fetch encounter diagnoses (all encounters where this diagnosis was evaluated)
    const encounterDiagnoses = await prisma.encounterDiagnosis.findMany({
      where: { diagnosisId: diagnosticoId },
      include: {
        consulta: {
          select: {
            citaId: true,
            cita: {
              select: {
                inicio: true,
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
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Fetch linked procedures
    const linkedProcedures = await prisma.consultaProcedimiento.findMany({
      where: { diagnosisId: diagnosticoId },
      include: {
        consulta: {
          select: {
            citaId: true,
            cita: {
              select: {
                inicio: true,
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
        },
        catalogo: {
          select: {
            code: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return ok({
      diagnosis: {
        id: diagnostico.idPatientDiagnosis,
        label: diagnostico.label,
        code: diagnostico.code,
        status: diagnostico.status,
        notedAt: diagnostico.notedAt.toISOString(),
        resolvedAt: diagnostico.resolvedAt?.toISOString() ?? null,
        notes: diagnostico.notes,
      },
      statusHistory: statusHistory.map((h) => ({
        id: h.idDiagnosisStatusHistory,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        changedAt: h.changedAt.toISOString(),
        changedBy: {
          id: h.changedBy.idUsuario,
          nombre:
            h.changedBy.profesional?.persona?.nombres && h.changedBy.profesional?.persona?.apellidos
              ? `${h.changedBy.profesional.persona.nombres} ${h.changedBy.profesional.persona.apellidos}`.trim()
              : h.changedBy.nombreApellido ?? "Usuario",
        },
        encounter: h.consulta
          ? {
              citaId: h.consulta.citaId,
              fecha: h.consulta.cita.inicio.toISOString(),
              profesional: h.consulta.cita.profesional.persona
                ? `${h.consulta.cita.profesional.persona.nombres} ${h.consulta.cita.profesional.persona.apellidos}`.trim()
                : null,
            }
          : null,
      })),
      encounters: encounterDiagnoses.map((ed) => ({
        citaId: ed.consulta.citaId,
        fecha: ed.consulta.cita.inicio.toISOString(),
        profesional: ed.consulta.cita.profesional.persona
          ? `${ed.consulta.cita.profesional.persona.nombres} ${ed.consulta.cita.profesional.persona.apellidos}`.trim()
          : null,
        encounterNotes: ed.encounterNotes,
        wasEvaluated: ed.wasEvaluated,
        wasManaged: ed.wasManaged,
        createdAt: ed.createdAt.toISOString(),
      })),
      linkedProcedures: linkedProcedures.map((p) => ({
        id: p.idConsultaProcedimiento,
        citaId: p.consultaId,
        fecha: p.consulta.cita.inicio.toISOString(),
        profesional: p.consulta.cita.profesional.persona
          ? `${p.consulta.cita.profesional.persona.nombres} ${p.consulta.cita.profesional.persona.apellidos}`.trim()
          : null,
        procedure: p.catalogo
          ? `${p.catalogo.code} - ${p.catalogo.nombre}`
          : p.serviceType ?? "Procedimiento sin especificar",
        toothNumber: p.toothNumber,
        toothSurface: p.toothSurface,
        quantity: p.quantity,
        resultNotes: p.resultNotes,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/history]", e)
    return errors.internal(errorMessage ?? "Error al obtener historial del diagnóstico")
  }
}

