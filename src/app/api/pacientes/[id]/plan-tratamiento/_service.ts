// src/app/api/pacientes/[id]/plan-tratamiento/_service.ts
import { BadRequestError, NotFoundError } from "@/app/api/_lib/errors"
import { prisma } from "@/lib/prisma"
import { TreatmentPlanStatus, TreatmentStepStatus } from "@prisma/client"
import type { CreatePlanInput, UpdatePlanInput } from "./_schemas"
import {
  repoCreatePlan,
  repoGetActivePlan,
  repoGetPlan,
  repoUpdatePlan,
  repoUpdateStepStatus,
  repoUpdatePlanStatus,
} from "./_repo"
import type { PlanTratamientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { validateNoActivePlanExists, validateStatusTransition } from "./_validations"
import { checkAndCompletePlan } from "./_plan-status.service"
import { getTreatmentPlanCatalogById } from "@/app/api/treatment-plan-catalog/_service"

function displayUser(user: {
  idUsuario: number
  usuario: string | null
  nombreApellido: string | null
  profesional?: {
    persona: {
      nombres: string
      apellidos: string
    } | null
  } | null
}): string {
  if (user.profesional?.persona) {
    const p = user.profesional.persona
    return `${p.nombres} ${p.apellidos}`.trim()
  }
  return user.nombreApellido?.trim() || user.usuario || "Usuario"
}

function mapPlanToDTO(plan: NonNullable<Awaited<ReturnType<typeof repoGetActivePlan>>>): PlanTratamientoDTO {
  return {
    id: plan.idTreatmentPlan,
    titulo: plan.titulo,
    descripcion: plan.descripcion,
    status: plan.status,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    createdBy: {
      id: plan.creadoPor.idUsuario,
      nombre: displayUser(plan.creadoPor),
    },
    steps: plan.steps.map((step) => ({
      id: step.idTreatmentStep,
      order: step.order,
      procedureId: step.procedureId,
      procedimientoCatalogo: step.procedimientoCatalogo
        ? {
            id: step.procedimientoCatalogo.idProcedimiento,
            code: step.procedimientoCatalogo.code,
            nombre: step.procedimientoCatalogo.nombre,
          }
        : null,
      serviceType: step.serviceType,
      toothNumber: step.toothNumber,
      toothSurface: step.toothSurface,
      estimatedDurationMin: step.estimatedDurationMin,
      estimatedCostCents: step.estimatedCostCents,
      priority: step.priority,
      status: step.status,
      notes: step.notes,
      requiresMultipleSessions: step.requiresMultipleSessions,
      totalSessions: step.totalSessions,
      currentSession: step.currentSession,
      completedAt: step.completedAt?.toISOString() ?? null,
      createdAt: step.createdAt.toISOString(),
      updatedAt: step.updatedAt.toISOString(),
    })),
  }
}

export async function getActivePlan(pacienteId: number): Promise<PlanTratamientoDTO | null> {
  const plan = await repoGetActivePlan(pacienteId)
  if (!plan) return null
  return mapPlanToDTO(plan)
}

export async function createTreatmentPlan(
  pacienteId: number,
  body: CreatePlanInput,
  userId: number
): Promise<PlanTratamientoDTO> {
  // Validate patient exists
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente: pacienteId },
    select: { idPaciente: true },
  })
  if (!paciente) {
    throw new NotFoundError("Paciente no encontrado")
  }

  // Validate no active plan exists
  await validateNoActivePlanExists(pacienteId)

  let titulo: string
  let descripcion: string | null
  let steps: CreatePlanInput["steps"]
  let catalogPlanId: number | null = null

  // Load from catalog if catalogId is provided
  if (body.catalogId) {
    const catalog = await getTreatmentPlanCatalogById(body.catalogId)
    
    if (!catalog.isActive) {
      throw new BadRequestError("El plan del catálogo seleccionado está inactivo")
    }

    catalogPlanId = catalog.idTreatmentPlanCatalog
    titulo = catalog.nombre
    descripcion = catalog.descripcion
    steps = catalog.steps.map((step) => ({
      order: step.order,
      procedureId: step.procedureId,
      serviceType: step.serviceType,
      toothNumber: step.toothNumber,
      toothSurface: step.toothSurface,
      estimatedDurationMin: step.estimatedDurationMin,
      estimatedCostCents: step.estimatedCostCents,
      priority: step.priority,
      notes: step.notes,
      requiresMultipleSessions: step.requiresMultipleSessions,
      totalSessions: step.totalSessions,
      currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
    }))
  } else {
    // Manual creation
    if (!body.titulo || !body.steps || body.steps.length === 0) {
      throw new BadRequestError("Debe proporcionar titulo y steps para creación manual")
    }
    titulo = body.titulo
    descripcion = body.descripcion ?? null
    steps = body.steps
  }

  // Validate steps
  await validatePlanSteps(steps!)

  // Create plan
  const plan = await repoCreatePlan({
    pacienteId,
    titulo,
    descripcion,
    createdByUserId: userId,
    steps: steps!,
    catalogPlanId,
  })

  if (!plan) {
    throw new Error("Error al crear plan de tratamiento")
  }

  return mapPlanToDTO(plan)
}

