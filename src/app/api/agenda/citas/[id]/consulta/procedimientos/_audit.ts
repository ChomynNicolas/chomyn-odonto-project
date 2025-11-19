// src/app/api/agenda/citas/[id]/consulta/procedimientos/_audit.ts
import { logAudit } from "@/lib/audit/log"
import type { NextRequest } from "next/server"

/**
 * Audit helper for procedure operations
 * Centralizes audit logging logic for maintainability
 */

/**
 * Logs audit entry for procedure creation
 */
export async function auditProcedureCreate(
  procedureId: number,
  userId: number,
  metadata: {
    citaId: number
    consultaId: number
    procedureId?: number | null
    serviceType?: string | null
    quantity: number
    treatmentStepId?: number | null
    toothNumber?: number | null
    toothSurface?: string | null
  },
  req: NextRequest
) {
  try {
    await logAudit({
      actorUserId: userId,
      entity: "ConsultaProcedimiento",
      entityId: procedureId,
      action: "PROCEDURE_CREATE",
      payload: {
        citaId: metadata.citaId,
        consultaId: metadata.consultaId,
        procedureId: metadata.procedureId ?? null,
        serviceType: metadata.serviceType ?? null,
        quantity: metadata.quantity,
        treatmentStepId: metadata.treatmentStepId ?? null,
        toothNumber: metadata.toothNumber ?? null,
        toothSurface: metadata.toothSurface ?? null,
      },
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") ?? undefined,
    })
  } catch (error) {
    // Audit failures should not break procedure operations
    console.error("[audit] Failed to log procedure creation:", error)
  }
}

/**
 * Logs audit entry for procedure update
 */
export async function auditProcedureUpdate(
  procedureId: number,
  userId: number,
  before: {
    quantity: number
    resultNotes: string | null
    unitPriceCents: number | null
    totalCents: number | null
  },
  after: {
    quantity: number
    resultNotes: string | null
    unitPriceCents: number | null
    totalCents: number | null
  },
  req: NextRequest
) {
  try {
    const changes: Record<string, unknown> = {}
    
    if (before.quantity !== after.quantity) {
      changes.quantity = { before: before.quantity, after: after.quantity }
    }
    if (before.resultNotes !== after.resultNotes) {
      changes.resultNotes = { before: before.resultNotes, after: after.resultNotes }
    }
    if (before.unitPriceCents !== after.unitPriceCents) {
      changes.unitPriceCents = { before: before.unitPriceCents, after: after.unitPriceCents }
    }
    if (before.totalCents !== after.totalCents) {
      changes.totalCents = { before: before.totalCents, after: after.totalCents }
    }

    await logAudit({
      actorUserId: userId,
      entity: "ConsultaProcedimiento",
      entityId: procedureId,
      action: "PROCEDURE_UPDATE",
      payload: {
        changes: Object.keys(changes).length > 0 ? changes : { note: "No changes detected" },
      },
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") ?? undefined,
    })
  } catch (error) {
    // Audit failures should not break procedure operations
    console.error("[audit] Failed to log procedure update:", error)
  }
}

/**
 * Logs audit entry for procedure deletion
 */
export async function auditProcedureDelete(
  procedureId: number,
  userId: number,
  procedureData: {
    citaId: number
    consultaId: number
    procedureId: number | null
    serviceType: string | null
    quantity: number
    treatmentStepId: number | null
    toothNumber: number | null
    toothSurface: string | null
  },
  req: NextRequest
) {
  try {
    await logAudit({
      actorUserId: userId,
      entity: "ConsultaProcedimiento",
      entityId: procedureId,
      action: "PROCEDURE_DELETE",
      payload: {
        citaId: procedureData.citaId,
        consultaId: procedureData.consultaId,
        procedureId: procedureData.procedureId ?? null,
        serviceType: procedureData.serviceType ?? null,
        quantity: procedureData.quantity,
        treatmentStepId: procedureData.treatmentStepId ?? null,
        toothNumber: procedureData.toothNumber ?? null,
        toothSurface: procedureData.toothSurface ?? null,
      },
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") ?? undefined,
    })
  } catch (error) {
    // Audit failures should not break procedure operations
    console.error("[audit] Failed to log procedure deletion:", error)
  }
}

