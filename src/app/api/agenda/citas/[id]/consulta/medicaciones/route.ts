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
        updatedBy: {
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
        discontinuedBy: {
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
        medicationCatalog: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: { startAt: "desc" },
    })

    return ok(
      medicaciones.map((m) => ({
        id: m.idPatientMedication,
        medicationId: m.medicationId,
        // Usar label si existe, si no, usar nombre del catálogo, o "Medicación desconocida"
        label: m.label ?? m.medicationCatalog?.name ?? "Medicación desconocida",
        description: m.description,
        dose: m.dose,
        freq: m.freq,
        route: m.route,
        startAt: m.startAt?.toISOString() ?? null,
        endAt: m.endAt?.toISOString() ?? null,
        isActive: m.isActive,
        updatedAt: m.updatedAt?.toISOString() ?? null,
        discontinuedAt: m.discontinuedAt?.toISOString() ?? null,
        consultaId: m.consultaId,
        createdBy: {
          id: m.createdBy.idUsuario,
          nombre:
            m.createdBy.profesional?.persona?.nombres && m.createdBy.profesional?.persona?.apellidos
              ? `${m.createdBy.profesional.persona.nombres} ${m.createdBy.profesional.persona.apellidos}`.trim()
              : m.createdBy.nombreApellido ?? "Usuario",
        },
        updatedBy: m.updatedBy
          ? {
              id: m.updatedBy.idUsuario,
              nombre:
                m.updatedBy.profesional?.persona?.nombres && m.updatedBy.profesional?.persona?.apellidos
                  ? `${m.updatedBy.profesional.persona.nombres} ${m.updatedBy.profesional.persona.apellidos}`.trim()
                  : m.updatedBy.nombreApellido ?? "Usuario",
            }
          : null,
        discontinuedBy: m.discontinuedBy
          ? {
              id: m.discontinuedBy.idUsuario,
              nombre:
                m.discontinuedBy.profesional?.persona?.nombres && m.discontinuedBy.profesional?.persona?.apellidos
                  ? `${m.discontinuedBy.profesional.persona.nombres} ${m.discontinuedBy.profesional.persona.apellidos}`.trim()
                  : m.discontinuedBy.nombreApellido ?? "Usuario",
            }
          : null,
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
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

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

      const medicacion = await prisma.patientMedication.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          medicationId: input.medicationId ?? null,
          label: input.label ?? null,
          description: input.description ?? null,
          dose: input.dose ?? null,
          freq: input.freq ?? null,
          route: input.route ?? null,
          startAt: input.startAt ? new Date(input.startAt) : null,
          endAt: input.endAt ? new Date(input.endAt) : null,
          isActive: true,
          createdByUserId: userId,
          consultaId: citaId,
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
          medicationCatalog: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      })

      return ok({
        id: medicacion.idPatientMedication,
        medicationId: medicacion.medicationId,
        // Usar label si existe, si no, usar nombre del catálogo, o "Medicación desconocida"
        label: medicacion.label ?? medicacion.medicationCatalog?.name ?? "Medicación desconocida",
        description: medicacion.description,
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
        description: input.description ?? null,
        dose: input.dose ?? null,
        freq: input.freq ?? null,
        route: input.route ?? null,
        startAt: input.startAt ? new Date(input.startAt) : null,
        endAt: input.endAt ? new Date(input.endAt) : null,
        isActive: true,
        createdByUserId: userId,
        consultaId: citaId,
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
        medicationCatalog: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    })

    return ok({
      id: medicacion.idPatientMedication,
      medicationId: medicacion.medicationId,
      // Usar label si existe, si no, usar nombre del catálogo, o "Medicación desconocida"
      label: medicacion.label ?? medicacion.medicationCatalog?.name ?? "Medicación desconocida",
      description: medicacion.description,
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
      const zodError = e as { errors?: Array<{ message?: string; path?: (string | number)[] }> }
      // Collect all validation errors
      const errorMessages = zodError.errors?.map((err) => {
        const field = err.path?.[0] ? `${err.path[0]}: ` : ""
        return `${field}${err.message ?? "Dato inválido"}`
      }) ?? []
      
      // Return the first error message, or a generic one
      const errorMessage = errorMessages.length > 0 
        ? errorMessages[0] 
        : "Datos inválidos"
      
      return errors.validation(errorMessage)
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/medicaciones]", e)
    return errors.internal(errorMessage ?? "Error al crear medicación")
  }
}

