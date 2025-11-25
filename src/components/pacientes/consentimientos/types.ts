/**
 * Enhanced TypeScript types for consent form handling
 * Supports both adult and minor consent workflows with proper validation
 */

export type ConsentType = 
  | "CONSENTIMIENTO_MENOR_ATENCION"
  | "TRATAMIENTO_ESPECIFICO"
  | "ANESTESIA"
  | "CIRUGIA"
  | "RADIOGRAFIA"
  | "DATOS_PERSONALES"
  | "OTRO"

export interface PatientInfo {
  id: number
  personaId: number
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  documento?: {
    tipo: string
    numero: string
  }
}

export interface ResponsibleParty {
  id: number
  nombre: string
  tipoVinculo: string
  autoridadLegal?: boolean
  isPatientSelf?: boolean
}

export interface ConsentFormData {
  responsablePersonaId: number
  tipo: ConsentType
  firmadoEn: string // ISO date string
  citaId?: number | null
  observaciones?: string
  file: File
}

export interface ConsentValidationResult {
  isValid: boolean
  errors: {
    responsablePersonaId?: string
    firmadoEn?: string
    file?: string
    citaId?: string
    general?: string
  }
  warnings?: string[]
}

export interface ConsentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: number
  patientInfo?: PatientInfo
  citaId?: number
  consentType?: ConsentType
  onSuccess: () => void
}

export interface ConsentWorkflowState {
  isMinor: boolean
  requiresGuardian: boolean
  canSelfSign: boolean
  responsibleParty: ResponsibleParty | null
  validationResult: ConsentValidationResult | null
}

/**
 * Calculate patient age from birth date
 */
export function calculateAge(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null
  
  const today = new Date()
  const birthDate = new Date(fechaNacimiento)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age
}

/**
 * Determine if patient is a minor (under 18)
 */
export function isMinor(fechaNacimiento: string | null): boolean {
  const age = calculateAge(fechaNacimiento)
  return age !== null && age < 18
}

/**
 * Determine consent workflow requirements based on patient age and consent type
 */
export function getConsentWorkflow(
  patientInfo: PatientInfo, 
  consentType: ConsentType
): Pick<ConsentWorkflowState, 'isMinor' | 'requiresGuardian' | 'canSelfSign'> {
  const patientIsMinor = isMinor(patientInfo.fechaNacimiento)
  
  if (consentType === "CIRUGIA") {
    // Surgery consents: adults sign themselves, minors need guardian
    return {
      isMinor: patientIsMinor,
      requiresGuardian: patientIsMinor,
      canSelfSign: !patientIsMinor
    }
  } else if (consentType === "CONSENTIMIENTO_MENOR_ATENCION") {
    // Minor attention consents: always require guardian for minors
    return {
      isMinor: patientIsMinor,
      requiresGuardian: patientIsMinor,
      canSelfSign: false
    }
  } else {
    // Other consent types: follow standard rules
    return {
      isMinor: patientIsMinor,
      requiresGuardian: patientIsMinor,
      canSelfSign: !patientIsMinor
    }
  }
}

/**
 * Validate signature date
 */
export function validateSignatureDate(dateString: string): string | null {
  const date = new Date(dateString)
  const today = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(today.getFullYear() - 1)
  const oneWeekFromNow = new Date()
  oneWeekFromNow.setDate(today.getDate() + 7)
  
  if (isNaN(date.getTime())) {
    return "Fecha de firma inválida"
  }
  
  if (date < oneYearAgo) {
    return "La fecha de firma no puede ser anterior a un año"
  }
  
  if (date > oneWeekFromNow) {
    return "La fecha de firma no puede ser más de una semana en el futuro"
  }
  
  return null
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Get today's date in YYYY-MM-DD format for date input
 */
export function getTodayDateString(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}
