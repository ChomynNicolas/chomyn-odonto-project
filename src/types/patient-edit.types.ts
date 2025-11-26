// TypeScript types for patient editing with critical changes tracking

/**
 * Critical fields that require additional confirmation when changed
 */
export const CRITICAL_FIELDS = ['firstName', 'lastName', 'documentNumber', 'dateOfBirth'] as const

export type CriticalField = typeof CRITICAL_FIELDS[number]

/**
 * Record of a single field change
 */
export interface PatientChangeRecord {
  field: string
  oldValue: string | Date | null
  newValue: string | Date | null
  isCritical: boolean
}

/**
 * Form data structure for editing a patient
 * Based on PatientUpdateBody schema
 */
export interface PatientEditFormData {
  firstName?: string
  lastName?: string
  secondLastName?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dateOfBirth?: string | null
  documentType?: 'CI' | 'PASSPORT' | 'RUC' | 'OTHER'
  documentNumber?: string
  documentCountry?: 'PY' | 'AR' | 'BR' | 'OTHER'
  documentIssueDate?: string | null
  documentExpiryDate?: string | null
  ruc?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: 'PY' | 'AR' | 'BR' | 'OTHER' | null
  insurance?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelation?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  updatedAt: string
}

/**
 * Payload sent to API for updating a patient
 */
export interface PatientUpdatePayload {
  data: PatientEditFormData
  changes: PatientChangeRecord[]
  motivoCambioCritico?: string
}

/**
 * Response from API after updating a patient
 */
export interface PatientUpdateResponse {
  success: boolean
  patient?: {
    id: number
    firstName: string
    lastName: string
    documentNumber?: string
  }
  auditLogId?: number
  error?: string
  criticalChanges?: PatientChangeRecord[]
}
