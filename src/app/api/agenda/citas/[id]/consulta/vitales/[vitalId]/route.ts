// src/app/api/agenda/citas/[id]/consulta/vitales/[vitalId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateVitalesSchema } from "../../_schemas"
import type { Prisma } from "@prisma/client"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  vitalId: z.coerce.number().int().positive(),
})

/**
 * PUT /api/agenda/citas/[id]/consulta/vitales/[vitalId]
 * Actualiza signos vitales existentes
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; vitalId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID inválido")
    const { id: citaId, vitalId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden actualizar signos vitales")
    }

    // Verificar que la consulta existe y permite edición
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { status: true },
    })

    if (!consulta) {
      return errors.notFound("Consulta no encontrada")
    }

    if (consulta.status === "FINAL") {
      return errors.forbidden("No se puede editar una consulta finalizada")
    }

    // Verificar que el vital existe y pertenece a la consulta
    const vitalExistente = await prisma.patientVitals.findUnique({
      where: { idPatientVitals: vitalId },
      select: {
        consultaId: true,
        pacienteId: true,
      },
    })

    if (!vitalExistente) {
      return errors.notFound("Signos vitales no encontrados")
    }

    if (vitalExistente.consultaId !== citaId) {
      return errors.forbidden("Los signos vitales no pertenecen a esta consulta")
    }

    const body = await req.json()
    const input = updateVitalesSchema.parse(body)

    // Calcular BMI si hay altura y peso (usar valores actualizados o existentes)
    const vitalActual = await prisma.patientVitals.findUnique({
      where: { idPatientVitals: vitalId },
      select: {
        heightCm: true,
        weightKg: true,
        bmi: true,
      },
    })

    // Usar valores nuevos si se proporcionan, sino mantener los existentes
    const heightCm = input.heightCm !== undefined ? input.heightCm : vitalActual?.heightCm ?? null
    const weightKg = input.weightKg !== undefined ? input.weightKg : vitalActual?.weightKg ?? null

    // Calcular BMI solo si hay ambos valores (altura y peso)
    let bmi: number | null = null
    if (heightCm && weightKg) {
      const heightM = heightCm / 100
      bmi = Number((weightKg / (heightM * heightM)).toFixed(1))
    }
    // Si no hay altura o peso, BMI será null (no mantener el anterior)

    // Preparar datos de actualización
    const updateData: Prisma.PatientVitalsUpdateInput = {}
    if (input.heightCm !== undefined) updateData.heightCm = input.heightCm
    if (input.weightKg !== undefined) updateData.weightKg = input.weightKg
    if (input.bpSyst !== undefined) updateData.bpSyst = input.bpSyst
    if (input.bpDiast !== undefined) updateData.bpDiast = input.bpDiast
    if (input.heartRate !== undefined) updateData.heartRate = input.heartRate
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.measuredAt) updateData.measuredAt = new Date(input.measuredAt)
    
    // BMI siempre se actualiza (puede ser null si no hay altura/peso)
    updateData.bmi = bmi

    // Actualizar vitales
    const vitales = await prisma.patientVitals.update({
      where: { idPatientVitals: vitalId },
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
      id: vitales.idPatientVitals,
      measuredAt: vitales.measuredAt.toISOString(),
      heightCm: vitales.heightCm,
      weightKg: vitales.weightKg,
      bmi: vitales.bmi,
      bpSyst: vitales.bpSyst,
      bpDiast: vitales.bpDiast,
      heartRate: vitales.heartRate,
      notes: vitales.notes,
      createdBy: {
        id: vitales.createdBy.idUsuario,
        nombre:
          vitales.createdBy.profesional?.persona?.nombres && vitales.createdBy.profesional?.persona?.apellidos
            ? `${vitales.createdBy.profesional.persona.nombres} ${vitales.createdBy.profesional.persona.apellidos}`.trim()
            : vitales.createdBy.nombreApellido ?? "Usuario",
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/vitales/[vitalId]]", e)
    return errors.internal(errorMessage ?? "Error al actualizar signos vitales")
  }
}

/**
 * DELETE /api/agenda/citas/[id]/consulta/vitales/[vitalId]
 * Elimina signos vitales
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; vitalId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID inválido")
    const { id: citaId, vitalId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden eliminar signos vitales")
    }

    // Verificar que la consulta existe y permite edición
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { status: true },
    })

    if (!consulta) {
      return errors.notFound("Consulta no encontrada")
    }

    if (consulta.status === "FINAL") {
      return errors.forbidden("No se puede editar una consulta finalizada")
    }

    // Verificar que el vital existe y pertenece a la consulta
    const vitalExistente = await prisma.patientVitals.findUnique({
      where: { idPatientVitals: vitalId },
      select: {
        consultaId: true,
      },
    })

    if (!vitalExistente) {
      return errors.notFound("Signos vitales no encontrados")
    }

    if (vitalExistente.consultaId !== citaId) {
      return errors.forbidden("Los signos vitales no pertenecen a esta consulta")
    }

    // Eliminar vitales
    await prisma.patientVitals.delete({
      where: { idPatientVitals: vitalId },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/vitales/[vitalId]]", e)
    return errors.internal(errorMessage ?? "Error al eliminar signos vitales")
  }
}

