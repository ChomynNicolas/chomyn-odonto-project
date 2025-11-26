// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/utils/outside-consultation-validation.ts
// Validation utilities for outside-consultation anamnesis edits

import { z } from "zod"
import type { FieldChange, ChangeSeverity } from "../components/ChangeSummaryItem"

/**
 * Schema for edit context when saving anamnesis outside consultation
 */
export const EditContextSchema = z.object({
  reason: z.string().max(1000).optional(),
  informationSource: z.enum([
    "IN_PERSON",
    "PHONE",
    "EMAIL",
    "DOCUMENT",
    "PATIENT_PORTAL",
    "OTHER",
  ]),
  verifiedWithPatient: z.boolean(),
})

export type EditContext = z.infer<typeof EditContextSchema>

/**
 * Validation result for outside consultation edits
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requiresReason: boolean
  requiresVerification: boolean
}

/**
 * Fields that are considered critical and require additional validation
 */
export const CRITICAL_FIELDS = [
  "tieneAlergias",
  "allergies",
  "tieneMedicacionActual",
  "medications",
]

/**
 * Fields that are considered medium severity and may show warnings
 */
export const MEDIUM_SEVERITY_FIELDS = [
  "tieneEnfermedadesCronicas",
  "antecedents",
  "womenSpecific.embarazada",
  "womenSpecific.semanasEmbarazo",
]

/**
 * Check if a change affects critical fields
 */
export function isCriticalChange(change: FieldChange): boolean {
  return CRITICAL_FIELDS.includes(change.fieldPath) || change.severity === "critical"
}

/**
 * Check if a change affects medium severity fields
 */
export function isMediumSeverityChange(change: FieldChange): boolean {
  return MEDIUM_SEVERITY_FIELDS.includes(change.fieldPath) || change.severity === "medium"
}

/**
 * Validate edit context for outside consultation changes
 */
export function validateEditContext(
  context: EditContext,
  changes: FieldChange[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for critical changes
  const hasCriticalChanges = changes.some(isCriticalChange)
  const hasMediumChanges = changes.some(isMediumSeverityChange)

  // Require reason for critical changes
  const requiresReason = hasCriticalChanges
  if (requiresReason && (!context.reason || context.reason.trim().length === 0)) {
    errors.push(
      "Se requiere una razón para los cambios en campos críticos (alergias, medicaciones)"
    )
  }

  // Recommend verification for medium severity changes
  const requiresVerification = hasCriticalChanges || hasMediumChanges
  if (requiresVerification && !context.verifiedWithPatient) {
    warnings.push(
      "Se recomienda verificar los cambios directamente con el paciente para campos sensibles"
    )
  }

  // Validate information source
  if (!context.informationSource) {
    errors.push("Debe seleccionar la fuente de información")
  }

  // Additional warning for critical changes not verified
  if (hasCriticalChanges && !context.verifiedWithPatient) {
    warnings.push(
      "Los cambios críticos sin verificación serán marcados para revisión obligatoria"
    )
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    requiresReason,
    requiresVerification,
  }
}

/**
 * Get severity statistics from changes
 */
export function getChangeSeverityStats(changes: FieldChange[]): {
  total: number
  critical: number
  medium: number
  low: number
  hasCritical: boolean
  hasMedium: boolean
} {
  const stats = {
    total: changes.length,
    critical: 0,
    medium: 0,
    low: 0,
    hasCritical: false,
    hasMedium: false,
  }

  for (const change of changes) {
    switch (change.severity) {
      case "critical":
        stats.critical++
        stats.hasCritical = true
        break
      case "medium":
        stats.medium++
        stats.hasMedium = true
        break
      case "low":
        stats.low++
        break
    }
  }

  return stats
}

/**
 * Format change summary for audit log
 */
export function formatChangesSummaryForAudit(changes: FieldChange[]): string {
  if (changes.length === 0) return "Sin cambios"

  const sections: Record<string, string[]> = {}

  for (const change of changes) {
    if (!sections[change.section]) {
      sections[change.section] = []
    }
    sections[change.section].push(
      `${change.fieldLabel}: ${change.changeType} (${change.severity})`
    )
  }

  return Object.entries(sections)
    .map(([section, items]) => `[${section}] ${items.join(", ")}`)
    .join("; ")
}

/**
 * Get validation message for a specific severity level
 */
export function getSeverityMessage(severity: ChangeSeverity): string {
  switch (severity) {
    case "critical":
      return "Este campo es crítico para la seguridad del paciente. Los cambios requieren justificación."
    case "medium":
      return "Este campo es importante para el historial clínico. Se recomienda verificar con el paciente."
    case "low":
      return "Este campo es informativo. Los cambios se registran normalmente."
    default:
      return ""
  }
}

/**
 * Get field-level validation requirements
 */
export function getFieldValidationRequirements(fieldPath: string): {
  requiresReason: boolean
  requiresVerification: boolean
  severityLevel: ChangeSeverity
  message: string
} {
  if (CRITICAL_FIELDS.includes(fieldPath)) {
    return {
      requiresReason: true,
      requiresVerification: true,
      severityLevel: "critical",
      message: "Cambios en este campo requieren justificación obligatoria",
    }
  }

  if (MEDIUM_SEVERITY_FIELDS.includes(fieldPath)) {
    return {
      requiresReason: false,
      requiresVerification: true,
      severityLevel: "medium",
      message: "Se recomienda verificar estos cambios con el paciente",
    }
  }

  return {
    requiresReason: false,
    requiresVerification: false,
    severityLevel: "low",
    message: "",
  }
}

