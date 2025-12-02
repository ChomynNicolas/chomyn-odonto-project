// src/app/api/pacientes/[id]/plan-tratamiento/_audit.ts
import { logAudit } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { NextRequest } from "next/server"

/**
 * Audit helper for treatment plan operations
 * Centralizes audit logging logic for maintainability
 */

/**
 * Helper to extract IP and user agent from request
 */
function extractRequestInfo(req: NextRequest): { ip?: string; userAgent?: string } {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  const userAgent = req.headers.get("user-agent") ?? undefined
  return { ip, userAgent }
}

/**
 * Logs audit entry for treatment plan creation
 */
export async function auditPlanCreate(
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    titulo: string
    descripcion?: string | null
    stepsCount: number
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentPlan,
      entityId: planId,
      action: AuditAction.TREATMENT_PLAN_CREATE,
      payload: {
        pacienteId: metadata.pacienteId,
        titulo: metadata.titulo,
        descripcion: metadata.descripcion ?? null,
        stepsCount: metadata.stepsCount,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break plan operations
    console.error("[audit] Failed to log plan creation:", error)
  }
}

/**
 * Logs audit entry for treatment plan update
 */
export async function auditPlanUpdate(
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    changes: {
      titulo?: { before: string; after: string }
      descripcion?: { before: string | null; after: string | null }
      stepsAdded?: number
      stepsRemoved?: number
      stepsModified?: number
    }
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    const changes = metadata.changes
    const changeSummary: string[] = []

    if (changes.titulo) {
      changeSummary.push(`Título: "${changes.titulo.before}" → "${changes.titulo.after}"`)
    }
    if (changes.descripcion !== undefined) {
      const before = changes.descripcion.before ?? "(vacío)"
      const after = changes.descripcion.after ?? "(vacío)"
      changeSummary.push(`Descripción: "${before}" → "${after}"`)
    }
    if (changes.stepsAdded && changes.stepsAdded > 0) {
      changeSummary.push(`${changes.stepsAdded} paso(s) agregado(s)`)
    }
    if (changes.stepsRemoved && changes.stepsRemoved > 0) {
      changeSummary.push(`${changes.stepsRemoved} paso(s) eliminado(s)`)
    }
    if (changes.stepsModified && changes.stepsModified > 0) {
      changeSummary.push(`${changes.stepsModified} paso(s) modificado(s)`)
    }

    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentPlan,
      entityId: planId,
      action: AuditAction.TREATMENT_PLAN_UPDATE,
      payload: {
        pacienteId: metadata.pacienteId,
        changes: {
          added: changes.stepsAdded ?? 0,
          removed: changes.stepsRemoved ?? 0,
          modified: changes.stepsModified ?? 0,
        },
        summary: changeSummary.length > 0 ? changeSummary.join("; ") : "Sin cambios detectados",
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break plan operations
    console.error("[audit] Failed to log plan update:", error)
  }
}

/**
 * Logs audit entry for treatment plan status change
 */
export async function auditPlanStatusChange(
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    oldStatus: string
    newStatus: string
    action: "COMPLETE" | "CANCEL" | "REACTIVATE"
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    const actionMap = {
      COMPLETE: AuditAction.TREATMENT_PLAN_COMPLETE,
      CANCEL: AuditAction.TREATMENT_PLAN_CANCEL,
      REACTIVATE: AuditAction.TREATMENT_PLAN_REACTIVATE,
    }
    const action = actionMap[metadata.action]

    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentPlan,
      entityId: planId,
      action: AuditAction.TREATMENT_PLAN_STATUS_CHANGE,
      payload: {
        pacienteId: metadata.pacienteId,
        oldStatus: metadata.oldStatus,
        newStatus: metadata.newStatus,
        statusTransition: `${metadata.oldStatus} → ${metadata.newStatus}`,
        action: metadata.action,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })

    // Also log the specific action (COMPLETE, CANCEL, REACTIVATE)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentPlan,
      entityId: planId,
      action,
      payload: {
        pacienteId: metadata.pacienteId,
        oldStatus: metadata.oldStatus,
        newStatus: metadata.newStatus,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break plan operations
    console.error("[audit] Failed to log plan status change:", error)
  }
}

/**
 * Logs audit entry for treatment step creation
 */
