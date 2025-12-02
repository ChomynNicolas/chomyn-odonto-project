// src/app/api/agenda/citas/[id]/consulta/procedimientos/_step-session.ts
import type { Prisma } from "@prisma/client"
import { TreatmentStepStatus } from "@prisma/client"

export interface StepSessionProgressResult {
  updated: boolean
  newStatus: TreatmentStepStatus
  newCurrentSession: number | null
  wasCompleted: boolean
  previousSession: number | null
  sessionCompleted: number | null // Which session was completed (if any)
  treatmentPlanId: number | null // Plan ID for completion check
}

/**
 * Handles session progress when a procedure is linked to a treatment step.
 * 
 * For single-session steps: Marks as COMPLETED (existing behavior).
 * For multi-session steps: Completes the current session and advances to the next.
 * 
 * @param tx - Prisma client (can be transaction client or regular client)
 * @param stepId - The treatment step ID
 * @returns Result object with update details
 */
export async function handleStepSessionProgress(
  tx: Prisma.TransactionClient,
  stepId: number
): Promise<StepSessionProgressResult> {
  // Fetch full step data including multi-session fields and plan ID
  const step = await tx.treatmentStep.findUnique({
    where: { idTreatmentStep: stepId },
    select: {
      status: true,
      requiresMultipleSessions: true,
      totalSessions: true,
      currentSession: true,
      treatmentPlanId: true,
    },
  })

  if (!step) {
    throw new Error("Treatment step not found")
  }
  
  const treatmentPlanId = step.treatmentPlanId

  // If step is already COMPLETED, CANCELLED, or DEFERRED, don't change
  if (
    step.status === TreatmentStepStatus.COMPLETED ||
    step.status === TreatmentStepStatus.CANCELLED ||
    step.status === TreatmentStepStatus.DEFERRED
  ) {
    return {
      updated: false,
      newStatus: step.status,
      newCurrentSession: step.currentSession,
      wasCompleted: false,
      previousSession: step.currentSession,
      sessionCompleted: null,
      treatmentPlanId,
    }
  }

  // Single-session step: Mark as COMPLETED (existing behavior)
  if (!step.requiresMultipleSessions) {
    await tx.treatmentStep.update({
      where: { idTreatmentStep: stepId },
      data: {
        status: TreatmentStepStatus.COMPLETED,
        completedAt: new Date(),
      },
    })

    return {
      updated: true,
      newStatus: TreatmentStepStatus.COMPLETED,
      newCurrentSession: null,
      wasCompleted: true,
      previousSession: null,
      sessionCompleted: null,
      treatmentPlanId,
    }
  }

  // Multi-session step: Complete current session and advance
  const totalSessions = step.totalSessions
  if (!totalSessions || totalSessions < 2) {
    // Invalid multi-session configuration, treat as single-session
    await tx.treatmentStep.update({
      where: { idTreatmentStep: stepId },
      data: {
        status: TreatmentStepStatus.COMPLETED,
        completedAt: new Date(),
      },
    })

    return {
      updated: true,
      newStatus: TreatmentStepStatus.COMPLETED,
      newCurrentSession: null,
      wasCompleted: true,
      previousSession: step.currentSession,
      sessionCompleted: null,
      treatmentPlanId,
    }
  }

  const currentSession = step.currentSession ?? 1
  let newCurrentSession: number
  let newStatus: TreatmentStepStatus
  let wasCompleted = false

  if (step.status === TreatmentStepStatus.PENDING || step.status === TreatmentStepStatus.SCHEDULED) {
    // Starting first session: complete session 1 and advance to session 2
    newCurrentSession = 2
    // Check if this is the only session (shouldn't happen, but handle it)
    if (totalSessions === 1) {
      newStatus = TreatmentStepStatus.COMPLETED
      wasCompleted = true
      newCurrentSession = 1
    } else if (newCurrentSession > totalSessions) {
      // If somehow we're past the total, mark as completed
      newStatus = TreatmentStepStatus.COMPLETED
      wasCompleted = true
      newCurrentSession = totalSessions
    } else {
      newStatus = TreatmentStepStatus.IN_PROGRESS
    }
  } else if (step.status === TreatmentStepStatus.IN_PROGRESS) {
    // Completing current session: advance to next
    newCurrentSession = currentSession + 1
    
    if (newCurrentSession > totalSessions) {
      // All sessions complete
      newStatus = TreatmentStepStatus.COMPLETED
      wasCompleted = true
      newCurrentSession = totalSessions
    } else {
      // More sessions remain
      newStatus = TreatmentStepStatus.IN_PROGRESS
    }
  } else {
    // Unexpected status, don't update
    return {
      updated: false,
      newStatus: step.status,
      newCurrentSession: step.currentSession,
      wasCompleted: false,
      previousSession: step.currentSession,
      sessionCompleted: null,
      treatmentPlanId,
    }
  }

  // Update step atomically
  await tx.treatmentStep.update({
    where: { idTreatmentStep: stepId },
    data: {
      status: newStatus,
      currentSession: newCurrentSession,
      completedAt: wasCompleted ? new Date() : null,
    },
  })

  return {
    updated: true,
    newStatus,
    newCurrentSession,
    wasCompleted,
    previousSession: currentSession,
    sessionCompleted: currentSession, // The session that was just completed
    treatmentPlanId,
  }
}

