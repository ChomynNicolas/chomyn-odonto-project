// src/app/api/agenda/citas/[id]/consulta/procedimientos/[procedimientoId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateProcedureSchema } from "../../_schemas"
import type { Prisma } from "@prisma/client"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  procedimientoId: z.coerce.number().int().positive(),
})

/**
 * PUT /api/agenda/citas/[id]/consulta/procedimientos/[procedimientoId]
 * Actualiza un procedimiento
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; procedimientoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, procedimientoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar procedimientos")
    }

    const body = await req.json()
    const input = updateProcedureSchema.parse(body)

    // Verificar que el procedimiento pertenece a esta consulta
    const procedimiento = await prisma.consultaProcedimiento.findFirst({
      where: {
        idConsultaProcedimiento: procedimientoId,
        consultaId: citaId,
      },
    })
    if (!procedimiento) return errors.notFound("Procedimiento no encontrado")

    const updateData: Prisma.ConsultaProcedimientoUpdateInput = {}
    if (input.quantity !== undefined) updateData.quantity = input.quantity
    if (input.unitPriceCents !== undefined) updateData.unitPriceCents = input.unitPriceCents
    if (input.totalCents !== undefined) {
      updateData.totalCents = input.totalCents
    } else if (input.unitPriceCents !== undefined && input.quantity !== undefined) {
      updateData.totalCents = input.unitPriceCents * input.quantity
    } else if (input.unitPriceCents !== undefined) {
      updateData.totalCents = input.unitPriceCents * procedimiento.quantity
    } else if (input.quantity !== undefined && procedimiento.unitPriceCents) {
      updateData.totalCents = procedimiento.unitPriceCents * input.quantity
    }
    if (input.resultNotes !== undefined) updateData.resultNotes = input.resultNotes

    const updated = await prisma.consultaProcedimiento.update({
      where: { idConsultaProcedimiento: procedimientoId },
      data: updateData,
    })

    return ok({
      id: updated.idConsultaProcedimiento,
      procedureId: updated.procedureId,
      serviceType: updated.serviceType,
      toothNumber: updated.toothNumber,
      toothSurface: updated.toothSurface,
      quantity: updated.quantity,
      unitPriceCents: updated.unitPriceCents,
      totalCents: updated.totalCents,
      resultNotes: updated.resultNotes,
      treatmentStepId: updated.treatmentStepId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/procedimientos/[procedimientoId]]", e)
    return errors.internal(errorMessage ?? "Error al actualizar procedimiento")
  }
}

/**
 * DELETE /api/agenda/citas/[id]/consulta/procedimientos/[procedimientoId]
 * Elimina un procedimiento
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; procedimientoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, procedimientoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden eliminar procedimientos")
    }

    const procedimiento = await prisma.consultaProcedimiento.findFirst({
      where: {
        idConsultaProcedimiento: procedimientoId,
        consultaId: citaId,
      },
    })
    if (!procedimiento) return errors.notFound("Procedimiento no encontrado")

    await prisma.consultaProcedimiento.delete({
      where: { idConsultaProcedimiento: procedimientoId },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/procedimientos/[procedimientoId]]", e)
    return errors.internal(errorMessage ?? "Error al eliminar procedimiento")
  }
}

