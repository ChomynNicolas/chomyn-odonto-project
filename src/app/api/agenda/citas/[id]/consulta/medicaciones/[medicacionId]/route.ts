// src/app/api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateMedicationSchema } from "../../_schemas"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  medicacionId: z.coerce.number().int().positive(),
})

/**
 * PUT /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]
 * Actualiza una medicación
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; medicacionId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, medicacionId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar medicaciones")
    }

    const body = await req.json()
    const input = updateMedicationSchema.parse(body)

    // Verificar que la medicación pertenece a esta consulta
    const medicacion = await prisma.patientMedication.findFirst({
      where: {
        idPatientMedication: medicacionId,
        consultaId: citaId,
      },
    })
    if (!medicacion) return errors.notFound("Medicación no encontrada")

    const updateData: any = {}
    if (input.label !== undefined) updateData.label = input.label
    if (input.dose !== undefined) updateData.dose = input.dose
    if (input.freq !== undefined) updateData.freq = input.freq
    if (input.route !== undefined) updateData.route = input.route
    if (input.startAt !== undefined) updateData.startAt = input.startAt ? new Date(input.startAt) : null
    if (input.endAt !== undefined) updateData.endAt = input.endAt ? new Date(input.endAt) : null
    if (input.isActive !== undefined) updateData.isActive = input.isActive

    const updated = await prisma.patientMedication.update({
      where: { idPatientMedication: medicacionId },
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
      id: updated.idPatientMedication,
      medicationId: updated.medicationId,
      label: updated.label,
      dose: updated.dose,
      freq: updated.freq,
      route: updated.route,
      startAt: updated.startAt?.toISOString() ?? null,
      endAt: updated.endAt?.toISOString() ?? null,
      isActive: updated.isActive,
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
    console.error("[PUT /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]]", e)
    return errors.internal(e?.message ?? "Error al actualizar medicación")
  }
}

/**
 * DELETE /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]
 * Desactiva una medicación (soft delete)
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; medicacionId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { id: citaId, medicacionId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = ((session.user as any)?.rol ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden desactivar medicaciones")
    }

    const medicacion = await prisma.patientMedication.findFirst({
      where: {
        idPatientMedication: medicacionId,
        consultaId: citaId,
      },
    })
    if (!medicacion) return errors.notFound("Medicación no encontrada")

    await prisma.patientMedication.update({
      where: { idPatientMedication: medicacionId },
      data: { isActive: false },
    })

    return ok({ deleted: true })
  } catch (e: any) {
    console.error("[DELETE /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]]", e)
    return errors.internal(e?.message ?? "Error al desactivar medicación")
  }
}

