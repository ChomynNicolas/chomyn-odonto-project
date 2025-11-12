// src/app/api/agenda/citas/[id]/consulta/vitales/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createVitalesSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"

/**
 * GET /api/agenda/citas/[id]/consulta/vitales
 * Obtiene los signos vitales de la consulta (o del paciente si no hay en consulta)
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
      return errors.forbidden("Solo ODONT y ADMIN pueden ver signos vitales")
    }

    // Verificar que la consulta existe
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
      return ok([])
    }

    // Obtener vitales de la consulta
    const vitalesConsulta = await prisma.patientVitals.findMany({
      where: {
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
      },
      orderBy: { measuredAt: "desc" },
    })

    // Si hay vitales en la consulta, retornarlos
    if (vitalesConsulta.length > 0) {
      return ok(
        vitalesConsulta.map((v) => ({
          id: v.idPatientVitals,
          measuredAt: v.measuredAt.toISOString(),
          heightCm: v.heightCm,
          weightKg: v.weightKg,
          bmi: v.bmi,
          bpSyst: v.bpSyst,
          bpDiast: v.bpDiast,
          heartRate: v.heartRate,
          notes: v.notes,
          createdBy: {
            id: v.createdBy.idUsuario,
            nombre:
              v.createdBy.profesional?.persona?.nombres && v.createdBy.profesional?.persona?.apellidos
                ? `${v.createdBy.profesional.persona.nombres} ${v.createdBy.profesional.persona.apellidos}`.trim()
                : v.createdBy.nombreApellido ?? "Usuario",
          },
        }))
      )
    }

    // Si no hay vitales en la consulta, obtener el último del paciente
    const pacienteVitals = await prisma.patientVitals.findFirst({
      where: {
        pacienteId: consulta.cita.pacienteId,
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
      orderBy: { measuredAt: "desc" },
    })

    if (pacienteVitals) {
      return ok([
        {
          id: pacienteVitals.idPatientVitals,
          measuredAt: pacienteVitals.measuredAt.toISOString(),
          heightCm: pacienteVitals.heightCm,
          weightKg: pacienteVitals.weightKg,
          bmi: pacienteVitals.bmi,
          bpSyst: pacienteVitals.bpSyst,
          bpDiast: pacienteVitals.bpDiast,
          heartRate: pacienteVitals.heartRate,
          notes: pacienteVitals.notes,
          createdBy: {
            id: pacienteVitals.createdBy.idUsuario,
            nombre:
              pacienteVitals.createdBy.profesional?.persona?.nombres &&
              pacienteVitals.createdBy.profesional?.persona?.apellidos
                ? `${pacienteVitals.createdBy.profesional.persona.nombres} ${pacienteVitals.createdBy.profesional.persona.apellidos}`.trim()
                : pacienteVitals.createdBy.nombreApellido ?? "Usuario",
          },
        },
      ])
    }

    return ok([])
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/vitales]", e)
    return errors.internal(errorMessage ?? "Error al obtener signos vitales")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/vitales
 * Crea nuevos signos vitales vinculados a la consulta
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
      return errors.forbidden("Solo ODONT y ADMIN pueden crear signos vitales")
    }

    const body = await req.json()
    const input = createVitalesSchema.parse(body)

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        citaId: true,
        status: true,
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

      await ensureConsulta(citaId, cita.profesionalId, userId)

      // Verificar que la consulta recién creada permite edición
      const consultaCreada = await prisma.consulta.findUnique({
        where: { citaId },
        select: { status: true },
      })
      if (consultaCreada && consultaCreada.status === "FINAL") {
        return errors.forbidden("No se puede editar una consulta finalizada")
      }
    } else {
      // Si la consulta existe, verificar que permite edición
      if (consulta.status === "FINAL") {
        return errors.forbidden("No se puede editar una consulta finalizada")
      }
    }

    // Obtener pacienteId de la consulta o cita
    const consultaFinal = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })

    if (!consultaFinal) {
      return errors.notFound("Consulta no encontrada")
    }

    // Calcular BMI si hay altura y peso
    let bmi: number | null = null
    if (input.heightCm && input.weightKg) {
      const heightM = input.heightCm / 100
      bmi = Number(((input.weightKg ?? 0) / (heightM * heightM)).toFixed(1))
    }

    // Crear vitales
    const vitales = await prisma.patientVitals.create({
      data: {
        pacienteId: consultaFinal.cita.pacienteId,
        consultaId: citaId,
        heightCm: input.heightCm ?? null,
        weightKg: input.weightKg ?? null,
        bmi,
        bpSyst: input.bpSyst ?? null,
        bpDiast: input.bpDiast ?? null,
        heartRate: input.heartRate ?? null,
        notes: input.notes ?? null,
        measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
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
      id: vitales.idPatientVitals,
      measuredAt: vitales.measuredAt.toISOString(),
      heightCm: vitales.heightCm,
      weightKg: vitales.weightKg,
      bmi: vitales.bmi,
      bpSyst: vitales.bpSyst,
      bpDiast: vitales.bpDiast,
      heartRate: vitales.heartRate,
      notes: vitales.notes,
      createdBy: {
        id: vitales.createdBy.idUsuario,
        nombre:
          vitales.createdBy.profesional?.persona?.nombres && vitales.createdBy.profesional?.persona?.apellidos
            ? `${vitales.createdBy.profesional.persona.nombres} ${vitales.createdBy.profesional.persona.apellidos}`.trim()
            : vitales.createdBy.nombreApellido ?? "Usuario",
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/vitales]", e)
    return errors.internal(errorMessage ?? "Error al crear signos vitales")
  }
}

