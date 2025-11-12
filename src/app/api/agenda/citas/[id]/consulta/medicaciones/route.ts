// src/app/api/agenda/citas/[id]/consulta/medicaciones/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createMedicationSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/medicaciones
 * Obtiene todas las medicaciones/indicaciones de la consulta
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
      return errors.forbidden("Solo ODONT y ADMIN pueden ver medicaciones")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const medicaciones = await prisma.patientMedication.findMany({
      where: {
        pacienteId: consulta.cita.pacienteId,
        isActive: true,
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
      orderBy: { startAt: "desc" },
    })

    return ok(
      medicaciones.map((m) => ({
        id: m.idPatientMedication,
        medicationId: m.medicationId,
        label: m.label,
        dose: m.dose,
        freq: m.freq,
        route: m.route,
        startAt: m.startAt?.toISOString() ?? null,
        endAt: m.endAt?.toISOString() ?? null,
        isActive: m.isActive,
        createdBy: {
          id: m.createdBy.idUsuario,
          nombre:
            m.createdBy.profesional?.persona?.nombres && m.createdBy.profesional?.persona?.apellidos
              ? `${m.createdBy.profesional.persona.nombres} ${m.createdBy.profesional.persona.apellidos}`.trim()
              : m.createdBy.nombreApellido ?? "Usuario",
        },
      }))
    )
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/medicaciones]", e)
    return errors.internal(errorMessage ?? "Error al obtener medicaciones")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/medicaciones
 * Crea una nueva medicación/indicación
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear medicaciones")
    }

    const body = await req.json()
    const input = createMedicationSchema.parse(body)

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
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
      await ensureConsulta(citaId, cita.profesionalId, session.user.id)
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

      const medicacion = await prisma.patientMedication.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          medicationId: input.medicationId ?? null,
          label: input.label ?? null,
          dose: input.dose ?? null,
          freq: input.freq ?? null,
          route: input.route ?? null,
          startAt: input.startAt ? new Date(input.startAt) : null,
          endAt: input.endAt ? new Date(input.endAt) : null,
          isActive: true,
          createdByUserId: session.user.id,
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
        id: medicacion.idPatientMedication,
        medicationId: medicacion.medicationId,
        label: medicacion.label,
        dose: medicacion.dose,
        freq: medicacion.freq,
        route: medicacion.route,
        startAt: medicacion.startAt?.toISOString() ?? null,
        endAt: medicacion.endAt?.toISOString() ?? null,
        isActive: medicacion.isActive,
        createdBy: {
          id: medicacion.createdBy.idUsuario,
          nombre:
            medicacion.createdBy.profesional?.persona?.nombres && medicacion.createdBy.profesional?.persona?.apellidos
              ? `${medicacion.createdBy.profesional.persona.nombres} ${medicacion.createdBy.profesional.persona.apellidos}`.trim()
              : medicacion.createdBy.nombreApellido ?? "Usuario",
        },
      })
    }

    const medicacion = await prisma.patientMedication.create({
      data: {
        pacienteId: consulta.cita.pacienteId,
        medicationId: input.medicationId ?? null,
        label: input.label ?? null,
        dose: input.dose ?? null,
        freq: input.freq ?? null,
        route: input.route ?? null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt ? new Date(input.endAt) : null,
        isActive: true,
        createdByUserId: session.user.id,
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
      id: medicacion.idPatientMedication,
      medicationId: medicacion.medicationId,
      label: medicacion.label,
      dose: medicacion.dose,
      freq: medicacion.freq,
      route: medicacion.route,
      startAt: medicacion.startAt?.toISOString() ?? null,
      endAt: medicacion.endAt?.toISOString() ?? null,
      isActive: medicacion.isActive,
      createdBy: {
        id: medicacion.createdBy.idUsuario,
        nombre:
          medicacion.createdBy.profesional?.persona?.nombres && medicacion.createdBy.profesional?.persona?.apellidos
            ? `${medicacion.createdBy.profesional.persona.nombres} ${medicacion.createdBy.profesional.persona.apellidos}`.trim()
            : medicacion.createdBy.nombreApellido ?? "Usuario",
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/medicaciones]", e)
    return errors.internal(errorMessage ?? "Error al crear medicación")
  }
}

