// src/app/api/agenda/citas/[id]/follow-up/_service.ts
import { prisma } from "@/lib/prisma"
import { TreatmentStepStatus } from "@prisma/client"
import type { FollowUpContext, NextSessionInfo } from "@/types/agenda"

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
      isActive: true,
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
      recommendedFollowUpDate: calculateDefaultFollowUpDate(completionDate),
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
  const nextSessions: NextSessionInfo[] = []

  for (const step of activePlan.steps) {
    // Only consider multi-session steps that are not completed
    if (
      step.requiresMultipleSessions &&
      step.totalSessions &&
      step.totalSessions >= 2 &&
      step.status !== TreatmentStepStatus.COMPLETED &&
      step.status !== TreatmentStepStatus.CANCELLED &&
      step.status !== TreatmentStepStatus.DEFERRED
    ) {
      const currentSession = step.currentSession ?? 1
      const totalSessions = step.totalSessions

      // Check if there are remaining sessions
      if (currentSession < totalSessions) {
        const nextSessionNumber = currentSession + 1

        // Determine if this step was worked on in this appointment
        // (if it's in the linked steps, or if currentSession was just advanced)
        const wasWorkedOn = linkedStepIds.includes(step.idTreatmentStep)

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
  }

  const hasPendingSessions = nextSessions.length > 0

  // Calculate recommended follow-up date
  // Default: 1 week from completion, but could be customized per treatment type
  const recommendedFollowUpDate = hasPendingSessions
    ? calculateDefaultFollowUpDate(completionDate)
    : calculateDefaultFollowUpDate(completionDate)

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

