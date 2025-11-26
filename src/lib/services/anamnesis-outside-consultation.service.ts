// Service for handling anamnesis edits outside consultation

import { prisma } from "@/lib/prisma"
import type {
  AnamnesisEditContext,
  InformationSource,
  FieldEditMetadata,
} from "@/types/anamnesis-outside-consultation"
import { createAnamnesisAuditLog } from "./anamnesis-audit-complete.service"
import { updateAnamnesisStatus } from "./anamnesis-status.service"
import type { AnamnesisState } from "./anamnesis-audit-complete.service"

/**
 * Determine if a field is critical
 */
export function isCriticalField(fieldPath: string): boolean {
  const criticalFields = [
    "tieneAlergias",
    "allergies",
    "embarazada",
    "payload.womenSpecific.embarazada",
    "tieneMedicacionActual",
    "medications",
    "tieneEnfermedadesCronicas",
    "antecedents",
    "motivoConsulta",
    "dolorIntensidad",
    "urgenciaPercibida",
  ]

  return criticalFields.some((field) => fieldPath.includes(field))
}

/**
 * Determine if a field change requires review
 */
export function requiresReview(fieldPath: string, changeType: "ADDED" | "REMOVED" | "MODIFIED"): boolean {
  // All critical field changes require review
  if (isCriticalField(fieldPath)) {
    return true
  }

  // Adding/removing allergies always requires review
  if (fieldPath.includes("allergies") && (changeType === "ADDED" || changeType === "REMOVED")) {
    return true
  }

  // Adding/removing medications requires review
  if (fieldPath.includes("medications") && (changeType === "ADDED" || changeType === "REMOVED")) {
    return true
  }

  // Adding/removing medical conditions requires review
  if (fieldPath.includes("antecedents") && (changeType === "ADDED" || changeType === "REMOVED")) {
    return true
  }

  // Pregnancy status change requires review
  if (fieldPath.includes("embarazada") && changeType === "MODIFIED") {
    return true
  }

  return false
}

/**
 * Get field edit metadata
 */
export function getFieldEditMetadata(
  fieldPath: string,
  changeType: "ADDED" | "REMOVED" | "MODIFIED"
): FieldEditMetadata {
  const isCritical = isCriticalField(fieldPath)
  const needsReview = requiresReview(fieldPath, changeType)

  return {
    fieldPath,
    fieldLabel: getFieldLabel(fieldPath),
    isCritical,
    requiresReview: needsReview,
    reviewReason: needsReview ? "Critical field change requires dentist review" : undefined,
  }
}

/**
 * Get human-readable field label
 */
function getFieldLabel(fieldPath: string): string {
  const labels: Record<string, string> = {
    motivoConsulta: "Motivo de Consulta",
    tieneDolorActual: "Dolor Actual",
    dolorIntensidad: "Intensidad del Dolor",
    urgenciaPercibida: "Urgencia Percibida",
    tieneEnfermedadesCronicas: "Enfermedades Crónicas",
    tieneAlergias: "Alergias",
    tieneMedicacionActual: "Medicación Actual",
    embarazada: "Embarazada",
    expuestoHumoTabaco: "Exposición a Humo de Tabaco",
    bruxismo: "Bruxismo",
    higieneCepilladosDia: "Cepillados por Día",
    usaHiloDental: "Usa Hilo Dental",
    ultimaVisitaDental: "Última Visita Dental",
    tieneHabitosSuccion: "Hábitos de Succión",
    lactanciaRegistrada: "Lactancia Registrada",
    allergies: "Alergias",
    medications: "Medicamentos",
    antecedents: "Antecedentes Médicos",
    "payload.womenSpecific.embarazada": "Embarazada",
    "payload.womenSpecific.semanasEmbarazo": "Semanas de Embarazo",
    "payload.womenSpecific.ultimaMenstruacion": "Última Menstruación",
    "payload.womenSpecific.planificacionFamiliar": "Planificación Familiar",
    "payload.pediatricSpecific.tieneHabitosSuccion": "Hábitos de Succión",
    "payload.pediatricSpecific.lactanciaRegistrada": "Lactancia Registrada",
    "payload.customNotes": "Notas Adicionales",
  }

  return labels[fieldPath] || fieldPath
}

