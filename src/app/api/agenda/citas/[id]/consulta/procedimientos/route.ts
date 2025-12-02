// src/app/api/agenda/citas/[id]/consulta/procedimientos/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { paramsSchema, createProcedureSchema } from "../_schemas"
import { CONSULTA_RBAC } from "../_rbac"
import { prisma } from "@/lib/prisma"
import { ensureConsulta } from "../_service"
import { auditProcedureCreate } from "./_audit"
import { sanitizeProcedimientoForRole } from "../_utils"
import { handleStepSessionProgress } from "./_step-session"
import { checkPlanCompletion } from "@/app/api/pacientes/[id]/plan-tratamiento/_service"

/**
 * GET /api/agenda/citas/[id]/consulta/procedimientos
 * Obtiene todos los procedimientos de la consulta
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver procedimientos")
    }

    const consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: { citaId: true },
    })
    if (!consulta) return errors.notFound("Consulta no encontrada")

    const procedimientos = await prisma.consultaProcedimiento.findMany({
      where: { consultaId: citaId },
      include: {
        diagnosis: {
          select: {
            idPatientDiagnosis: true,
            label: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return ok(
      procedimientos.map((p) => {
        const procDto = {
          id: p.idConsultaProcedimiento,
          procedureId: p.procedureId,
          serviceType: p.serviceType,
          toothNumber: p.toothNumber,
          toothSurface: p.toothSurface,
          quantity: p.quantity,
          unitPriceCents: p.unitPriceCents,
          totalCents: p.totalCents,
          resultNotes: p.resultNotes,
          treatmentStepId: p.treatmentStepId,
          diagnosisId: p.diagnosisId ?? null,
          diagnosis: p.diagnosis
            ? {
                id: p.diagnosis.idPatientDiagnosis,
                label: p.diagnosis.label,
                status: p.diagnosis.status,
              }
            : null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        }
        // Apply role-based price filtering
        return sanitizeProcedimientoForRole(procDto, rol)
      })
    )
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(errorMessage ?? "Error al obtener procedimientos")
  }
}

/**
 * POST /api/agenda/citas/[id]/consulta/procedimientos
 * Crea un nuevo procedimiento
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("ID de cita inválido")
    const { id: citaId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : 0

    if (!CONSULTA_RBAC.canEditClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden crear procedimientos")
    }

    const body = await req.json()
    const validationResult = createProcedureSchema.safeParse(body)
    if (!validationResult.success) {
      // Extraer el primer mensaje de error relevante
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }
    const input = validationResult.data

    // Asegurar que la consulta existe
    let consulta = await prisma.consulta.findUnique({
      where: { citaId },
      select: {
        citaId: true,
        cita: {
          select: {
            pacienteId: true,
          },
        },
      },
    })
    if (!consulta) {
      const cita = await prisma.cita.findUnique({
        where: { idCita: citaId },
        include: { profesional: true },
      })
      if (!cita) return errors.notFound("Cita no encontrada")
      await ensureConsulta(citaId, cita.profesionalId, userId)
      // Re-fetch to get pacienteId
      const consultaWithPaciente = await prisma.consulta.findUnique({
        where: { citaId },
        select: {
          citaId: true,
          cita: {
            select: {
              pacienteId: true,
            },
          },
        },
      })
      if (!consultaWithPaciente) {
        return errors.internal("Error al crear consulta")
      }
      consulta = consultaWithPaciente
    }

    // Validate diagnosisId if provided
    if (input.diagnosisId) {
      const diagnosis = await prisma.patientDiagnosis.findUnique({
        where: { idPatientDiagnosis: input.diagnosisId },
        select: {
          pacienteId: true,
          status: true,
        },
      })
      if (!diagnosis) {
        return errors.validation("Diagnóstico no encontrado")
      }
      if (diagnosis.pacienteId !== consulta.cita.pacienteId) {
        return errors.validation("El diagnóstico no pertenece al paciente de esta consulta")
      }
    }

    // Calcular total si no se proporciona
    const totalCents = input.totalCents ?? (input.unitPriceCents ? input.unitPriceCents * input.quantity : null)

    // Use transaction to ensure atomicity: create procedure and update step
    const result = await prisma.$transaction(async (tx) => {
      // Create procedure
      const procedimiento = await tx.consultaProcedimiento.create({
        data: {
          consultaId: citaId,
          procedureId: input.procedureId ?? null,
          serviceType: input.serviceType ?? null,
          toothNumber: input.toothNumber ?? null,
          toothSurface: input.toothSurface ?? null,
          quantity: input.quantity,
          unitPriceCents: input.unitPriceCents ?? null,
          totalCents,
          resultNotes: input.resultNotes ?? null,
          treatmentStepId: input.treatmentStepId ?? null,
          diagnosisId: input.diagnosisId ?? null,
        },
        include: {
          diagnosis: {
            select: {
              idPatientDiagnosis: true,
              label: true,
              status: true,
            },
          },
        },
      })

      // Handle step session progress if procedure is linked to a step
      let stepProgressResult = null
      if (input.treatmentStepId) {
        try {
          stepProgressResult = await handleStepSessionProgress(tx, input.treatmentStepId)
        } catch (error) {
          // Log error but don't fail the procedure creation
          console.error("[POST /api/agenda/citas/[id]/consulta/procedimientos] Error updating step:", error)
        }
      }

      return { procedimiento, stepProgressResult }
    })

    const { procedimiento, stepProgressResult } = result

    // Check if plan should be auto-completed after step completion
    if (stepProgressResult?.treatmentPlanId && stepProgressResult.wasCompleted) {
      try {
        await checkPlanCompletion(stepProgressResult.treatmentPlanId)
      } catch (error) {
        // Log error but don't fail the procedure creation
        console.error(
          "[POST /api/agenda/citas/[id]/consulta/procedimientos] Error checking plan completion:",
          error
        )
      }
    }

    // Audit logging (after transaction succeeds)
    await auditProcedureCreate(
      procedimiento.idConsultaProcedimiento,
      userId,
      {
        citaId,
        consultaId: consulta.citaId,
        procedureId: procedimiento.procedureId,
        serviceType: procedimiento.serviceType,
        quantity: procedimiento.quantity,
        treatmentStepId: procedimiento.treatmentStepId,
        diagnosisId: procedimiento.diagnosisId,
        toothNumber: procedimiento.toothNumber,
        toothSurface: procedimiento.toothSurface,
      },
      req
    )

    const responseDto = {
      id: procedimiento.idConsultaProcedimiento,
      procedureId: procedimiento.procedureId,
      serviceType: procedimiento.serviceType,
      toothNumber: procedimiento.toothNumber,
      toothSurface: procedimiento.toothSurface,
      quantity: procedimiento.quantity,
      unitPriceCents: procedimiento.unitPriceCents,
      totalCents: procedimiento.totalCents,
      resultNotes: procedimiento.resultNotes,
      treatmentStepId: procedimiento.treatmentStepId,
      diagnosisId: procedimiento.diagnosisId ?? null,
      diagnosis: procedimiento.diagnosis
        ? {
            id: procedimiento.diagnosis.idPatientDiagnosis,
            label: procedimiento.diagnosis.label,
            status: procedimiento.diagnosis.status,
          }
        : null,
      createdAt: procedimiento.createdAt.toISOString(),
      updatedAt: procedimiento.updatedAt.toISOString(),
    }
    
    // Apply role-based price filtering
    return ok(sanitizeProcedimientoForRole(responseDto, rol))
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/agenda/citas/[id]/consulta/procedimientos]", e)
    return errors.internal(errorMessage ?? "Error al crear procedimiento")
  }
}

