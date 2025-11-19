// src/app/api/agenda/citas/[id]/consulta/diagnosticos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createDiagnosisSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"
import { DiagnosisStatus } from "@prisma/client"
import { auditDiagnosisCreate } from "@/lib/audit/diagnosis"

/**
 * GET /api/agenda/citas/[id]/consulta/diagnosticos
 * Obtiene todos los diagnósticos de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver diagnósticos")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        citaId: true,
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const pacienteId = consulta.cita.pacienteId

    // Fetch diagnoses created in this encounter
    const diagnosticosCurrentEncounter = await prisma.patientDiagnosis.findMany({
      where: { consultaId: citaId },
      include: {
        createdBy: {
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
        encounterDiagnoses: {
          where: { consultaId: citaId },
          select: {
            encounterNotes: true,
            wasEvaluated: true,
            wasManaged: true,
          },
        },
        consultaProcedimientos: {
          where: { consultaId: citaId },
          select: {
            idConsultaProcedimiento: true,
          },
        },
      },
      orderBy: { notedAt: "desc" },
    })

    // Fetch ALL active/under_follow_up diagnoses for patient (from previous encounters)
    const diagnosticosPreviousEncounters = await prisma.patientDiagnosis.findMany({
      where: {
        pacienteId,
        status: {
          in: [DiagnosisStatus.ACTIVE, DiagnosisStatus.UNDER_FOLLOW_UP],
        },
        // Exclude diagnoses already in current encounter
        NOT: {
          consultaId: citaId,
        },
      },
      include: {
        createdBy: {
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
        encounterDiagnoses: {
          where: { consultaId: citaId },
          select: {
            encounterNotes: true,
            wasEvaluated: true,
            wasManaged: true,
          },
        },
        consultaProcedimientos: {
          where: { consultaId: citaId },
          select: {
            idConsultaProcedimiento: true,
          },
        },
      },
      orderBy: { notedAt: "desc" },
    })

    // Helper function to format diagnosis
    const formatDiagnosis = (
      d: typeof diagnosticosCurrentEncounter[0] | typeof diagnosticosPreviousEncounters[0],
      source: 'current_encounter' | 'previous_encounter'
    ) => {
      const encounterDiagnosis = d.encounterDiagnoses[0]
      return {
        id: d.idPatientDiagnosis,
        diagnosisId: d.diagnosisId,
        code: d.code,
        label: d.label,
        status: d.status,
        notedAt: d.notedAt.toISOString(),
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        notes: d.notes,
        createdBy: {
          id: d.createdBy.idUsuario,
          nombre:
            d.createdBy.profesional?.persona?.nombres && d.createdBy.profesional?.persona?.apellidos
              ? `${d.createdBy.profesional.persona.nombres} ${d.createdBy.profesional.persona.apellidos}`.trim()
              : d.createdBy.nombreApellido ?? "Usuario",
        },
        source,
        encounterNotes: encounterDiagnosis?.encounterNotes ?? null,
        wasEvaluated: encounterDiagnosis?.wasEvaluated ?? false,
        wasManaged: encounterDiagnosis?.wasManaged ?? false,
        linkedProceduresCount: d.consultaProcedimientos.length,
      }
    }

    // Map current encounter diagnoses
    const currentDiagnoses = diagnosticosCurrentEncounter.map((d) =>
      formatDiagnosis(d, 'current_encounter')
    )

    // Map previous encounter diagnoses
    const previousDiagnoses = diagnosticosPreviousEncounters.map((d) =>
      formatDiagnosis(d, 'previous_encounter')
    )

    // Merge and return (current first, then previous)
    return ok([...currentDiagnoses, ...previousDiagnoses])
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/diagnosticos]", e)
    return errors.internal(errorMessage ?? "Error al obtener diagnósticos")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/diagnosticos
 * Crea un nuevo diagnóstico
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const userId = Number.parseInt(String(session.user.id))
    if (isNaN(userId)) return errors.forbidden("ID de usuario inválido")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear diagnósticos")
    }

    const body = await req.json()
    const input = createDiagnosisSchema.parse(body)

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        citaId: true,
        status: true, // Necesario para verificar si permite edición
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, userId)
      const nuevaConsulta = await prisma.consulta.findUnique({
        where: { citaId },
        include: {
          cita: {
            select: {
              pacienteId: true,
            },
          },
        },
      })
      if (!nuevaConsulta) return errors.internal("Error al crear consulta")
      
      // Verificar que la consulta recién creada permite edición
      if (nuevaConsulta.status === "FINAL") {
        return errors.forbidden("No se puede editar una consulta finalizada")
      }

      const diagnostico = await prisma.patientDiagnosis.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          diagnosisId: input.diagnosisId ?? null,
          code: input.code ?? null,
          label: input.label,
          status: input.status,
          notes: input.notes ?? null,
          createdByUserId: userId,
          resolvedAt: input.status === DiagnosisStatus.RESOLVED ? new Date() : null,
        },
        include: {
          createdBy: {
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
        },
      })

      // Create EncounterDiagnosis record
      await prisma.encounterDiagnosis.create({
        data: {
          consultaId: citaId,
          diagnosisId: diagnostico.idPatientDiagnosis,
          wasEvaluated: true,
          wasManaged: true,
        },
      })

      // Create initial DiagnosisStatusHistory entry
      await prisma.diagnosisStatusHistory.create({
        data: {
          diagnosisId: diagnostico.idPatientDiagnosis,
          consultaId: citaId,
          previousStatus: null,
          newStatus: input.status,
          changedByUserId: userId,
        },
      })

      // Audit: Log diagnosis creation
      await auditDiagnosisCreate({
        actorId: userId,
        diagnosisId: diagnostico.idPatientDiagnosis,
        pacienteId: nuevaConsulta.cita.pacienteId,
        consultaId: citaId,
        diagnosisCatalogId: input.diagnosisId ?? null,
        code: input.code ?? null,
        label: input.label,
        status: input.status,
        notes: input.notes ?? null,
        headers: req.headers,
        path: `/api/agenda/citas/${citaId}/consulta/diagnosticos`,
      })

      return ok({
        id: diagnostico.idPatientDiagnosis,
        diagnosisId: diagnostico.diagnosisId,
        code: diagnostico.code,
        label: diagnostico.label,
        status: diagnostico.status,
        notedAt: diagnostico.notedAt.toISOString(),
        resolvedAt: diagnostico.resolvedAt?.toISOString() ?? null,
        notes: diagnostico.notes,
        createdBy: {
          id: diagnostico.createdBy.idUsuario,
          nombre:
            diagnostico.createdBy.profesional?.persona?.nombres && diagnostico.createdBy.profesional?.persona?.apellidos
              ? `${diagnostico.createdBy.profesional.persona.nombres} ${diagnostico.createdBy.profesional.persona.apellidos}`.trim()
              : diagnostico.createdBy.nombreApellido ?? "Usuario",
        },
        source: 'current_encounter' as const,
        encounterNotes: null,
        wasEvaluated: true,
        wasManaged: true,
        linkedProceduresCount: 0,
      })
    }

    // Verificar que la consulta permite edición
    if (consulta.status === "FINAL") {
      return errors.forbidden("No se puede editar una consulta finalizada")
    }
    
    const diagnostico = await prisma.patientDiagnosis.create({
      data: {
        pacienteId: consulta.cita.pacienteId,
        consultaId: citaId,
        diagnosisId: input.diagnosisId ?? null,
        code: input.code ?? null,
        label: input.label,
        status: input.status,
        notes: input.notes ?? null,
        createdByUserId: userId,
        resolvedAt: input.status === DiagnosisStatus.RESOLVED ? new Date() : null,
      },
      include: {
        createdBy: {
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
      },
    })

    // Create EncounterDiagnosis record
    await prisma.encounterDiagnosis.create({
      data: {
        consultaId: citaId,
        diagnosisId: diagnostico.idPatientDiagnosis,
        wasEvaluated: true,
        wasManaged: true,
      },
    })

    // Create initial DiagnosisStatusHistory entry
    await prisma.diagnosisStatusHistory.create({
      data: {
        diagnosisId: diagnostico.idPatientDiagnosis,
        consultaId: citaId,
        previousStatus: null,
        newStatus: input.status,
        changedByUserId: userId,
      },
    })

    // Audit: Log diagnosis creation
    await auditDiagnosisCreate({
      actorId: userId,
      diagnosisId: diagnostico.idPatientDiagnosis,
      pacienteId: consulta.cita.pacienteId,
      consultaId: citaId,
      diagnosisCatalogId: input.diagnosisId ?? null,
      code: input.code ?? null,
      label: input.label,
      status: input.status,
      notes: input.notes ?? null,
      headers: req.headers,
      path: `/api/agenda/citas/${citaId}/consulta/diagnosticos`,
    })

    return ok({
      id: diagnostico.idPatientDiagnosis,
      diagnosisId: diagnostico.diagnosisId,
      code: diagnostico.code,
      label: diagnostico.label,
      status: diagnostico.status,
      notedAt: diagnostico.notedAt.toISOString(),
      resolvedAt: diagnostico.resolvedAt?.toISOString() ?? null,
      notes: diagnostico.notes,
      createdBy: {
        id: diagnostico.createdBy.idUsuario,
        nombre:
          diagnostico.createdBy.profesional?.persona?.nombres && diagnostico.createdBy.profesional?.persona?.apellidos
            ? `${diagnostico.createdBy.profesional.persona.nombres} ${diagnostico.createdBy.profesional.persona.apellidos}`.trim()
            : diagnostico.createdBy.nombreApellido ?? "Usuario",
      },
      source: 'current_encounter' as const,
      encounterNotes: null,
      wasEvaluated: true,
      wasManaged: true,
      linkedProceduresCount: 0,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }>; input?: unknown }
      const errorMessage = zodError.errors?.[0]?.message ?? "Datos inválidos"
      console.error("[POST /api/agenda/citas/[id]/consulta/diagnosticos] Validation error:", {
        error: errorMessage,
        errors: zodError.errors,
        input: zodError.input,
      })
      return errors.validation(errorMessage)
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/diagnosticos]", e)
    return errors.internal(errorMessage ?? "Error al crear diagnóstico")
  }
}

