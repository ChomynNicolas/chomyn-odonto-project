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
    const rol: "ADMIN" | "ODONT" | "RECEP" = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

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
        deletedByUserId: session.user.id ? Number.parseInt(session.user.id, 10) : null,
      },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/adjuntos/[adjuntoId]]", e)
    return errors.internal(errorMessage ?? "Error al eliminar adjunto")
  }
}

