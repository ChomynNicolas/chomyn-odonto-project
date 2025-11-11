// src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateDiagnosisSchema } from "../../_schemas"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  diagnosticoId: z.coerce.number().int().positive(),
})

/**
 * PUT /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]
 * Actualiza un diagnóstico (principalmente estado y notas)
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; diagnosticoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, diagnosticoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar diagnósticos")
    }

    const body = await req.json()
    const input = updateDiagnosisSchema.parse(body)

    // Verificar que el diagnóstico pertenece a esta consulta
    const diagnostico = await prisma.patientDiagnosis.findFirst({
      where: {
        idPatientDiagnosis: diagnosticoId,
        consultaId: citaId,
      },
    })
    if (!diagnostico) return errors.notFound("Diagnóstico no encontrado")

    const updateData: any = {}
    if (input.status !== undefined) {
      updateData.status = input.status
      if (input.status === "RESOLVED" && !diagnostico.resolvedAt) {
        updateData.resolvedAt = new Date()
      } else if (input.status !== "RESOLVED") {
        updateData.resolvedAt = null
      }
    }
    if (input.notes !== undefined) updateData.notes = input.notes

    const updated = await prisma.patientDiagnosis.update({
      where: { idPatientDiagnosis: diagnosticoId },
      data: updateData,
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
      id: updated.idPatientDiagnosis,
      diagnosisId: updated.diagnosisId,
      code: updated.code,
      label: updated.label,
      status: updated.status,
      notedAt: updated.notedAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString() ?? null,
      notes: updated.notes,
      createdBy: {
        id: updated.createdBy.idUsuario,
        nombre:
          updated.createdBy.profesional?.persona?.nombres && updated.createdBy.profesional?.persona?.apellidos
            ? `${updated.createdBy.profesional.persona.nombres} ${updated.createdBy.profesional.persona.apellidos}`.trim()
            : updated.createdBy.nombreApellido ?? "Usuario",
      },
    })
  } catch (e: any) {
    if (e.name === "ZodError") return errors.validation(e.errors[0]?.message ?? "Datos inválidos")
    console.error("[PUT /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]]", e)
    return errors.internal(e?.message ?? "Error al actualizar diagnóstico")
  }
}

/**
 * DELETE /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]
 * Elimina un diagnóstico (solo ADMIN)
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; diagnosticoId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, diagnosticoId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Solo ADMIN puede eliminar diagnósticos (o cambiar estado a RULED_OUT)
    if (rol !== "ADMIN") {
      return errors.forbidden("Solo ADMIN puede eliminar diagnósticos")
    }

    const diagnostico = await prisma.patientDiagnosis.findFirst({
      where: {
        idPatientDiagnosis: diagnosticoId,
        consultaId: citaId,
      },
    })
    if (!diagnostico) return errors.notFound("Diagnóstico no encontrado")

    await prisma.patientDiagnosis.delete({
      where: { idPatientDiagnosis: diagnosticoId },
    })

    return ok({ deleted: true })
  } catch (e: any) {
    console.error("[DELETE /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]]", e)
    return errors.internal(e?.message ?? "Error al eliminar diagnóstico")
  }
}

