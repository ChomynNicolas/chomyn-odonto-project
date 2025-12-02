// src/app/api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateMedicationSchema } from "../../_schemas"
import type { Prisma } from "@prisma/client"

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
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar medicaciones")
    }

    const body = await req.json()
    const input = updateMedicationSchema.parse(body)

    // Obtener la consulta para verificar el paciente
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    // Verificar que la medicación pertenece al paciente de esta consulta
    const medicacion = await prisma.patientMedication.findFirst({
      where: {
        idPatientMedication: medicacionId,
        pacienteId: consulta.cita.pacienteId,
      },
    })
    if (!medicacion) return errors.notFound("Medicación no encontrada")

    const updateData: Prisma.PatientMedicationUncheckedUpdateInput = {}
    if (input.label !== undefined) updateData.label = input.label
    if (input.description !== undefined) updateData.description = input.description
    if (input.dose !== undefined) updateData.dose = input.dose
    if (input.freq !== undefined) updateData.freq = input.freq
    if (input.route !== undefined) updateData.route = input.route
    if (input.startAt !== undefined) updateData.startAt = input.startAt ? new Date(input.startAt) : null
    if (input.endAt !== undefined) updateData.endAt = input.endAt ? new Date(input.endAt) : null
    if (input.isActive !== undefined) updateData.isActive = input.isActive
    
    // Set audit fields
    updateData.updatedByUserId = userId
    updateData.consultaId = citaId

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
        updatedBy: {
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
        medicationCatalog: {
          select: {
            name: true,
            description: true,
          },
        },
      },
    })

    return ok({
      id: updated.idPatientMedication,
      medicationId: updated.medicationId,
      label: updated.label ?? updated.medicationCatalog?.name ?? "Medicación desconocida",
      description: updated.description,
      dose: updated.dose,
      freq: updated.freq,
      route: updated.route,
      startAt: updated.startAt?.toISOString() ?? null,
      endAt: updated.endAt?.toISOString() ?? null,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt?.toISOString() ?? null,
      consultaId: updated.consultaId,
      createdBy: {
        id: updated.createdBy.idUsuario,
        nombre:
          updated.createdBy.profesional?.persona?.nombres && updated.createdBy.profesional?.persona?.apellidos
            ? `${updated.createdBy.profesional.persona.nombres} ${updated.createdBy.profesional.persona.apellidos}`.trim()
            : updated.createdBy.nombreApellido ?? "Usuario",
      },
      updatedBy: updated.updatedBy
        ? {
            id: updated.updatedBy.idUsuario,
            nombre:
              updated.updatedBy.profesional?.persona?.nombres && updated.updatedBy.profesional?.persona?.apellidos
                ? `${updated.updatedBy.profesional.persona.nombres} ${updated.updatedBy.profesional.persona.apellidos}`.trim()
                : updated.updatedBy.nombreApellido ?? "Usuario",
          }
        : null,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]]", e)
    return errors.internal(errorMessage ?? "Error al actualizar medicación")
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
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden desactivar medicaciones")
    }

    // Obtener la consulta para verificar el paciente
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      include: {
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    // Verificar que la medicación pertenece al paciente de esta consulta
    const medicacion = await prisma.patientMedication.findFirst({
      where: {
        idPatientMedication: medicacionId,
        pacienteId: consulta.cita.pacienteId,
      },
    })
    if (!medicacion) return errors.notFound("Medicación no encontrada")

    await prisma.patientMedication.update({
      where: { idPatientMedication: medicacionId },
      data: {
        isActive: false,
        discontinuedAt: new Date(),
        discontinuedByUserId: userId,
        consultaId: citaId,
      },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]]", e)
    return errors.internal(errorMessage ?? "Error al desactivar medicación")
  }
}

