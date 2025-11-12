// src/app/api/agenda/citas/[id]/consulta/estado/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, updateConsultaStatusSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/**
 * PUT /api/agenda/citas/[id]/consulta/estado
 * Actualiza el estado de la consulta (DRAFT -> FINAL)
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden actualizar el estado de la consulta")
    }

    const body = await req.json()
    const input = updateConsultaStatusSchema.parse(body)

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const updateData: Prisma.ConsultaUpdateInput = {
      status: input.status,
    }
    if (input.startedAt) updateData.startedAt = new Date(input.startedAt)
    if (input.finishedAt) updateData.finishedAt = new Date(input.finishedAt)

    const updated = await prisma.consulta.update({
      where: { citaId },
      data: updateData,
    })

    return ok({
      citaId: updated.citaId,
      status: updated.status,
      startedAt: updated.startedAt?.toISOString() ?? null,
      finishedAt: updated.finishedAt?.toISOString() ?? null,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/estado]", e)
    return errors.internal(errorMessage ?? "Error al actualizar estado de consulta")
  }
}

