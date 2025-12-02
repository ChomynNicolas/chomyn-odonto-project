// src/lib/utils/follow-up-helpers.ts
import type { FollowUpContext, NextSessionInfo } from "@/types/agenda"

/**
 * Formats a follow-up motivo text based on the context
 */
export function formatFollowUpMotivo(contexto: FollowUpContext): string {
  if (!contexto.hasActivePlan || !contexto.hasPendingSessions) {
    return "Control de seguimiento"
  }

  const sessions = contexto.nextSessions
  if (sessions.length === 0) {
    return "Control de seguimiento"
  }

  // If there's only one next session, use specific format
  if (sessions.length === 1) {
    const session = sessions[0]
    return `Sesión ${session.nextSessionNumber} de ${session.totalSessions} - ${session.stepName}`
  }

  // Multiple sessions - use generic format
  return `Seguimiento - Plan: ${contexto.planTitle || "Plan de Tratamiento"}`
}

/**
 * Gets the most relevant next session for display
 * Prioritizes the first pending session in order
 */
export function getPrimaryNextSession(contexto: FollowUpContext): NextSessionInfo | null {
  if (!contexto.hasPendingSessions || contexto.nextSessions.length === 0) {
    return null
  }

  // Return the first session (sorted by step order)
  return contexto.nextSessions[0]
}

/**
 * Formats a session label for display (e.g., "Sesión 2 de 3")
 */
export function formatSessionLabel(session: NextSessionInfo): string {
  return `Sesión ${session.nextSessionNumber} de ${session.totalSessions}`
}

/**
 * Calculates suggested duration in minutes based on next sessions
 * Uses the average of estimated durations, or defaults to 60 minutes
 */
export function getSuggestedDuration(contexto: FollowUpContext): number {
  if (!contexto.hasPendingSessions || contexto.nextSessions.length === 0) {
    return 60 // Default 1 hour
  }

  const durations = contexto.nextSessions
    .map((s) => s.estimatedDurationMin)
    .filter((d): d is number => d !== null && d > 0)

  if (durations.length === 0) {
    return 60 // Default 1 hour
  }

  // Use the maximum estimated duration to be safe
  return Math.max(...durations)
}

