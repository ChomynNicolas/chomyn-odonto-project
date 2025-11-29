// src/app/api/agenda/citas/[id]/follow-up/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { getFollowUpContext } from "./_service"
import { z } from "zod"

const paramsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
})

/**
 * GET /api/agenda/citas/[id]/follow-up
 * Gets follow-up context for a completed appointment
 * Returns information about pending sessions and recommended follow-up date
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) {
      return errors.validation("ID de cita inválido")
    }

    const { id: citaId } = parsed.data

    // Get appointment to verify it exists and get patient ID
    const { prisma } = await import("@/lib/prisma")
    const cita = await prisma.cita.findUnique({
      where: { idCita: citaId },
      select: {
        pacienteId: true,
        estado: true,
      },
    })

    if (!cita) {
      return errors.notFound("Cita no encontrada")
    }

    // Only allow follow-up context for completed appointments
    if (cita.estado !== "COMPLETED") {
      return errors.validation("Solo se puede obtener contexto de seguimiento para citas completadas")
    }

    const context = await getFollowUpContext(citaId, cita.pacienteId)

    return ok(context)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/follow-up]", e)
    return errors.internal(errorMessage ?? "Error al obtener contexto de seguimiento")
  }
}

