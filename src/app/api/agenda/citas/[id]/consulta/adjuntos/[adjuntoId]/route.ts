// src/app/api/agenda/citas/[id]/consulta/adjuntos/[adjuntoId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  adjuntoId: z.coerce.number().int().positive(),
})

/**
 * DELETE /api/agenda/citas/[id]/consulta/adjuntos/[adjuntoId]
 * Elimina un adjunto (soft delete)
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; adjuntoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, adjuntoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canDeleteAttachments(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden eliminar adjuntos")
    }

    const adjunto = await prisma.adjunto.findFirst({
      where: {
        idAdjunto: adjuntoId,
        consultaId: citaId,
        isActive: true,
      },
    })
    if (!adjunto) return errors.notFound("Adjunto no encontrado")

    await prisma.adjunto.update({
      where: { idAdjunto: adjuntoId },
      data: {
        isActive: false,
        deletedAt: new Date(),
        deletedByUserId: session.user.id,
      },
    })

    return ok({ deleted: true })
  } catch (e: any) {
    console.error("[DELETE /api/agenda/citas/[id]/consulta/adjuntos/[adjuntoId]]", e)
    return errors.internal(e?.message ?? "Error al eliminar adjunto")
  }
}