export async function updateTreatmentPlan(
  planId: number,
  body: UpdatePlanInput,
): Promise<PlanTratamientoDTO> {
  // Verify plan exists and belongs to patient
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new NotFoundError("Plan de tratamiento no encontrado")
  }

  // Validate steps if provided
  if (body.steps !== undefined) {
    await validatePlanSteps(body.steps)
  }

  // Update plan
  const updatedPlan = await repoUpdatePlan(planId, {
    titulo: body.titulo,
    descripcion: body.descripcion,
    steps: body.steps,
  })

  if (!updatedPlan) {
    throw new Error("Error al actualizar plan de tratamiento")
  }

  return mapPlanToDTO(updatedPlan)
}

export async function updateStepStatus(
  stepId: number,
  status: TreatmentStepStatus
): Promise<void> {
  const step = await prisma.treatmentStep.findUnique({
    where: { idTreatmentStep: stepId },
    select: { idTreatmentStep: true },
  })

  if (!step) {
    throw new NotFoundError("Paso del plan no encontrado")
  }

  await repoUpdateStepStatus(stepId, status)
}

/**
 * Manually completes a treatment plan
 */
export async function completePlan(planId: number): Promise<PlanTratamientoDTO> {
  await validateStatusTransition(planId, TreatmentPlanStatus.COMPLETED)
  
  await repoUpdatePlanStatus(planId, TreatmentPlanStatus.COMPLETED)
  
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new NotFoundError("Plan de tratamiento no encontrado")
  }
  
  return mapPlanToDTO(plan)
}

/**
 * Cancels a treatment plan
 */
export async function cancelPlan(planId: number): Promise<PlanTratamientoDTO> {
  await validateStatusTransition(planId, TreatmentPlanStatus.CANCELLED)
  
  await repoUpdatePlanStatus(planId, TreatmentPlanStatus.CANCELLED)
  
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new NotFoundError("Plan de tratamiento no encontrado")
  }
  
  return mapPlanToDTO(plan)
}

/**
 * Reactivates a treatment plan from COMPLETED or CANCELLED status
 */
export async function reactivatePlan(planId: number): Promise<PlanTratamientoDTO> {
  await validateStatusTransition(planId, TreatmentPlanStatus.ACTIVE)
  
  await repoUpdatePlanStatus(planId, TreatmentPlanStatus.ACTIVE)
  
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new NotFoundError("Plan de tratamiento no encontrado")
  }
  
  return mapPlanToDTO(plan)
}

/**
 * Checks if a plan should be completed and updates it if needed
 * This is called automatically when steps/sessions are completed
 */
export async function checkPlanCompletion(planId: number): Promise<void> {
  await checkAndCompletePlan(planId)
}

async function validatePlanSteps(
  steps: Array<{
    order: number
    procedureId?: number | null
    serviceType?: string | null
    toothNumber?: number | null
  }>
) {
  // Validate unique orders
  const orders = steps.map((s) => s.order)
  const uniqueOrders = new Set(orders)
  if (orders.length !== uniqueOrders.size) {
    throw new BadRequestError("Los pasos deben tener órdenes únicos")
  }

  // Validate each step
  for (const step of steps) {
    // Must have either procedureId or serviceType
    if (!step.procedureId && !step.serviceType) {
      throw new BadRequestError(
        `El paso #${step.order} debe tener un procedureId o serviceType`
      )
    }

    // Validate procedureId exists if provided
    if (step.procedureId) {
      const proc = await prisma.procedimientoCatalogo.findUnique({
        where: { idProcedimiento: step.procedureId },
        select: { idProcedimiento: true, activo: true },
      })
      if (!proc) {
        throw new BadRequestError(
          `El procedureId ${step.procedureId} del paso #${step.order} no existe`
        )
      }
      if (!proc.activo) {
        throw new BadRequestError(
          `El procedimiento ${step.procedureId} del paso #${step.order} está inactivo`
        )
      }
    }

    // Validate toothNumber range if provided
    if (step.toothNumber !== null && step.toothNumber !== undefined) {
      if ((step.toothNumber < 1 || step.toothNumber > 32) && (step.toothNumber < 51 || step.toothNumber > 85)) {
        throw new BadRequestError(
          `El toothNumber ${step.toothNumber} del paso #${step.order} debe estar entre 1-32 o 51-85`
        )
      }
    }
  }
}

