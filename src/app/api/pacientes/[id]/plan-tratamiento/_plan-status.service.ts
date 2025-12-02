// src/app/api/pacientes/[id]/plan-tratamiento/_plan-status.service.ts
import { prisma } from "@/lib/prisma"
import { TreatmentPlanStatus, TreatmentStepStatus } from "@prisma/client"

/**
 * Checks if a treatment plan is fully completed
 * A plan is completed when ALL steps are COMPLETED AND all sessions are completed
 */
export function isPlanCompleted(plan: {
  steps: Array<{
    status: TreatmentStepStatus
    requiresMultipleSessions: boolean
    totalSessions: number | null
    currentSession: number | null
  }>
}): boolean {
  if (plan.steps.length === 0) {
    return false // Empty plan cannot be considered completed
  }

  // Filter out cancelled and deferred steps (they don't count toward completion)
  const activeSteps = plan.steps.filter(
    (step) =>
      step.status !== TreatmentStepStatus.CANCELLED &&
      step.status !== TreatmentStepStatus.DEFERRED
  )

  if (activeSteps.length === 0) {
    // All steps cancelled/deferred = effectively completed
    return true
  }

  // Check if all active steps are completed
  return activeSteps.every((step) => {
    // Step must be COMPLETED
    if (step.status !== TreatmentStepStatus.COMPLETED) {
      return false
    }

    // For multi-session steps, verify all sessions are done
    if (step.requiresMultipleSessions && step.totalSessions) {
      const totalSessions = step.totalSessions
      // currentSession represents the next session to work on
      // If it's >= totalSessions, all sessions are done
      const completedSessions = step.currentSession ?? totalSessions
      return completedSessions >= totalSessions
    }

    return true
  })
}

/**
 * Checks if a patient can create a new active treatment plan
 * Returns true if no active plan exists
 */
export async function canCreateActivePlan(pacienteId: number): Promise<boolean> {
  const activePlan = await prisma.treatmentPlan.findFirst({
    where: {
      pacienteId,
      status: TreatmentPlanStatus.ACTIVE,
    },
    select: {
      idTreatmentPlan: true,
    },
  })

  return activePlan === null
}

/**
 * Checks if a plan should be completed and updates it if needed
 * Returns the updated plan status
 */
export async function checkAndCompletePlan(planId: number): Promise<{
  wasCompleted: boolean
  newStatus: TreatmentPlanStatus
}> {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { idTreatmentPlan: planId },
    include: {
      steps: {
        select: {
          status: true,
          requiresMultipleSessions: true,
          totalSessions: true,
          currentSession: true,
        },
      },
    },
  })

  if (!plan) {
    throw new Error(`Treatment plan ${planId} not found`)
  }

  // Only check completion for active plans
  if (plan.status !== TreatmentPlanStatus.ACTIVE) {
    return {
      wasCompleted: false,
      newStatus: plan.status,
    }
  }

  // Check if plan should be completed
  if (isPlanCompleted(plan)) {
    await prisma.treatmentPlan.update({
      where: { idTreatmentPlan: planId },
      data: {
        status: TreatmentPlanStatus.COMPLETED,
      },
    })

    return {
      wasCompleted: true,
      newStatus: TreatmentPlanStatus.COMPLETED,
    }
  }

  return {
    wasCompleted: false,
    newStatus: plan.status,
  }
}

/**
 * Validates if a status transition is allowed
 * Returns true if the transition is valid, false otherwise
 */
export function validatePlanStatusTransition(
  from: TreatmentPlanStatus,
  to: TreatmentPlanStatus
): boolean {
  // No change is always valid
  if (from === to) {
    return true
  }

  // Define allowed transitions
  const allowedTransitions: Record<TreatmentPlanStatus, TreatmentPlanStatus[]> = {
    [TreatmentPlanStatus.ACTIVE]: [
      TreatmentPlanStatus.COMPLETED,
      TreatmentPlanStatus.CANCELLED,
    ],
    [TreatmentPlanStatus.COMPLETED]: [TreatmentPlanStatus.ACTIVE], // Reactivation allowed
    [TreatmentPlanStatus.CANCELLED]: [TreatmentPlanStatus.ACTIVE], // Reactivation allowed
  }

  const allowed = allowedTransitions[from] || []
  return allowed.includes(to)
}

