// Audit service for patient updates with detailed change tracking

import { prisma } from "@/lib/prisma"
import { AuditAction, AuditEntity } from "./actions"
import type { PatientChangeRecord } from "@/types/patient-edit.types"
import { getFieldLabel, formatDisplayValue } from "./diff-utils"
import type { Prisma } from "@prisma/client"

/**
 * Parameters for creating a patient audit log entry
 */
export interface CreatePatientAuditLogParams {
  actorId: number
  actorEmail?: string
  pacienteId: number
  changes: PatientChangeRecord[]
  ipAddress?: string
  userAgent?: string
  motivo?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Creates an audit log entry for patient updates
 * Stores detailed diff, user information, IP, user agent, and optional reason for critical changes
 */
export async function createPatientAuditLog(params: CreatePatientAuditLogParams): Promise<number | null> {
  try {
    const {
      actorId,
      actorEmail,
      pacienteId,
      changes,
      ipAddress,
      userAgent,
      motivo,
      metadata,
    } = params

    // Prepare metadata object
    const auditMetadata: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      ...(metadata ?? {}),
    }

    // Add diff if provided
    if (changes && changes.length > 0) {
      // Store detailed changes array for reference
      auditMetadata.changesDetail = changes.map((change) => ({
        field: change.field,
        fieldLabel: getFieldLabel(change.field),
        oldValue: change.oldValue instanceof Date ? change.oldValue.toISOString() : change.oldValue,
        newValue: change.newValue instanceof Date ? change.newValue.toISOString() : change.newValue,
        oldValueDisplay: formatDisplayValue(change.oldValue),
        newValueDisplay: formatDisplayValue(change.newValue),
        isCritical: change.isCritical,
      }))
      
      // Store summary counts (compatible with AuditDiffViewer)
      auditMetadata.changes = {
        added: 0,
        removed: 0,
        modified: changes.length,
      }
      
      // Store diff in format compatible with AuditDiffViewer
      auditMetadata.diff = {
        added: [],
        removed: [],
        modified: changes.map((change) => ({
          field: change.field,
          fieldLabel: getFieldLabel(change.field), // Include label for display
          oldValue: formatDisplayValue(change.oldValue),
          newValue: formatDisplayValue(change.newValue),
          isCritical: change.isCritical,
        })),
      }
      
      auditMetadata.changesCount = changes.length
      auditMetadata.criticalChanges = changes.filter((c) => c.isCritical).map((c) => c.field)
      auditMetadata.criticalChangesCount = changes.filter((c) => c.isCritical).length

      // Create summary for display in audit log table
      const criticalChanges = changes.filter((c) => c.isCritical)
      if (criticalChanges.length > 0) {
        auditMetadata.summary = `${criticalChanges.length} cambio(s) crítico(s): ${criticalChanges.map((c) => getFieldLabel(c.field)).join(", ")}`
      } else {
        auditMetadata.summary = `${changes.length} campo(s) modificado(s): ${changes.map((c) => getFieldLabel(c.field)).join(", ")}`
      }
    }

    // Add user agent if provided
    if (userAgent) {
      auditMetadata.userAgent = userAgent
    }

    // Add email if provided
    if (actorEmail) {
      auditMetadata.actorEmail = actorEmail
    }

    // Add motivo if provided (for critical changes)
    if (motivo) {
      auditMetadata.motivoCambioCritico = motivo
    }

    // Create audit log entry directly using Prisma
    // Using direct Prisma call to get the created log ID
    const auditLog = await prisma.auditLog.create({
      data: {
        actorId,
        action: AuditAction.PATIENT_UPDATE,
        entity: AuditEntity.Patient,
        entityId: pacienteId,
        ip: ipAddress ?? null,
        metadata: auditMetadata as Prisma.InputJsonValue,
      },
    })

    return auditLog.idAuditLog
  } catch (error) {
    console.error("[AuditLog] Failed to create patient audit log:", error)
    return null
  }
}

/**
 * Retrieves audit logs for a specific patient
 * Returns the last 50 audit log entries for the patient
 */
export async function getPatientAuditLogs(pacienteId: number) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: AuditEntity.Patient,
        entityId: pacienteId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        actor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            email: true,
            rol: {
              select: {
                nombreRol: true,
              },
            },
          },
        },
      },
    })

    return logs.map((log) => ({
      id: log.idAuditLog,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      ip: log.ip,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
      actor: {
        id: log.actor.idUsuario,
        nombre: log.actor.nombreApellido ?? "Usuario desconocido",
        email: log.actor.email,
        role: log.actor.rol.nombreRol,
      },
    }))
  } catch (error) {
    console.error("[AuditLog] Failed to retrieve patient audit logs:", error)
    throw error
  }
}
