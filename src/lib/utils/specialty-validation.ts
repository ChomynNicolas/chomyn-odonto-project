// ============================================================================
// SPECIALTY VALIDATION UTILITY
// ============================================================================
// Shared module for validating appointment types against professional specialties

import type { TipoCita } from "@prisma/client";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Mapping from TipoCita to required Especialidad names
 * 
 * Rules:
 * - CONSULTA, LIMPIEZA, CONTROL, URGENCIA, OTRO: Can be handled by "Odontología General"
 * - ENDODONCIA: Requires "Endodoncia"
 * - ORTODONCIA: Requires "Ortodoncia"
 * - EXTRACCION: Usually "Odontología General", but can be specialized
 */
export const TIPO_CITA_TO_ESPECIALIDADES: Record<TipoCita, string[]> = {
  CONSULTA: ["Odontología General"],
  LIMPIEZA: ["Odontología General"],
  ENDODONCIA: ["Endodoncia"],
  EXTRACCION: ["Odontología General"], // Can be handled by general dentists
  URGENCIA: ["Odontología General"], // Any professional can handle emergencies
  ORTODONCIA: ["Ortodoncia"],
  CONTROL: ["Odontología General"],
  OTRO: [], // No restriction - any specialty can handle "OTRO"
};

/**
 * Result of specialty validation
 */
export interface SpecialtyValidationResult {
  isValid: boolean;
  error?: {
    code: "INCOMPATIBLE_SPECIALTY" | "PROFESSIONAL_HAS_NO_SPECIALTIES";
    message: string;
    details?: {
      tipoCita: TipoCita;
      requiredEspecialidades: string[];
      profesionalEspecialidades: string[];
    };
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates that a professional's specialties are compatible with the appointment type
 * 
 * @param tipoCita - Type of appointment
 * @param profesionalEspecialidades - Array of specialty names the professional has
 * @returns Validation result with error details if invalid
 */
export function validateSpecialtyCompatibility(
  tipoCita: TipoCita,
  profesionalEspecialidades: string[]
): SpecialtyValidationResult {
  // Get required specialties for this appointment type
  const requiredEspecialidades = TIPO_CITA_TO_ESPECIALIDADES[tipoCita] ?? [];

  // If no restrictions (e.g., "OTRO"), always valid
  if (requiredEspecialidades.length === 0) {
    return { isValid: true };
  }

  // If professional has no specialties, invalid
  if (profesionalEspecialidades.length === 0) {
    return {
      isValid: false,
      error: {
        code: "PROFESSIONAL_HAS_NO_SPECIALTIES",
        message: `El profesional no tiene especialidades registradas. Se requiere al menos una de: ${requiredEspecialidades.join(", ")}`,
        details: {
          tipoCita,
          requiredEspecialidades,
          profesionalEspecialidades: [],
        },
      },
    };
  }

  // Check if professional has at least one compatible specialty
  const hasCompatibleSpecialty = requiredEspecialidades.some((reqEsp) =>
    profesionalEspecialidades.includes(reqEsp)
  );

  if (!hasCompatibleSpecialty) {
    return {
      isValid: false,
      error: {
        code: "INCOMPATIBLE_SPECIALTY",
        message: `El profesional no tiene la especialidad requerida para este tipo de cita. Se requiere: ${requiredEspecialidades.join(" o ")}`,
        details: {
          tipoCita,
          requiredEspecialidades,
          profesionalEspecialidades,
        },
      },
    };
  }

  return { isValid: true };
}

/**
 * Gets human-readable specialty names for display
 */
export function getSpecialtyDisplayNames(especialidades: string[]): string {
  if (especialidades.length === 0) return "Sin especialidades";
  if (especialidades.length === 1) return especialidades[0];
  return especialidades.join(", ");
}

/**
 * Checks if a professional can handle a specific appointment type
 * (Helper function for UI components)
 */
export function canHandleAppointmentType(
  tipoCita: TipoCita,
  profesionalEspecialidades: string[]
): boolean {
  return validateSpecialtyCompatibility(tipoCita, profesionalEspecialidades).isValid;
}