export async function auditStepCreate(
  stepId: number,
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    order: number
    procedureId?: number | null
    serviceType?: string | null
    toothNumber?: number | null
    toothSurface?: string | null
    requiresMultipleSessions?: boolean
    totalSessions?: number | null
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentStep,
      entityId: stepId,
      action: AuditAction.TREATMENT_STEP_CREATE,
      payload: {
        planId,
        pacienteId: metadata.pacienteId,
        order: metadata.order,
        procedureId: metadata.procedureId ?? null,
        serviceType: metadata.serviceType ?? null,
        toothNumber: metadata.toothNumber ?? null,
        toothSurface: metadata.toothSurface ?? null,
        requiresMultipleSessions: metadata.requiresMultipleSessions ?? false,
        totalSessions: metadata.totalSessions ?? null,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break step operations
    console.error("[audit] Failed to log step creation:", error)
  }
}

/**
 * Logs audit entry for treatment step update
 */
export async function auditStepUpdate(
  stepId: number,
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    order: number
    changedFields: string[]
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentStep,
      entityId: stepId,
      action: AuditAction.TREATMENT_STEP_UPDATE,
      payload: {
        planId,
        pacienteId: metadata.pacienteId,
        order: metadata.order,
        changedFields: metadata.changedFields,
        summary: `${metadata.changedFields.length} campo(s) modificado(s): ${metadata.changedFields.join(", ")}`,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break step operations
    console.error("[audit] Failed to log step update:", error)
  }
}

/**
 * Logs audit entry for treatment step deletion
 */
export async function auditStepDelete(
  stepId: number,
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    order: number
    procedureId?: number | null
    serviceType?: string | null
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentStep,
      entityId: stepId,
      action: AuditAction.TREATMENT_STEP_DELETE,
      payload: {
        planId,
        pacienteId: metadata.pacienteId,
        order: metadata.order,
        procedureId: metadata.procedureId ?? null,
        serviceType: metadata.serviceType ?? null,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break step operations
    console.error("[audit] Failed to log step deletion:", error)
  }
}

/**
 * Logs audit entry for treatment step status change
 */
export async function auditStepStatusChange(
  stepId: number,
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    order: number
    oldStatus: string
    newStatus: string
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentStep,
      entityId: stepId,
      action: AuditAction.TREATMENT_STEP_STATUS_CHANGE,
      payload: {
        planId,
        pacienteId: metadata.pacienteId,
        order: metadata.order,
        oldStatus: metadata.oldStatus,
        newStatus: metadata.newStatus,
        statusTransition: `${metadata.oldStatus} → ${metadata.newStatus}`,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break step operations
    console.error("[audit] Failed to log step status change:", error)
  }
}

/**
 * Logs audit entry for treatment step session completion
 */
export async function auditStepSessionComplete(
  stepId: number,
  planId: number,
  userId: number,
  metadata: {
    pacienteId: number
    order: number
    currentSession: number
    totalSessions: number
    isLastSession: boolean
    sessionNotes?: string | null
    appointmentId?: number | null
    citaId?: number | null
  },
  req: NextRequest
) {
  try {
    const { ip, userAgent } = extractRequestInfo(req)
    await logAudit({
      actorUserId: userId,
      entity: AuditEntity.TreatmentStep,
      entityId: stepId,
      action: AuditAction.TREATMENT_STEP_SESSION_COMPLETE,
      payload: {
        planId,
        pacienteId: metadata.pacienteId,
        order: metadata.order,
        currentSession: metadata.currentSession,
        totalSessions: metadata.totalSessions,
        isLastSession: metadata.isLastSession,
        sessionNotes: metadata.sessionNotes ?? null,
        appointmentId: metadata.appointmentId ?? null,
        summary: metadata.isLastSession
          ? `Completada sesión final ${metadata.currentSession} de ${metadata.totalSessions}. Procedimiento finalizado.`
          : `Completada sesión ${metadata.currentSession} de ${metadata.totalSessions}. ${metadata.totalSessions - metadata.currentSession} sesión(es) restante(s).`,
        citaId: metadata.citaId ?? null,
        module: "PlanesTratamientoModule",
      },
      ip,
      userAgent,
      path: req.nextUrl.pathname,
    })
  } catch (error) {
    // Audit failures should not break session completion
    console.error("[audit] Failed to log step session completion:", error)
  }
}

