// Types for anamnesis editing outside consultation

export type AnamnesisStatus = "VALID" | "EXPIRED" | "PENDING_REVIEW" | "NO_ANAMNESIS"

export type InformationSource = "IN_PERSON" | "PHONE" | "EMAIL" | "DOCUMENT" | "PATIENT_PORTAL" | "OTHER"

export type AnamnesisChangeSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

export interface AnamnesisPendingReview {
  idAnamnesisPendingReview: number
  anamnesisId: number
  pacienteId: number
  auditLogId: number
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  reason: string
  severity: AnamnesisChangeSeverity
  createdByUserId: number
  createdAt: string
  reviewedAt: string | null
  reviewedByUserId: number | null
  reviewNotes: string | null
  isApproved: boolean | null
}

export interface AnamnesisEditContext {
  isOutsideConsultation: boolean
  informationSource?: InformationSource
  verifiedWithPatient?: boolean
  reason?: string
  requiresReview?: boolean
}

export interface FieldEditMetadata {
  fieldPath: string
  fieldLabel: string
  isCritical: boolean
  requiresReview: boolean
  reviewReason?: string
}

export interface AnamnesisStatusInfo {
  status: AnamnesisStatus
  lastVerifiedAt: string | null
  lastVerifiedBy: {
    id: number
    nombreApellido: string
  } | null
  hasPendingReviews: boolean
  pendingReviewSince: string | null
  pendingReviewReason: string | null
}

