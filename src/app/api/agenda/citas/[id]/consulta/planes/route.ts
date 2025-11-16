// src/app/api/agenda/citas/[id]/consulta/planes/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import type { PlanTratamientoDTO } from "../_dto"
import type { Prisma } from "@prisma/client"

const userMiniSelect = {
  idUsuario: true,
  usuario: true,
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
} as const

type UserMini = Prisma.UsuarioGetPayload<{ select: typeof userMiniSelect }>

function displayUser(user: UserMini | null | undefined): string {
  if (!user) return "Usuario"
  const p = user.profesional?.persona
  if (p?.nombres || p?.apellidos) {
    return `${p?.nombres ?? ""} ${p?.apellidos ?? ""}`.trim() || (user.nombreApellido ?? user.usuario ?? "Usuario")
  }
  return (user.nombreApellido?.trim() || user.usuario || "Usuario")
}

/**
 * GET /api/agenda/citas/[id]/consulta/planes
 * Obtiene el plan de tratamiento activo del paciente asociado a la cita
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Solo ADMIN y ODONT pueden ver planes de tratamiento
    if (!CONSULTA_RBAC.canViewTreatmentPlan(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver planes de tratamiento")
    }

    // Verificar que la cita existe y obtener el paciente
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      include: {
        paciente: {
          select: {
            idPaciente: true,
          },
        },
      },
    })
    if (!cita) return errors.notFound("Cita no encontrada")

    // Obtener plan de tratamiento activo del paciente
    const planTratamiento = await prisma.treatmentPlan.findFirst({
      where: {
        pacienteId: cita.pacienteId,
        isActive: true,
      },
      include: {
        creadoPor: {
          select: userMiniSelect,
        },
        steps: {
          include: {
            procedimientoCatalogo: {
              select: {
                idProcedimiento: true,
                code: true,
                nombre: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!planTratamiento) {
      return ok(null)
    }

    const dto: PlanTratamientoDTO = {
      id: planTratamiento.idTreatmentPlan,
      titulo: planTratamiento.titulo,
      descripcion: planTratamiento.descripcion,
      isActive: planTratamiento.isActive,
      createdAt: planTratamiento.createdAt.toISOString(),
      updatedAt: planTratamiento.updatedAt.toISOString(),
      createdBy: {
        id: planTratamiento.creadoPor.idUsuario,
        nombre: displayUser(planTratamiento.creadoPor),
      },
      steps: planTratamiento.steps.map((step) => ({
        id: step.idTreatmentStep,
        order: step.order,
        procedureId: step.procedureId,
        procedimientoCatalogo: step.procedimientoCatalogo
          ? {
              id: step.procedimientoCatalogo.idProcedimiento,
              code: step.procedimientoCatalogo.code,
              nombre: step.procedimientoCatalogo.nombre,
            }
          : null,
        serviceType: step.serviceType,
        toothNumber: step.toothNumber,
        toothSurface: step.toothSurface,
        estimatedDurationMin: step.estimatedDurationMin,
        estimatedCostCents: step.estimatedCostCents,
        priority: step.priority,
        status: step.status,
        notes: step.notes,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      })),
    }

    return ok(dto)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/planes]", e)
    return errors.internal(errorMessage ?? "Error al obtener plan de tratamiento")
  }
}

