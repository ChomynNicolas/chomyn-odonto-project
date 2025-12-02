// src/app/api/pacientes/[id]/plan-tratamiento/_validations.ts
import { BadRequestError } from "@/app/api/_lib/errors"
import { TreatmentPlanStatus } from "@prisma/client"
import { repoHasActivePlan, repoGetPlan } from "./_repo"
import { validatePlanStatusTransition } from "./_plan-status.service"

/**
 * Validates that no active plan exists for the patient
 * Throws BadRequestError if an active plan exists
 */
export async function validateNoActivePlanExists(pacienteId: number): Promise<void> {
  const hasActivePlan = await repoHasActivePlan(pacienteId)
  if (hasActivePlan) {
    throw new BadRequestError(
      "El paciente ya tiene un plan de tratamiento activo. Debe completar o cancelar el plan existente antes de crear uno nuevo."
    )
  }
}

/**
 * Validates that a plan is not completed
 * Throws BadRequestError if the plan is COMPLETED
 */
export async function validatePlanNotCompleted(planId: number): Promise<void> {
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new BadRequestError("Plan de tratamiento no encontrado")
  }
  if (plan.status === TreatmentPlanStatus.COMPLETED) {
    throw new BadRequestError("No se puede modificar un plan de tratamiento que ya está completado")
  }
}

/**
 * Validates that a plan is active
 * Throws BadRequestError if the plan is not ACTIVE
 */
export async function validatePlanIsActive(planId: number): Promise<void> {
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new BadRequestError("Plan de tratamiento no encontrado")
  }
  if (plan.status !== TreatmentPlanStatus.ACTIVE) {
    throw new BadRequestError(
      `El plan de tratamiento no está activo (estado actual: ${plan.status}). Solo se pueden agregar procedimientos a planes activos.`
    )
  }
}

/**
 * Validates a status transition for a plan
 * Throws BadRequestError if the transition is invalid
 */
export async function validateStatusTransition(
  planId: number,
  toStatus: TreatmentPlanStatus
): Promise<void> {
  const plan = await repoGetPlan(planId)
  if (!plan) {
    throw new BadRequestError("Plan de tratamiento no encontrado")
  }

  const isValid = validatePlanStatusTransition(plan.status, toStatus)
  if (!isValid) {
    throw new BadRequestError(
      `La transición de estado de ${plan.status} a ${toStatus} no es válida.`
    )
  }
}

