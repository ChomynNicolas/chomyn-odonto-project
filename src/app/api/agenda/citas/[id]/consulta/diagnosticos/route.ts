// src/app/api/agenda/citas/[id]/consulta/diagnosticos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createDiagnosisSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

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
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const diagnosticos = await prisma.patientDiagnosis.findMany({
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
      },
      orderBy: { notedAt: "desc" },
    })

    return ok(
      diagnosticos.map((d) => ({
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
      }))
    )
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

