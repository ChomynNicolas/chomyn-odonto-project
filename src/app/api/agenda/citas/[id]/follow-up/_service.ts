// src/app/api/agenda/citas/[id]/follow-up/_service.ts
import { prisma } from "@/lib/prisma"
import { TreatmentStepStatus } from "@prisma/client"
import type { FollowUpContext, NextSessionInfo } from "@/types/agenda"

/**
 * Checks if a treatment plan is fully completed (all steps are COMPLETED)
 * Cancelled or DEFERRED steps don't prevent plan completion
 */
function isPlanFullyCompleted(plan: {
  steps: Array<{
    status: TreatmentStepStatus
  }>
}): boolean {
  if (plan.steps.length === 0) {
    return true // Empty plan is considered completed
  }

  // Plan is complete when all non-cancelled, non-deferred steps are COMPLETED
  const activeSteps = plan.steps.filter(
    (step) =>
      step.status !== TreatmentStepStatus.CANCELLED &&
      step.status !== TreatmentStepStatus.DEFERRED
  )

  if (activeSteps.length === 0) {
    return true // All steps cancelled/deferred = effectively completed
  }

  return activeSteps.every((step) => step.status === TreatmentStepStatus.COMPLETED)
}



/**
 * Gets the correct next session number for a step
 * currentSession already represents the next session to work on
 */
function getNextSessionNumber(step: {
  currentSession: number | null
  totalSessions: number | null
}): number {
  const currentSession = step.currentSession ?? 1
  const totalSessions = step.totalSessions ?? 1

  // currentSession already represents the next session to work on
  // No need to add 1
  return Math.min(currentSession, totalSessions)
}

/**
 * Gets follow-up context for a completed appointment
 * Determines if there are pending sessions in treatment plans and recommends follow-up dates
 */
export async function getFollowUpContext(
  citaId: number,
  pacienteId: number
): Promise<FollowUpContext> {
  // Get appointment details to know when it was completed
  const cita = await prisma.cita.findUnique({
    where: { idCita: citaId },
    select: {
      estado: true,
      completedAt: true,
      inicio: true,
    },
  })

  if (!cita) {
    throw new Error(`Appointment ${citaId} not found`)
  }

  // Use completion date or appointment start date as fallback
  const completionDate = cita.completedAt || cita.inicio

  // Get active treatment plan for patient
  const activePlan = await prisma.treatmentPlan.findFirst({
    where: {
      pacienteId,
      status: "ACTIVE",
    },
    include: {
      steps: {
        include: {
          procedimientoCatalogo: {
            select: {
              idProcedimiento: true,
              nombre: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  })

  // If no active plan, return context without session info
  if (!activePlan) {
    return {
      hasActivePlan: false,
      planId: null,
      planTitle: null,
      hasPendingSessions: false,
      nextSessions: [],
      recommendedFollowUpDate: calculateDefaultFollowUpDate(completionDate).toISOString(),
      isMultiSessionFollowUp: false,
    }
  }

  // Check if plan is fully completed
  if (isPlanFullyCompleted(activePlan)) {
    return {
      hasActivePlan: true,
      planId: activePlan.idTreatmentPlan,
      planTitle: activePlan.titulo,
      hasPendingSessions: false,
      nextSessions: [],
      recommendedFollowUpDate: calculateDefaultFollowUpDate(completionDate).toISOString(),
      isMultiSessionFollowUp: false,
    }
  }

  // Get procedures from this appointment that are linked to treatment steps
  const consulta = await prisma.consulta.findUnique({
    where: { citaId },
    select: { citaId: true },
  })

  const linkedStepIds = consulta
    ? await prisma.consultaProcedimiento
        .findMany({
          where: {
            consultaId: citaId,
            treatmentStepId: { not: null },
          },
          select: {
            treatmentStepId: true,
          },
        })
        .then((procs) => procs.map((p) => p.treatmentStepId).filter((id): id is number => id !== null))
    : []

  // Find steps with pending sessions
  // Only include steps that are IN_PROGRESS (actively being worked on)
  const nextSessions: NextSessionInfo[] = []

  for (const step of activePlan.steps) {
    // Only consider multi-session steps
    if (
      !step.requiresMultipleSessions ||
      !step.totalSessions ||
      step.totalSessions < 2
    ) {
      continue
    }

    // Skip completed, cancelled, or deferred steps
    if (
      step.status === TreatmentStepStatus.COMPLETED ||
      step.status === TreatmentStepStatus.CANCELLED ||
      step.status === TreatmentStepStatus.DEFERRED
    ) {
      continue
    }

    // Only suggest sessions for steps that are IN_PROGRESS or were worked on in this appointment
    // Steps that are IN_PROGRESS have sessions in progress
    // Steps that were just worked on (have procedures in this appointment) should also be included
    const wasWorkedOnInThisAppointment = linkedStepIds.includes(step.idTreatmentStep)
    
    if (step.status !== TreatmentStepStatus.IN_PROGRESS && !wasWorkedOnInThisAppointment) {
      // Skip steps that haven't been started and weren't worked on in this appointment
      continue
    }

    const currentSession = step.currentSession ?? 1
    const totalSessions = step.totalSessions

    // Validate that currentSession is within bounds
    if (currentSession < 1 || currentSession > totalSessions) {
      console.warn(
        `[getFollowUpContext] Invalid currentSession ${currentSession} for step ${step.idTreatmentStep} (total: ${totalSessions})`
      )
      continue
    }

    // currentSession represents the next session to work on
    // If currentSession === totalSessions, the next appointment will complete the step
    // If currentSession < totalSessions, there are more sessions after the next one
    // Always include if we've passed validation (currentSession is within bounds)
    
    // FIX: currentSession already represents the next session number
    // Don't add 1 to it - this was the bug causing "Session 3 of 3" instead of "Session 2 of 3"
    const nextSessionNumber = getNextSessionNumber(step)

    nextSessions.push({
      stepId: step.idTreatmentStep,
      stepOrder: step.order,
      stepName:
        step.procedimientoCatalogo?.nombre ||
        step.serviceType ||
        `Paso ${step.order}`,
      currentSession,
      totalSessions,
      nextSessionNumber,
      estimatedDurationMin: step.estimatedDurationMin,
    })
  }

  const hasPendingSessions = nextSessions.length > 0

  // Calculate recommended follow-up date
  const recommendedFollowUpDate = calculateDefaultFollowUpDate(completionDate)

  return {
    hasActivePlan: true,
    planId: activePlan.idTreatmentPlan,
    planTitle: activePlan.titulo,
    hasPendingSessions,
    nextSessions,
    recommendedFollowUpDate: recommendedFollowUpDate.toISOString(),
    isMultiSessionFollowUp: hasPendingSessions,
  }
}

/**
 * Calculates default follow-up date (1 week from completion date)
 * Could be enhanced to consider treatment type, step duration, etc.
 */
function calculateDefaultFollowUpDate(completionDate: Date): Date {
  const followUpDate = new Date(completionDate)
  followUpDate.setDate(followUpDate.getDate() + 7) // 1 week later
  return followUpDate
}

