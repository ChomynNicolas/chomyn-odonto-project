// Utility functions for treatment plans with multi-session support

import type {
  TreatmentPlanStep,
  TreatmentStepSessionInfo,
  TreatmentPlanProgress,
  TreatmentPlan,
} from '@/types/treatment-plans'

export type SessionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

/**
 * Calculate session progress for a treatment step
 */
export function calculateSessionProgress(step: TreatmentPlanStep): TreatmentStepSessionInfo | null {
  if (!step.requiresMultipleSessions || !step.totalSessions || step.totalSessions < 2) {
    return null
  }

  const totalSessions = step.totalSessions
  const currentSession = step.currentSession ?? 1
  const isCompleted = step.status === 'COMPLETED'

  let completedSessions: number
  if (isCompleted) {
    completedSessions = totalSessions
  } else if (currentSession > 1) {
    // currentSession represents the next session to work on
    // So completed sessions = currentSession - 1
    completedSessions = currentSession - 1
  } else {
    // Not started yet
    completedSessions = 0
  }

  return {
    completedSessions,
    totalSessions,
    isCompleted,
    currentSession: isCompleted ? totalSessions : currentSession,
  }
}

/**
 * Get the status of a specific session within a step
 */
export function getSessionStatus(
  step: TreatmentPlanStep,
  sessionNumber: number
): SessionStatus {
  if (!step.requiresMultipleSessions || !step.totalSessions) {
    return step.status === 'COMPLETED' ? 'COMPLETED' : step.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'
  }

  const currentSession = step.currentSession ?? 1

  if (step.status === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (sessionNumber < currentSession) {
    return 'COMPLETED'
  } else if (sessionNumber === currentSession) {
    return step.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING'
  } else {
    return 'PENDING'
  }
}

/**
 * Format session label (e.g., "Sesión 2 de 3")
 */
export function formatSessionLabel(step: TreatmentPlanStep): string | null {
  if (!step.requiresMultipleSessions || !step.totalSessions) {
    return null
  }

  const currentSession = step.currentSession ?? 1
  return `Sesión ${currentSession} de ${step.totalSessions}`
}

/**
 * Calculate plan-level progress metrics
 */
export function calculatePlanProgress(plan: TreatmentPlan): TreatmentPlanProgress {
  let totalSessions = 0
  let completedSessions = 0

  plan.steps.forEach(step => {
    if (step.requiresMultipleSessions && step.totalSessions && step.totalSessions >= 2) {
      const stepTotal = step.totalSessions
      totalSessions += stepTotal

      if (step.status === 'COMPLETED') {
        completedSessions += stepTotal
      } else if (step.currentSession && step.currentSession > 1) {
        // Completed sessions = currentSession - 1
        completedSessions += step.currentSession - 1
      }
    } else {
      // Single session step
      totalSessions += 1
      if (step.status === 'COMPLETED') {
        completedSessions += 1
      }
    }
  })

  return {
    ...plan.progress,
    completedSessions: totalSessions > 0 ? completedSessions : undefined,
    totalSessions: totalSessions > 0 ? totalSessions : undefined,
  }
}

/**
 * Generate list of sessions for a multi-session step
 */
export function generateSessionList(step: TreatmentPlanStep): Array<{
  sessionNumber: number
  status: SessionStatus
  isCurrent: boolean
}> {
  if (!step.requiresMultipleSessions || !step.totalSessions || step.totalSessions < 2) {
    return []
  }

  const totalSessions = step.totalSessions
  const currentSession = step.currentSession ?? 1
  const sessions: Array<{ sessionNumber: number; status: SessionStatus; isCurrent: boolean }> = []

  for (let i = 1; i <= totalSessions; i++) {
    sessions.push({
      sessionNumber: i,
      status: getSessionStatus(step, i),
      isCurrent: i === currentSession && step.status === 'IN_PROGRESS',
    })
  }

  return sessions
}

