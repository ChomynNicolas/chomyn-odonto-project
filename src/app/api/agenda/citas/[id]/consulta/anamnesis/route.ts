// src/app/api/agenda/citas/[id]/consulta/anamnesis/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createAnamnesisSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/anamnesis
 * Obtiene todas las anamnesis/notas clínicas de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver anamnesis")
    }

    // Verificar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const anamnesis = await prisma.clinicalHistoryEntry.findMany({
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
      orderBy: { fecha: "desc" },
    })

    return ok(
      anamnesis.map((a) => ({
        id: a.idClinicalHistoryEntry,
        title: a.title,
        notes: a.notes,
        fecha: a.fecha.toISOString(),
        createdBy: {
          id: a.createdBy.idUsuario,
          nombre:
            a.createdBy.profesional?.persona?.nombres && a.createdBy.profesional?.persona?.apellidos
              ? `${a.createdBy.profesional.persona.nombres} ${a.createdBy.profesional.persona.apellidos}`.trim()
              : a.createdBy.nombreApellido ?? "Usuario",
        },
        createdAt: a.createdAt.toISOString(),
      }))
    )
  } catch (e: any) {
    console.error("[GET /api/agenda/citas/[id]/consulta/anamnesis]", e)
    return errors.internal(e?.message ?? "Error al obtener anamnesis")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/anamnesis
 * Crea una nueva anamnesis/nota clínica
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear anamnesis")
    }

    const body = await req.json()
    const input = createAnamnesisSchema.parse(body)

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
      // Crear consulta si no existe
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, session.user.id)
    }

    const anamnesis = await prisma.clinicalHistoryEntry.create({
      data: {
        pacienteId: consulta?.cita.pacienteId ?? (await prisma.cita.findUnique({ where: { idCita: citaId }, select: { pacienteId: true } }))!.pacienteId,
        consultaId: citaId,
        title: input.title,
        notes: input.notes,
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
      id: anamnesis.idClinicalHistoryEntry,
      title: anamnesis.title,
      notes: anamnesis.notes,
      fecha: anamnesis.fecha.toISOString(),
      createdBy: {
        id: anamnesis.createdBy.idUsuario,
        nombre:
          anamnesis.createdBy.profesional?.persona?.nombres && anamnesis.createdBy.profesional?.persona?.apellidos
            ? `${anamnesis.createdBy.profesional.persona.nombres} ${anamnesis.createdBy.profesional.persona.apellidos}`.trim()
            : anamnesis.createdBy.nombreApellido ?? "Usuario",
      },
      createdAt: anamnesis.createdAt.toISOString(),
    })
  } catch (e: any) {
    if (e.name === "ZodError") return errors.validation(e.errors[0]?.message ?? "Datos inválidos")
    console.error("[POST /api/agenda/citas/[id]/consulta/anamnesis]", e)
    return errors.internal(e?.message ?? "Error al crear anamnesis")
  }
}

