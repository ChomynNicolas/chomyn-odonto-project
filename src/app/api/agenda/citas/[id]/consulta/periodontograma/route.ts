// src/app/api/agenda/citas/[id]/consulta/periodontograma/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createPeriodontogramSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/periodontograma
 * Obtiene el periodontograma más reciente de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewOdontogram(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver periodontograma")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const periodontograma = await prisma.periodontogramSnapshot.findFirst({
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
        measures: {
          orderBy: [{ toothNumber: "asc" }, { site: "asc" }],
        },
      },
      orderBy: { takenAt: "desc" },
    })

    if (!periodontograma) {
      return ok(null)
    }

    return ok({
      id: periodontograma.idPeriodontogramSnapshot,
      takenAt: periodontograma.takenAt.toISOString(),
      notes: periodontograma.notes,
      createdBy: {
        id: periodontograma.createdBy.idUsuario,
        nombre:
          periodontograma.createdBy.profesional?.persona?.nombres && periodontograma.createdBy.profesional?.persona?.apellidos
            ? `${periodontograma.createdBy.profesional.persona.nombres} ${periodontograma.createdBy.profesional.persona.apellidos}`.trim()
            : periodontograma.createdBy.nombreApellido ?? "Usuario",
      },
      measures: periodontograma.measures.map((m) => ({
        id: m.idPeriodontogramMeasure,
        toothNumber: m.toothNumber,
        site: m.site,
        probingDepthMm: m.probingDepthMm,
        bleeding: m.bleeding,
        plaque: m.plaque,
        mobility: m.mobility,
        furcation: m.furcation,
      })),
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/periodontograma]", e)
    return errors.internal(errorMessage ?? "Error al obtener periodontograma")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/periodontograma
 * Crea un nuevo snapshot de periodontograma
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditOdontogram(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear periodontograma")
    }

    const body = await req.json()
    const input = createPeriodontogramSchema.parse(body)

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

      const periodontograma = await prisma.periodontogramSnapshot.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          notes: input.notes ?? null,
          createdByUserId: session.user.id,
          measures: {
            create: input.measures.map((m) => ({
              toothNumber: m.toothNumber,
              site: m.site,
              probingDepthMm: m.probingDepthMm ?? null,
              bleeding: m.bleeding ?? null,
              plaque: m.plaque ?? null,
              mobility: m.mobility ?? null,
              furcation: m.furcation ?? null,
            })),
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
          measures: {
            orderBy: [{ toothNumber: "asc" }, { site: "asc" }],
          },
        },
      })

      return ok({
        id: periodontograma.idPeriodontogramSnapshot,
        takenAt: periodontograma.takenAt.toISOString(),
        notes: periodontograma.notes,
        createdBy: {
          id: periodontograma.createdBy.idUsuario,
          nombre:
            periodontograma.createdBy.profesional?.persona?.nombres && periodontograma.createdBy.profesional?.persona?.apellidos
              ? `${periodontograma.createdBy.profesional.persona.nombres} ${periodontograma.createdBy.profesional.persona.apellidos}`.trim()
              : periodontograma.createdBy.nombreApellido ?? "Usuario",
        },
        measures: periodontograma.measures.map((m) => ({
          id: m.idPeriodontogramMeasure,
          toothNumber: m.toothNumber,
          site: m.site,
          probingDepthMm: m.probingDepthMm,
          bleeding: m.bleeding,
          plaque: m.plaque,
          mobility: m.mobility,
          furcation: m.furcation,
        })),
      })
    }

    const periodontograma = await prisma.periodontogramSnapshot.create({
      data: {
        pacienteId: consulta.cita.pacienteId,
        consultaId: citaId,
        notes: input.notes ?? null,
        createdByUserId: session.user.id,
        measures: {
          create: input.measures.map((m) => ({
            toothNumber: m.toothNumber,
            site: m.site,
            probingDepthMm: m.probingDepthMm ?? null,
            bleeding: m.bleeding ?? null,
            plaque: m.plaque ?? null,
            mobility: m.mobility ?? null,
            furcation: m.furcation ?? null,
          })),
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
        measures: {
          orderBy: [{ toothNumber: "asc" }, { site: "asc" }],
        },
      },
    })

    return ok({
      id: periodontograma.idPeriodontogramSnapshot,
      takenAt: periodontograma.takenAt.toISOString(),
      notes: periodontograma.notes,
      createdBy: {
        id: periodontograma.createdBy.idUsuario,
        nombre:
          periodontograma.createdBy.profesional?.persona?.nombres && periodontograma.createdBy.profesional?.persona?.apellidos
            ? `${periodontograma.createdBy.profesional.persona.nombres} ${periodontograma.createdBy.profesional.persona.apellidos}`.trim()
            : periodontograma.createdBy.nombreApellido ?? "Usuario",
      },
      measures: periodontograma.measures.map((m) => ({
        id: m.idPeriodontogramMeasure,
        toothNumber: m.toothNumber,
        site: m.site,
        probingDepthMm: m.probingDepthMm,
        bleeding: m.bleeding,
        plaque: m.plaque,
        mobility: m.mobility,
        furcation: m.furcation,
      })),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/periodontograma]", e)
    return errors.internal(errorMessage ?? "Error al crear periodontograma")
  }
}

