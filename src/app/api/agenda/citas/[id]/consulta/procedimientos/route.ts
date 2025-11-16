// src/app/api/agenda/citas/[id]/consulta/procedimientos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createProcedureSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"
import { TreatmentStepStatus } from "@prisma/client"

/**
 * GET /api/agenda/citas/[id]/consulta/procedimientos
 * Obtiene todos los procedimientos de la consulta
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
      return errors.forbidden("Solo ODONT y ADMIN pueden ver procedimientos")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const procedimientos = await prisma.consultaProcedimiento.findMany({
      where: { consultaId: citaId },
      orderBy: { createdAt: "desc" },
    })

    return ok(
      procedimientos.map((p) => ({
        id: p.idConsultaProcedimiento,
        procedureId: p.procedureId,
        serviceType: p.serviceType,
        toothNumber: p.toothNumber,
        toothSurface: p.toothSurface,
        quantity: p.quantity,
        unitPriceCents: p.unitPriceCents,
        totalCents: p.totalCents,
        resultNotes: p.resultNotes,
        treatmentStepId: p.treatmentStepId,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))
    )
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(errorMessage ?? "Error al obtener procedimientos")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/procedimientos
 * Crea un nuevo procedimiento
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
      return errors.forbidden("Solo ODONT y ADMIN pueden crear procedimientos")
    }

    const body = await req.json()
    const validationResult = createProcedureSchema.safeParse(body)
    if (!validationResult.success) {
      // Extraer el primer mensaje de error relevante
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }
    const input = validationResult.data

    // Asegurar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, userId)
    }

    // Calcular total si no se proporciona
    const totalCents = input.totalCents ?? (input.unitPriceCents ? input.unitPriceCents * input.quantity : null)

    const procedimiento = await prisma.consultaProcedimiento.create({
      data: {
        consultaId: citaId,
        procedureId: input.procedureId ?? null,
        serviceType: input.serviceType ?? null,
        toothNumber: input.toothNumber ?? null,
        toothSurface: input.toothSurface ?? null,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents ?? null,
        totalCents,
        resultNotes: input.resultNotes ?? null,
        treatmentStepId: input.treatmentStepId ?? null,
      },
    })

    // Si el procedimiento está vinculado a un step, actualizar su estado
    if (input.treatmentStepId) {
      const step = await prisma.treatmentStep.findUnique({
        where: { idTreatmentStep: input.treatmentStepId },
        select: { status: true },
      })

      if (step) {
        // Actualizar estado a COMPLETED si está en PENDING, SCHEDULED o IN_PROGRESS
        if (
          step.status === TreatmentStepStatus.PENDING ||
          step.status === TreatmentStepStatus.SCHEDULED ||
          step.status === TreatmentStepStatus.IN_PROGRESS
        ) {
          await prisma.treatmentStep.update({
            where: { idTreatmentStep: input.treatmentStepId },
            data: { status: TreatmentStepStatus.COMPLETED },
          })
        }
        // Si ya está en COMPLETED, CANCELLED o DEFERRED, no cambiar (idempotencia)
      }
    }

    return ok({
      id: procedimiento.idConsultaProcedimiento,
      procedureId: procedimiento.procedureId,
      serviceType: procedimiento.serviceType,
      toothNumber: procedimiento.toothNumber,
      toothSurface: procedimiento.toothSurface,
      quantity: procedimiento.quantity,
      unitPriceCents: procedimiento.unitPriceCents,
      totalCents: procedimiento.totalCents,
      resultNotes: procedimiento.resultNotes,
      treatmentStepId: procedimiento.treatmentStepId,
      createdAt: procedimiento.createdAt.toISOString(),
      updatedAt: procedimiento.updatedAt.toISOString(),
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(errorMessage ?? "Error al crear procedimiento")
  }
}