/**
 * Create pending review record
 */
export async function createPendingReview(params: {
  anamnesisId: number
  pacienteId: number
  auditLogId: number
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  reason: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  createdByUserId: number
}): Promise<number> {
  const review = await prisma.anamnesisPendingReview.create({
    data: {
      anamnesisId: params.anamnesisId,
      pacienteId: params.pacienteId,
      auditLogId: params.auditLogId,
      fieldPath: params.fieldPath,
      fieldLabel: params.fieldLabel,
      oldValue: params.oldValue as any,
      newValue: params.newValue as any,
      reason: params.reason,
      severity: params.severity,
      createdByUserId: params.createdByUserId,
    },
  })

  // Update anamnesis pending review flags
  await prisma.patientAnamnesis.update({
    where: { idPatientAnamnesis: params.anamnesisId },
    data: {
      hasPendingReviews: true,
      pendingReviewSince: new Date(),
      pendingReviewReason: params.reason,
      status: "PENDING_REVIEW",
    },
  })

  return review.idAnamnesisPendingReview
}

/**
 * Process anamnesis edit outside consultation
 */
export async function processOutsideConsultationEdit(params: {
  anamnesisId: number
  pacienteId: number
  previousState: AnamnesisState | null
  newState: AnamnesisState
  actorId: number
  actorRole: string
  context: AnamnesisEditContext
  headers: Headers
  requestPath: string
}): Promise<{ auditLogId: number; pendingReviewIds: number[] }> {
  const { calculateAnamnesisDiff, determineChangeSeverity } = await import(
    "./anamnesis-audit-complete.service"
  )

  // Calculate field diffs
  const fieldDiffs = calculateAnamnesisDiff(params.previousState, params.newState)

  // Determine severity
  const severity = determineChangeSeverity(fieldDiffs, "UPDATE")

  // Create audit log with outside consultation context
  const auditLogId = await createAnamnesisAuditLog(
    {
      anamnesisId: params.anamnesisId,
      pacienteId: params.pacienteId,
      action: "UPDATE",
      actorId: params.actorId,
      actorRole: params.actorRole as "ADMIN" | "ODONT" | "RECEP",
      previousState: params.previousState,
      newState: params.newState,
      reason: params.context.reason,
      consultaId: null, // No consulta for outside consultation edits
      headers: params.headers,
      path: params.requestPath,
    },
    undefined // No transaction, will handle separately
  )

  // Update audit log with outside consultation metadata
  await prisma.anamnesisAuditLog.update({
    where: { idAnamnesisAuditLog: auditLogId },
    data: {
      isOutsideConsultation: true,
      informationSource: params.context.informationSource || null,
      verifiedWithPatient: params.context.verifiedWithPatient || null,
      requiresReview: params.context.requiresReview ?? false,
    },
  })

  // Create pending reviews for fields that require review
  const pendingReviewIds: number[] = []
  for (const diff of fieldDiffs) {
    if (requiresReview(diff.fieldPath, diff.changeType as "ADDED" | "REMOVED" | "MODIFIED")) {
      const reviewId = await createPendingReview({
        anamnesisId: params.anamnesisId,
        pacienteId: params.pacienteId,
        auditLogId,
        fieldPath: diff.fieldPath,
        fieldLabel: diff.fieldLabel,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
        reason: params.context.reason || "Field change requires review",
        severity: diff.isCritical ? "CRITICAL" : severity,
        createdByUserId: params.actorId,
      })
      pendingReviewIds.push(reviewId)
    }
  }

  // Update anamnesis status
  await updateAnamnesisStatus(params.anamnesisId)

  return { auditLogId, pendingReviewIds }
}

