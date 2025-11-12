// src/app/api/agenda/citas/[id]/consulta/odontograma/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createOdontogramSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/odontograma
 * Obtiene el odontograma más reciente de la consulta
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
      return errors.forbidden("Solo ODONT y ADMIN pueden ver odontograma")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const odontograma = await prisma.odontogramSnapshot.findFirst({
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
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
      orderBy: { takenAt: "desc" },
    })

    if (!odontograma) {
      return ok(null)
    }

    return ok({
      id: odontograma.idOdontogramSnapshot,
      takenAt: odontograma.takenAt.toISOString(),
      notes: odontograma.notes,
      createdBy: {
        id: odontograma.createdBy.idUsuario,
        nombre:
          odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
            ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
            : odontograma.createdBy.nombreApellido ?? "Usuario",
      },
      entries: odontograma.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/odontograma]", e)
    return errors.internal(errorMessage ?? "Error al obtener odontograma")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/odontograma
 * Crea un nuevo snapshot de odontograma
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
      return errors.forbidden("Solo ODONT y ADMIN pueden crear odontograma")
    }

    const body = await req.json()
    const input = createOdontogramSchema.parse(body)

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

      const odontograma = await prisma.odontogramSnapshot.create({
        data: {
          pacienteId: nuevaConsulta.cita.pacienteId,
          consultaId: citaId,
          notes: input.notes ?? null,
          createdByUserId: session.user.id,
          entries: {
            create: input.entries.map((e) => ({
              toothNumber: e.toothNumber,
              surface: e.surface ?? null,
              condition: e.condition,
              notes: e.notes ?? null,
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
          entries: {
            orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
          },
        },
      })

      return ok({
        id: odontograma.idOdontogramSnapshot,
        takenAt: odontograma.takenAt.toISOString(),
        notes: odontograma.notes,
        createdBy: {
          id: odontograma.createdBy.idUsuario,
          nombre:
            odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
              ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
              : odontograma.createdBy.nombreApellido ?? "Usuario",
        },
        entries: odontograma.entries.map((e) => ({
          id: e.idOdontogramEntry,
          toothNumber: e.toothNumber,
          surface: e.surface,
          condition: e.condition,
          notes: e.notes,
        })),
      })
    }

    const odontograma = await prisma.odontogramSnapshot.create({
      data: {
        pacienteId: consulta.cita.pacienteId,
        consultaId: citaId,
        notes: input.notes ?? null,
        createdByUserId: session.user.id,
        entries: {
          create: input.entries.map((e) => ({
            toothNumber: e.toothNumber,
            surface: e.surface ?? null,
            condition: e.condition,
            notes: e.notes ?? null,
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
        entries: {
          orderBy: [{ toothNumber: "asc" }, { surface: "asc" }],
        },
      },
    })

    return ok({
      id: odontograma.idOdontogramSnapshot,
      takenAt: odontograma.takenAt.toISOString(),
      notes: odontograma.notes,
      createdBy: {
        id: odontograma.createdBy.idUsuario,
        nombre:
          odontograma.createdBy.profesional?.persona?.nombres && odontograma.createdBy.profesional?.persona?.apellidos
            ? `${odontograma.createdBy.profesional.persona.nombres} ${odontograma.createdBy.profesional.persona.apellidos}`.trim()
            : odontograma.createdBy.nombreApellido ?? "Usuario",
      },
      entries: odontograma.entries.map((e) => ({
        id: e.idOdontogramEntry,
        toothNumber: e.toothNumber,
        surface: e.surface,
        condition: e.condition,
        notes: e.notes,
      })),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/odontograma]", e)
    return errors.internal(errorMessage ?? "Error al crear odontograma")
  }
}

