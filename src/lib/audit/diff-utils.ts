// Utility functions for detecting and formatting patient field changes

import { CRITICAL_FIELDS, type CriticalField, type PatientChangeRecord } from "@/types/patient-edit.types"

/**
 * Normalizes a value for comparison purposes
 * Returns string or null for consistent comparison
 */
export function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed === "" ? null : trimmed
  }

  // For other types, convert to string
  return String(value)
}

/**
 * Formats a value for display in UI
 * Returns a human-readable string representation
 */
export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "(vacío)"
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("es-PY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  if (typeof value === "string") {
    // If it's an ISO date string, format it
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
    if (dateMatch) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString("es-PY", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
        }
      } catch {
        // If parsing fails, return the string as-is
      }
    }
    return value
  }

  return String(value)
}

/**
 * Detects changes between original and updated patient data
 * Returns an array of PatientChangeRecord with normalized values
 */
export function detectChanges<T extends Record<string, unknown>>(
  original: T,
  updated: Partial<T>
): PatientChangeRecord[] {
  const changes: PatientChangeRecord[] = []

  for (const key in updated) {
    if (Object.prototype.hasOwnProperty.call(updated, key)) {
      const originalValue = original[key]
      const updatedValue = updated[key]

      const normalizedOriginal = normalizeValue(originalValue)
      const normalizedUpdated = normalizeValue(updatedValue)

      // Only record change if values are different
      if (normalizedOriginal !== normalizedUpdated) {
        const isCritical = CRITICAL_FIELDS.includes(key as CriticalField)
        changes.push({
          field: key,
          oldValue: originalValue as string | Date | null,
          newValue: updatedValue as string | Date | null,
          isCritical,
        })
      }
    }
  }

  return changes
}

/**
 * Checks if any of the changes are critical
 */
export function hasCriticalChanges(changes: PatientChangeRecord[]): boolean {
  return changes.some((change) => change.isCritical)
}

/**
 * Filters changes to return only critical ones
 */
export function getCriticalChanges(changes: PatientChangeRecord[]): PatientChangeRecord[] {
  return changes.filter((change) => change.isCritical)
}

/**
 * Formats changes for display in UI
 * Returns a formatted string showing "Label: oldValue → newValue"
 */
export function formatChangesForDisplay(changes: PatientChangeRecord[]): string {
  return changes
    .map((change) => {
      const label = getFieldLabel(change.field)
      const oldValue = formatDisplayValue(change.oldValue)
      const newValue = formatDisplayValue(change.newValue)
      return `${label}: ${oldValue} → ${newValue}`
    })
    .join("\n")
}

/**
 * Maps technical field names to user-friendly labels in Spanish
 */
export function getFieldLabel(field: string): string {
  const labelMap: Record<string, string> = {
    firstName: "Nombre",
    lastName: "Apellido",
    secondLastName: "Segundo Apellido",
    documentNumber: "Número de Documento",
    documentType: "Tipo de Documento",
    documentCountry: "País de Emisión",
    dateOfBirth: "Fecha de Nacimiento",
    gender: "Género",
    email: "Email",
    phone: "Teléfono",
    address: "Dirección",
    city: "Ciudad",
    country: "País",
    ruc: "RUC",
    insurance: "Seguro/Obra Social",
    emergencyContactName: "Nombre de Contacto de Emergencia",
    emergencyContactPhone: "Teléfono de Contacto de Emergencia",
    emergencyContactRelation: "Relación de Contacto de Emergencia",
    status: "Estado",
    documentIssueDate: "Fecha de Emisión del Documento",
    documentExpiryDate: "Fecha de Vencimiento del Documento",
  }

  return labelMap[field] || field
}
