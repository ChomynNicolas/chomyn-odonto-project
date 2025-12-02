// src/types/medications.ts

/**
 * Medication audit entry representing a single change event
 */
export interface MedicationAuditEntry {
  id: number
  action: "CREATED" | "UPDATED" | "DISCONTINUED"
  performedAt: string
  performedBy: {
    id: number
    nombre: string
  }
  consultaId: number | null
  changes?: {
    field: string
    oldValue: unknown
    newValue: unknown
  }[]
  notes?: string | null
}

/**
 * Complete medication history for a patient or medication
 */
export interface MedicationHistory {
  medicationId: number
  medicationLabel: string
  patientId: number
  events: MedicationAuditEntry[]
  createdAt: string
  createdBy: {
    id: number
    nombre: string
  }
  lastUpdatedAt: string | null
  lastUpdatedBy: {
    id: number
    nombre: string
  } | null
  discontinuedAt: string | null
  discontinuedBy: {
    id: number
    nombre: string
  } | null
}

/**
 * Medication form data for create/edit operations
 */
export interface MedicationFormData {
  medicationId?: number | null
  label: string
  dose: string
  freq: string
  route: string
  startAt: string
  endAt: string
}

