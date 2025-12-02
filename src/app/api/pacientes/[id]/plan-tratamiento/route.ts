// src/app/api/pacientes/[id]/plan-tratamiento/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, okCreated, errors } from "@/app/api/_http"
import { CreatePlanSchema, UpdatePlanSchema } from "./_schemas"
import {
  createTreatmentPlan,
  getActivePlan,
  updateTreatmentPlan
} from "./_service"
import { requireRole } from "../../_rbac"
import {
  auditPlanCreate,
  auditPlanUpdate,
  auditStepCreate,
  auditStepUpdate,
  auditStepDelete,
} from "./_audit"

/**
 * GET /api/pacientes/[id]/plan-tratamiento
 * Obtiene el plan de tratamiento activo del paciente
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Only ODONT/ADMIN can view treatment plans
    if (rol === "RECEP") {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver planes de tratamiento")
    }

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const plan = await getActivePlan(pacienteId)
    return ok(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/pacientes/[id]/plan-tratamiento]", e)
    return errors.internal(errorMessage ?? "Error al obtener plan de tratamiento")
  }
}

/**
 * POST /api/pacientes/[id]/plan-tratamiento
 * Crea un nuevo plan de tratamiento para el paciente
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireRole(["ADMIN", "ODONT"])
    if (!gate.ok) return errors.forbidden(gate.error)

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const body = await req.json()
    const validationResult = CreatePlanSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    const userId = gate.userId!
    const plan = await createTreatmentPlan(pacienteId, validationResult.data, userId)

    // Audit: Plan creation
    await auditPlanCreate(plan.id, userId, {
      pacienteId,
      titulo: plan.titulo,
      descripcion: plan.descripcion,
      stepsCount: plan.steps.length,
      citaId: null,
    }, req)

    // Audit: Step creation for each step
    for (const step of plan.steps) {
      await auditStepCreate(step.id, plan.id, userId, {
        pacienteId,
        order: step.order,
        procedureId: step.procedureId,
        serviceType: step.serviceType,
        toothNumber: step.toothNumber,
        toothSurface: step.toothSurface ?? null,
        requiresMultipleSessions: step.requiresMultipleSessions,
        totalSessions: step.totalSessions,
        citaId: null,
      }, req)
    }

    return okCreated(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/pacientes/[id]/plan-tratamiento]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (
      errorMessage.includes("inválido") ||
      errorMessage.includes("debe") ||
      errorMessage.includes("ya tiene un plan") ||
      errorMessage.includes("debe completar o cancelar")
    ) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al crear plan de tratamiento")
  }
}

/**
 * PUT /api/pacientes/[id]/plan-tratamiento
 * Actualiza el plan de tratamiento activo del paciente
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireRole(["ADMIN", "ODONT"])
    if (!gate.ok) return errors.forbidden(gate.error)

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    // Get active plan (old plan for comparison)
    const activePlan = await getActivePlan(pacienteId)
    if (!activePlan) {
      return errors.notFound("No hay un plan de tratamiento activo para este paciente")
    }

    const body = await req.json()
    const validationResult = UpdatePlanSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    const userId = gate.userId!
    const updatedPlan = await updateTreatmentPlan(activePlan.id, validationResult.data)

    // Audit: Compare old vs new plan to detect changes
    const changes: {
      titulo?: { before: string; after: string }
      descripcion?: { before: string | null; after: string | null }
      stepsAdded?: number
      stepsRemoved?: number
      stepsModified?: number
    } = {}

    // Check title change
    if (validationResult.data.titulo !== undefined && validationResult.data.titulo !== activePlan.titulo) {
      changes.titulo = { before: activePlan.titulo, after: validationResult.data.titulo }
    }

    // Check description change
    if (validationResult.data.descripcion !== undefined) {
      const oldDesc = activePlan.descripcion ?? null
      const newDesc = validationResult.data.descripcion ?? null
      if (oldDesc !== newDesc) {
        changes.descripcion = { before: oldDesc, after: newDesc }
      }
    }

    // Check step changes
    if (validationResult.data.steps !== undefined) {
      const oldStepIds = new Set(activePlan.steps.map((s) => s.id))
      const newStepIds = new Set(
        validationResult.data.steps.filter((s) => s.id !== undefined).map((s) => s.id!)
      )

      // Steps removed
      const removedSteps = activePlan.steps.filter((s) => !newStepIds.has(s.id))
      if (removedSteps.length > 0) {
        changes.stepsRemoved = removedSteps.length
        // Audit each removed step
        for (const step of removedSteps) {
          await auditStepDelete(step.id, activePlan.id, userId, {
            pacienteId,
            order: step.order,
            procedureId: step.procedureId,
            serviceType: step.serviceType,
            citaId: null,
          }, req)
        }
      }

      // Steps added
      const addedSteps = validationResult.data.steps.filter((s) => s.id === undefined)
      if (addedSteps.length > 0) {
        changes.stepsAdded = addedSteps.length
        // Find the corresponding new steps in updated plan
        const newSteps = updatedPlan.steps.filter((s) => !oldStepIds.has(s.id))
        for (const newStep of newSteps) {
          await auditStepCreate(newStep.id, activePlan.id, userId, {
            pacienteId,
            order: newStep.order,
            procedureId: newStep.procedureId,
            serviceType: newStep.serviceType,
            toothNumber: newStep.toothNumber,
            toothSurface: newStep.toothSurface ?? null,
            requiresMultipleSessions: newStep.requiresMultipleSessions,
            totalSessions: newStep.totalSessions,
            citaId: null,
          }, req)
        }
      }

      // Steps modified (high-level: just count, don't track individual field changes)
      const modifiedSteps = validationResult.data.steps.filter(
        (s) => s.id !== undefined && oldStepIds.has(s.id)
      )
      if (modifiedSteps.length > 0) {
        changes.stepsModified = modifiedSteps.length
        // For each modified step, audit the update (high-level)
        for (const modifiedStep of modifiedSteps) {
          const oldStep = activePlan.steps.find((s) => s.id === modifiedStep.id)
          if (oldStep) {
            // Determine which fields changed (high-level tracking)
            const changedFields: string[] = []
            if (modifiedStep.order !== undefined && modifiedStep.order !== oldStep.order) {
              changedFields.push("order")
            }
            if (modifiedStep.procedureId !== undefined && modifiedStep.procedureId !== oldStep.procedureId) {
              changedFields.push("procedureId")
            }
            if (modifiedStep.serviceType !== undefined && modifiedStep.serviceType !== oldStep.serviceType) {
              changedFields.push("serviceType")
            }
            if (modifiedStep.toothNumber !== undefined && modifiedStep.toothNumber !== oldStep.toothNumber) {
              changedFields.push("toothNumber")
            }
            if (modifiedStep.estimatedDurationMin !== undefined && modifiedStep.estimatedDurationMin !== oldStep.estimatedDurationMin) {
              changedFields.push("estimatedDurationMin")
            }
            if (modifiedStep.estimatedCostCents !== undefined && modifiedStep.estimatedCostCents !== oldStep.estimatedCostCents) {
              changedFields.push("estimatedCostCents")
            }
            if (modifiedStep.priority !== undefined && modifiedStep.priority !== oldStep.priority) {
              changedFields.push("priority")
            }
            if (modifiedStep.notes !== undefined && modifiedStep.notes !== oldStep.notes) {
              changedFields.push("notes")
            }
            if (modifiedStep.requiresMultipleSessions !== undefined && modifiedStep.requiresMultipleSessions !== oldStep.requiresMultipleSessions) {
              changedFields.push("requiresMultipleSessions")
            }
            if (modifiedStep.totalSessions !== undefined && modifiedStep.totalSessions !== oldStep.totalSessions) {
              changedFields.push("totalSessions")
            }

            if (changedFields.length > 0) {
              await auditStepUpdate(modifiedStep.id!, activePlan.id, userId, {
                pacienteId,
                order: oldStep.order,
                changedFields,
                citaId: null,
              }, req)
            }
          }
        }
      }
    }

    // Audit plan update if there are any changes
    if (Object.keys(changes).length > 0 || (validationResult.data.steps !== undefined && (changes.stepsAdded || changes.stepsRemoved || changes.stepsModified))) {
      await auditPlanUpdate(activePlan.id, userId, {
        pacienteId,
        changes,
        citaId: null,
      }, req)
    }

    return ok(updatedPlan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/pacientes/[id]/plan-tratamiento]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (errorMessage.includes("inválido") || errorMessage.includes("debe")) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al actualizar plan de tratamiento")
  }
}

