// src/lib/utils/audit-entity-urls.ts
/**
 * Helper functions to generate URLs for entity navigation from audit logs
 */

import { ENTITY_LABELS } from "@/lib/types/audit"

export function getEntityUrl(entity: string, entityId: number): string | null {
  switch (entity) {
    case "Patient":
      return `/pacientes/${entityId}`
    case "Appointment":
    case "Cita":
      return `/agenda/citas/${entityId}`
    case "Consulta":
      return `/agenda/citas/${entityId}/consulta`
    case "User":
    case "Usuario":
      return `/configuracion/usuarios/${entityId}`
    case "OdontogramSnapshot":
      return `/pacientes/${entityId}/odontograma`
    case "TreatmentPlan":
      return `/pacientes/${entityId}/plan-tratamiento`
    case "TreatmentStep":
      // Treatment steps are part of a plan, need to find the plan first
      // For now, return null - could be enhanced to fetch plan ID
      return null
    case "Diagnosis":
    case "PatientDiagnosis":
      return `/pacientes/${entityId}/diagnosticos`
    case "Medication":
    case "PatientMedication":
      return `/pacientes/${entityId}/medicaciones`
    case "Allergy":
    case "PatientAllergy":
      return `/pacientes/${entityId}/alergias`
    default:
      return null
  }
}

export function getEntityLabel(entity: string): string {
  // Use ENTITY_LABELS from types as base, with additional fallbacks
  if (ENTITY_LABELS[entity]) {
    return ENTITY_LABELS[entity]
  }
  
  // Additional mappings for aliases and variations
  const additionalLabels: Record<string, string> = {
    Cita: "Cita", // Alias for Appointment
    Usuario: "Usuario", // Alias for User
    PatientDiagnosis: "Diagnóstico", // Alias for Diagnosis
    PatientMedication: "Medicación", // Alias for Medication
    PatientAllergy: "Alergia", // Alias for Allergy
  }
  
  return additionalLabels[entity] || entity
}

