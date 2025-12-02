// src/lib/audit/diagnosis.ts
/**
 * Diagnosis-specific audit logging utilities
 * 
 * Provides specialized audit logging functions for diagnosis lifecycle events:
 * - Creation
 * - Updates (field-level changes)
 * - Status transitions
 * - Resolution/closure
 * - Deletion
 * 
 * All functions follow the principle of not storing PHI (Protected Health Information)
 * in audit logs, only metadata and change summaries.
 */

import { safeAuditWrite } from "./log"
import { AuditAction, AuditEntity } from "./actions"
import type { DiagnosisStatus } from "@prisma/client"

/**
 * Interface for diagnosis data used in audit logs
 * Excludes PHI and focuses on metadata
 */
export interface DiagnosisAuditData {
  diagnosisId: number
  pacienteId: number
  consultaId?: number | null
  diagnosisCatalogId?: number | null
  code?: string | null
  label: string // Diagnosis label (not PHI, but clinical term)
  status: DiagnosisStatus
  previousStatus?: DiagnosisStatus | null
  notesChanged?: boolean
  reason?: string | null
}

/**
 * Field-level change tracking for diagnosis updates
 */
export interface DiagnosisFieldChanges {
  status?: { from: DiagnosisStatus | null; to: DiagnosisStatus }
  notes?: { from: string | null; to: string | null }
  code?: { from: string | null; to: string | null }
  label?: { from: string; to: string }
}

/**
 * Audit metadata structure for diagnosis operations
 */
export interface DiagnosisAuditMetadata {
  pacienteId: number
  consultaId?: number | null
  diagnosisCatalogId?: number | null
  code?: string | null
  label: string
  status: DiagnosisStatus
  previousStatus?: DiagnosisStatus | null
  reason?: string | null
  changes?: DiagnosisFieldChanges
  source?: "catalog" | "manual"
  resolvedAt?: string | null
  linkedProceduresCount?: number
}

/**
 * Logs audit entry for diagnosis creation
 */
export async function auditDiagnosisCreate(args: {
  actorId: number
  diagnosisId: number
  pacienteId: number
  consultaId?: number | null
  diagnosisCatalogId?: number | null
  code?: string | null
  label: string
  status: DiagnosisStatus
  notes?: string | null
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  const auditMetadata: DiagnosisAuditMetadata = {
    pacienteId: args.pacienteId,
    consultaId: args.consultaId ?? null,
    diagnosisCatalogId: args.diagnosisCatalogId ?? null,
    code: args.code ?? null,
    label: args.label,
    status: args.status,
    source: args.diagnosisCatalogId ? "catalog" : "manual",
    ...(args.metadata ?? {}),
  }

  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.DIAGNOSIS_CREATE,
    entity: AuditEntity.PatientDiagnosis,
    entityId: args.diagnosisId,
    metadata: auditMetadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for diagnosis update
 * Tracks field-level changes (before/after values)
 */
export async function auditDiagnosisUpdate(args: {
  actorId: number
  diagnosisId: number
  pacienteId: number
  consultaId?: number | null
  label: string
  changes: DiagnosisFieldChanges
  currentStatus: DiagnosisStatus
  previousStatus?: DiagnosisStatus | null
  reason?: string | null
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  const auditMetadata: DiagnosisAuditMetadata = {
    pacienteId: args.pacienteId,
    consultaId: args.consultaId ?? null,
    label: args.label,
    status: args.currentStatus,
    previousStatus: args.previousStatus ?? null,
    reason: args.reason ?? null,
    changes: args.changes,
    ...(args.metadata ?? {}),
  }

  // Determine specific action based on what changed
  let action: AuditAction = AuditAction.DIAGNOSIS_UPDATE
  
  if (args.changes.status) {
    // Status change is a special case - log both general update and status change
    action = AuditAction.DIAGNOSIS_STATUS_CHANGE
    
    // Also log specific resolution/discard actions
    if (args.changes.status.to === "RESOLVED") {
      action = AuditAction.DIAGNOSIS_RESOLVE
    } else if (args.changes.status.to === "DISCARDED" || args.changes.status.to === "RULED_OUT") {
      action = AuditAction.DIAGNOSIS_DISCARD
    }
  }

  await safeAuditWrite({
    actorId: args.actorId,
    action,
    entity: AuditEntity.PatientDiagnosis,
    entityId: args.diagnosisId,
    metadata: auditMetadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for diagnosis deletion
 */
export async function auditDiagnosisDelete(args: {
  actorId: number
  diagnosisId: number
  pacienteId: number
  consultaId?: number | null
  label: string
  status: DiagnosisStatus
  reason?: string | null
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  const auditMetadata: DiagnosisAuditMetadata = {
    pacienteId: args.pacienteId,
    consultaId: args.consultaId ?? null,
    label: args.label,
    status: args.status,
    reason: args.reason ?? null,
    ...(args.metadata ?? {}),
  }

  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.DIAGNOSIS_DELETE,
    entity: AuditEntity.PatientDiagnosis,
    entityId: args.diagnosisId,
    metadata: auditMetadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Helper function to compute field-level changes between old and new diagnosis data
 */
export function computeDiagnosisChanges(
  oldData: {
    status: DiagnosisStatus
    notes?: string | null
    code?: string | null
    label?: string
  },
  newData: {
    status?: DiagnosisStatus
    notes?: string | null
    code?: string | null
    label?: string
  }
): DiagnosisFieldChanges {
  const changes: DiagnosisFieldChanges = {}

  if (newData.status !== undefined && newData.status !== oldData.status) {
    changes.status = {
      from: oldData.status,
      to: newData.status,
    }
  }

  if (newData.notes !== undefined && newData.notes !== oldData.notes) {
    changes.notes = {
      from: oldData.notes ?? null,
      to: newData.notes ?? null,
    }
  }

  if (newData.code !== undefined && newData.code !== oldData.code) {
    changes.code = {
      from: oldData.code ?? null,
      to: newData.code ?? null,
    }
  }

  if (newData.label !== undefined && newData.label !== oldData.label) {
    changes.label = {
      from: oldData.label ?? "",
      to: newData.label ?? "",
    }
  }

  return changes
}

