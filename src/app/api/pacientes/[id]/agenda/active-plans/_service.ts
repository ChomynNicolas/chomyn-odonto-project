// src/app/api/pacientes/[id]/agenda/active-plans/_service.ts
// Service to get active treatment plans context for appointment creation

import { prisma } from "@/lib/prisma"
import { TreatmentStepStatus } from "@prisma/client"
import type { ActivePlanContext, NextSessionInfo, TipoCita } from "@/types/agenda"

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
  return Math.min(currentSession, totalSessions)
}

/**
 * Infers appointment type (TipoCita) from procedure name or service type
 */
function inferTipoCita(stepName: string, serviceType: string | null): TipoCita {
  const lowerName = stepName.toLowerCase()
  const lowerService = (serviceType || "").toLowerCase()

  if (lowerName.includes("endodoncia") || lowerService.includes("endodoncia")) {
    return "ENDODONCIA"
  }
  if (lowerName.includes("extracción") || lowerName.includes("extraccion") || lowerService.includes("extracción")) {
    return "EXTRACCION"
  }
  if (lowerName.includes("limpieza") || lowerService.includes("limpieza")) {
    return "LIMPIEZA"
  }
  if (lowerName.includes("ortodoncia") || lowerService.includes("ortodoncia")) {
    return "ORTODONCIA"
  }
  if (lowerName.includes("control") || lowerService.includes("control")) {
    return "CONTROL"
  }

  return "CONSULTA" // Default
}

/**
 * Formats motivo text from next session info
 */
function formatMotivoFromSession(session: NextSessionInfo): string {
  return `Sesión ${session.nextSessionNumber} de ${session.totalSessions} - ${session.stepName}`
}

/**
 * Gets active treatment plans context for appointment creation
 * Returns all active plans with their next pending sessions and recommended appointment details
 */
export async function getActivePlansContext(pacienteId: number): Promise<ActivePlanContext> {
  // Get all active treatment plans for patient
  const activePlans = await prisma.treatmentPlan.findMany({
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
    orderBy: { createdAt: "desc" }, // Most recent first
  })

  if (activePlans.length === 0) {
    return {
      hasActivePlans: false,
      plans: [],
    }
  }

  const plansWithSessions = []

  for (const plan of activePlans) {
    // Skip fully completed plans
    if (isPlanFullyCompleted(plan)) {
      continue
    }

    // Find steps with pending sessions
    const nextSessions: NextSessionInfo[] = []

    for (const step of plan.steps) {
      // Only consider multi-session steps
      if (
        !step.requiresMultipleSessions ||
        !step.totalSessions ||
        step.totalSessions < 2
      ) {
        // For single-session steps, include if they're PENDING or IN_PROGRESS
        if (
          step.status === TreatmentStepStatus.PENDING ||
          step.status === TreatmentStepStatus.IN_PROGRESS
        ) {
          nextSessions.push({
            stepId: step.idTreatmentStep,
            stepOrder: step.order,
            stepName:
              step.procedimientoCatalogo?.nombre ||
              step.serviceType ||
              `Paso ${step.order}`,
            currentSession: 1,
            totalSessions: 1,
            nextSessionNumber: 1,
            estimatedDurationMin: step.estimatedDurationMin,
          })
        }
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

      // Include steps that are IN_PROGRESS or PENDING (for multi-session steps)
      if (
        step.status === TreatmentStepStatus.IN_PROGRESS ||
        step.status === TreatmentStepStatus.PENDING
      ) {
        const currentSession = step.currentSession ?? 1
        const totalSessions = step.totalSessions

        // Validate that currentSession is within bounds
        if (currentSession < 1 || currentSession > totalSessions) {
          console.warn(
            `[getActivePlansContext] Invalid currentSession ${currentSession} for step ${step.idTreatmentStep} (total: ${totalSessions})`
          )
          continue
        }

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
    }

    // Only include plans that have pending sessions
    if (nextSessions.length > 0) {
      // Get the primary next session (first in order)
      const primarySession = nextSessions[0]

      // Calculate recommended values
      const recommendedMotivo = formatMotivoFromSession(primarySession)
      const recommendedTipo = inferTipoCita(
        primarySession.stepName,
        plan.steps.find((s) => s.idTreatmentStep === primarySession.stepId)?.serviceType || null
      )
      const recommendedDuracion = primarySession.estimatedDurationMin || 60 // Default 60 minutes

      plansWithSessions.push({
        planId: plan.idTreatmentPlan,
        planTitle: plan.titulo,
        nextSessions,
        recommendedMotivo,
        recommendedTipo,
        recommendedDuracion,
      })
    }
  }

  return {
    hasActivePlans: plansWithSessions.length > 0,
    plans: plansWithSessions,
  }
}

