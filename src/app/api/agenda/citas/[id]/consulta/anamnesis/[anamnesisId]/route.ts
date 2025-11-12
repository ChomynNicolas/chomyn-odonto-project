// src/app/api/agenda/citas/[id]/consulta/anamnesis/[anamnesisId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateAnamnesisSchema } from "../../_schemas"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  anamnesisId: z.coerce.number().int().positive(),
})

/**
 * PUT /api/agenda/citas/[id]/consulta/anamnesis/[anamnesisId]
 * Actualiza una anamnesis existente
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; anamnesisId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, anamnesisId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar anamnesis")
    }

    const body = await req.json()
    const input = updateAnamnesisSchema.parse(body)

    // Verificar que la anamnesis pertenece a esta consulta
    const anamnesis = await prisma.clinicalHistoryEntry.findFirst({
      where: {
        idClinicalHistoryEntry: anamnesisId,
        consultaId: citaId,
      },
    })
    if (!anamnesis) return errors.notFound("Anamnesis no encontrada")

    const updated = await prisma.clinicalHistoryEntry.update({
      where: { idClinicalHistoryEntry: anamnesisId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.notes !== undefined && { notes: input.notes }),
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
      id: updated.idClinicalHistoryEntry,
      title: updated.title,
      notes: updated.notes,
      fecha: updated.fecha.toISOString(),
      createdBy: {
        id: updated.createdBy.idUsuario,
        nombre:
          updated.createdBy.profesional?.persona?.nombres && updated.createdBy.profesional?.persona?.apellidos
            ? `${updated.createdBy.profesional.persona.nombres} ${updated.createdBy.profesional.persona.apellidos}`.trim()
            : updated.createdBy.nombreApellido ?? "Usuario",
      },
      createdAt: updated.createdAt.toISOString(),
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/anamnesis/[anamnesisId]]", e)
    return errors.internal(errorMessage ?? "Error al actualizar anamnesis")
  }
}

/**
 * DELETE /api/agenda/citas/[id]/consulta/anamnesis/[anamnesisId]
 * Elimina una anamnesis (soft delete o hard delete según política)
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; anamnesisId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, anamnesisId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden eliminar anamnesis")
    }

    // Verificar que la anamnesis pertenece a esta consulta
    const anamnesis = await prisma.clinicalHistoryEntry.findFirst({
      where: {
        idClinicalHistoryEntry: anamnesisId,
        consultaId: citaId,
      },
    })
    if (!anamnesis) return errors.notFound("Anamnesis no encontrada")

    await prisma.clinicalHistoryEntry.delete({
      where: { idClinicalHistoryEntry: anamnesisId },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/anamnesis/[anamnesisId]]", e)
    return errors.internal(errorMessage ?? "Error al eliminar anamnesis")
  }
}

