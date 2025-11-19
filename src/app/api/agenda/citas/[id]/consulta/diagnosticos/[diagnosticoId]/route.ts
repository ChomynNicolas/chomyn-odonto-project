// src/app/api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../_rbac"
import { prisma } from "@/lib/prisma"
import { updateDiagnosisSchema } from "../../_schemas"
import type { Prisma } from "@prisma/client"
import { DiagnosisStatus } from "@prisma/client"
import { auditDiagnosisUpdate, computeDiagnosisChanges } from "@/lib/audit/diagnosis"

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
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden editar diagnósticos")
    }

    const body = await req.json()
    const input = updateDiagnosisSchema.parse(body)

    const userId = Number.parseInt(String(session.user.id))
    if (isNaN(userId)) return errors.forbidden("ID de usuario inválido")

    // Verificar que el diagnóstico existe y obtener datos completos para auditoría
    const diagnostico = await prisma.patientDiagnosis.findUnique({
      where: { idPatientDiagnosis: diagnosticoId },
      select: {
        idPatientDiagnosis: true,
        pacienteId: true,
        consultaId: true,
        status: true,
        resolvedAt: true,
        notes: true,
        code: true,
        label: true,
      },
    })
    if (!diagnostico) return errors.notFound("Diagnóstico no encontrado")

    // Verify consulta exists and get pacienteId
    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        citaId: true,
        cita: {
          select: {
            pacienteId: true,
          },
        },
        status: true,
      },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    // Verify diagnosis belongs to same patient
    if (diagnostico.pacienteId !== consulta.cita.pacienteId) {
      return errors.forbidden("El diagnóstico no pertenece al paciente de esta consulta")
    }

    // Verify consulta is not finalized
    if (consulta.status === "FINAL") {
      return errors.forbidden("No se puede editar una consulta finalizada")
    }

    const previousStatus = diagnostico.status
    const updateData: Prisma.PatientDiagnosisUpdateInput = {}
    
    if (input.status !== undefined) {
      updateData.status = input.status
      if (input.status === DiagnosisStatus.RESOLVED && !diagnostico.resolvedAt) {
        updateData.resolvedAt = new Date()
      } else if (input.status !== DiagnosisStatus.RESOLVED) {
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
        encounterDiagnoses: {
          where: { consultaId: citaId },
          select: {
            encounterNotes: true,
            wasEvaluated: true,
            wasManaged: true,
          },
        },
        consultaProcedimientos: {
          where: { consultaId: citaId },
          select: {
            idConsultaProcedimiento: true,
          },
        },
      },
    })

    // Compute field-level changes for audit
    const changes = computeDiagnosisChanges(
      {
        status: diagnostico.status,
        notes: diagnostico.notes,
        code: diagnostico.code,
        label: diagnostico.label,
      },
      {
        status: input.status,
        notes: input.notes,
      }
    )

    // Create DiagnosisStatusHistory entry if status changed
    if (input.status !== undefined && input.status !== previousStatus) {
      await prisma.diagnosisStatusHistory.create({
        data: {
          diagnosisId: diagnosticoId,
          consultaId: citaId,
          previousStatus,
          newStatus: input.status,
          reason: input.reason ?? null,
          changedByUserId: userId,
        },
      })
    }

    // Audit: Log diagnosis update (only if there are actual changes)
    if (Object.keys(changes).length > 0) {
      await auditDiagnosisUpdate({
        actorId: userId,
        diagnosisId: diagnosticoId,
        pacienteId: diagnostico.pacienteId,
        consultaId: citaId,
        changes,
        currentStatus: (input.status ?? diagnostico.status) as DiagnosisStatus,
        previousStatus: diagnostico.status,
        reason: input.reason ?? null,
        headers: req.headers,
        path: `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}`,
      })
    }

    // Ensure EncounterDiagnosis exists for current encounter
    const encounterDiagnosis = await prisma.encounterDiagnosis.findUnique({
      where: {
        consultaId_diagnosisId: {
          consultaId: citaId,
          diagnosisId: diagnosticoId,
        },
      },
    })

    if (!encounterDiagnosis) {
      await prisma.encounterDiagnosis.create({
        data: {
          consultaId: citaId,
          diagnosisId: diagnosticoId,
          wasEvaluated: true,
          wasManaged: input.status !== undefined,
        },
      })
    } else if (input.status !== undefined) {
      // Update wasManaged if status was changed
      await prisma.encounterDiagnosis.update({
        where: {
          consultaId_diagnosisId: {
            consultaId: citaId,
            diagnosisId: diagnosticoId,
          },
        },
        data: {
          wasManaged: true,
        },
      })
    }

    const encounterDiagnosisData = updated.encounterDiagnoses[0]

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
      source: diagnostico.consultaId === citaId ? 'current_encounter' as const : 'previous_encounter' as const,
      encounterNotes: encounterDiagnosisData?.encounterNotes ?? null,
      wasEvaluated: encounterDiagnosisData?.wasEvaluated ?? true,
      wasManaged: encounterDiagnosisData?.wasManaged ?? false,
      linkedProceduresCount: updated.consultaProcedimientos.length,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { errors?: Array<{ message?: string }> }
      return errors.validation(zodError.errors?.[0]?.message ?? "Datos inválidos")
    }
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]]", e)
    return errors.internal(errorMessage ?? "Error al actualizar diagnóstico")
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
    const userId = Number.parseInt(String(session.user.id))
    if (isNaN(userId)) return errors.forbidden("ID de usuario inválido")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Solo ADMIN puede eliminar diagnósticos (o cambiar estado a RULED_OUT)
    if (rol !== "ADMIN") {
      return errors.forbidden("Solo ADMIN puede eliminar diagnósticos")
    }

    const diagnostico = await prisma.patientDiagnosis.findFirst({
      where: {
        idPatientDiagnosis: diagnosticoId,
        consultaId: citaId,
      },
      select: {
        idPatientDiagnosis: true,
        pacienteId: true,
        consultaId: true,
        label: true,
        status: true,
      },
    })
    if (!diagnostico) return errors.notFound("Diagnóstico no encontrado")

    // Audit: Log diagnosis deletion BEFORE deleting
    await auditDiagnosisDelete({
      actorId: userId,
      diagnosisId: diagnosticoId,
      pacienteId: diagnostico.pacienteId,
      consultaId: diagnostico.consultaId,
      label: diagnostico.label,
      status: diagnostico.status,
      headers: req.headers,
      path: `/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosticoId}`,
      metadata: {
        reason: "Deleted by administrator",
      },
    })

    await prisma.patientDiagnosis.delete({
      where: { idPatientDiagnosis: diagnosticoId },
    })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[DELETE /api/agenda/citas/[id]/consulta/diagnosticos/[diagnosticoId]]", e)
    return errors.internal(errorMessage ?? "Error al eliminar diagnóstico")
  }
}

