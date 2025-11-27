import { PrismaClient } from "@prisma/client"
import { differenceInYears } from "date-fns"

const prisma = new PrismaClient()

/**
 * Error thrown when surgery consent validation fails
 */
export class SurgeryConsentError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 422,
    public extra?: unknown
  ) {
    super(message)
    this.name = "SurgeryConsentError"
  }
}

/**
 * Result of surgery consent validation
 */
export interface SurgeryConsentValidationResult {
  isValid: boolean
  requiresConsent: boolean
  patientIsMinor: boolean
  responsiblePartyId?: number
  consentSummary?: {
    id: number
    tipo: string
    firmadoEn: Date
    vigenteHasta: Date
    responsableNombre: string
    citaId?: number | null
    esEspecificoPorCita?: boolean
  }
  errorMessage?: string
  errorCode?: string
}

/**
 * Check if a procedure requires surgery consent by checking if it's marked as surgical
 */
export async function isSurgicalProcedure(procedureId: number): Promise<boolean> {
  const procedure = await prisma.procedimientoCatalogo.findUnique({
    where: { idProcedimiento: procedureId },
    select: { esCirugia: true, activo: true }
  })
  
  return procedure?.activo === true && procedure?.esCirugia === true
}

/**
 * Check if any of the procedures in a consultation are surgical
 */
export async function hasSurgicalProcedures(citaId: number): Promise<boolean> {
  // First check if appointment type is surgical
  const cita = await prisma.cita.findUnique({
    where: { idCita: citaId },
    select: { tipo: true },
  })
  
  if (!cita) return false
  
  // Check if appointment type is surgical
  if (isSurgicalAppointmentType(cita.tipo)) {
    return true
  }
  
  // Also check if there are actual surgical procedures in the consultation
  const consulta = await prisma.consulta.findUnique({
    where: { citaId },
    include: {
      procedimientos: {
        include: {
          catalogo: {
            select: { esCirugia: true, activo: true }
          }
        }
      }
    }
  })
  
  if (!consulta) return false
  
  return consulta.procedimientos.some(proc => 
    proc.catalogo?.activo === true && proc.catalogo?.esCirugia === true
  )
}

// Helper function to determine if an appointment type is surgical
export function isSurgicalAppointmentType(tipo: string): boolean {
  const surgicalTypes = ["EXTRACCION"]
  return surgicalTypes.includes(tipo)
}

/**
 * Get the responsible party for surgery consent based on patient age
 * For adults (18+): patient is their own responsible party
 * For minors (<18): must have a linked responsible adult with legal authority
 */
export async function getResponsiblePartyForSurgery(
  pacienteId: number, 
  referenceDate: Date = new Date()
): Promise<{ responsiblePartyId: number; isMinor: boolean } | null> {
  const paciente = await prisma.paciente.findUnique({
    where: { idPaciente: pacienteId },
    include: { persona: true }
  })
  
  if (!paciente?.persona?.fechaNacimiento) {
    throw new SurgeryConsentError(
      "MISSING_DOB_FOR_SURGERY_CHECK",
      "No se puede determinar responsable para cirugía: falta fecha de nacimiento del paciente",
      400
    )
  }
  
  const age = differenceInYears(referenceDate, paciente.persona.fechaNacimiento)
  const isMinor = age < 18
  
  if (!isMinor) {
    // Adult patient is their own responsible party
    return {
      responsiblePartyId: paciente.persona.idPersona,
      isMinor: false
    }
  }
  
  // For minors, find a responsible adult with legal authority
  const responsable = await prisma.pacienteResponsable.findFirst({
    where: {
      pacienteId,
      autoridadLegal: true,
      OR: [
        { vigenteHasta: null },
        { vigenteHasta: { gte: referenceDate } }
      ]
    },
    include: {
      responsable: true
    }
  })
  
  if (!responsable) {
    throw new SurgeryConsentError(
      "NO_SURGICAL_RESPONSIBLE_PARTY",
      "No hay responsable con autoridad legal vigente para autorizar cirugía del menor",
      422,
      { pacienteId, isMinor: true }
    )
  }
  
  return {
    responsiblePartyId: responsable.responsablePersonaId,
    isMinor: true
  }
}

/**
 * Validate surgery consent for a specific appointment
 * Checks if surgical procedures require valid CIRUGIA consent
 */
export async function validateSurgeryConsent(
  citaId: number,
  pacienteId: number,
  inicio: Date
): Promise<SurgeryConsentValidationResult> {
  // First check if this appointment involves surgical procedures
  const requiresConsent = await hasSurgicalProcedures(citaId)
  
  if (!requiresConsent) {
    return {
      isValid: true,
      requiresConsent: false,
      patientIsMinor: false
    }
  }
  
  // Get responsible party information
  let responsibleParty: { responsiblePartyId: number; isMinor: boolean }
  try {
    const result = await getResponsiblePartyForSurgery(pacienteId, inicio)
    if (!result) {
      return {
        isValid: false,
        requiresConsent: true,
        patientIsMinor: false, // We don't know yet
        errorMessage: "No se pudo determinar el responsable para la cirugía",
        errorCode: "RESPONSIBLE_PARTY_ERROR"
      }
    }
    responsibleParty = result
  } catch (error) {
    if (error instanceof SurgeryConsentError) {
      return {
        isValid: false,
        requiresConsent: true,
        patientIsMinor: error.code === "NO_SURGICAL_RESPONSIBLE_PARTY",
        errorMessage: error.message,
        errorCode: error.code
      }
    }
    throw error
  }
  
  // Check for valid surgery consent - ONLY consent specifically for this appointment is valid
  // All surgery consents must be per-appointment (esEspecificoPorCita = true)
  const consentimiento = await prisma.consentimiento.findFirst({
    where: {
      Paciente_idPaciente: pacienteId,
      Persona_idPersona_responsable: responsibleParty.responsiblePartyId,
      tipo: "CIRUGIA",
      activo: true,
      Cita_idCita: citaId, // Only consent specifically for this appointment
    },
    include: {
      responsable: {
        select: {
          nombres: true,
          apellidos: true
        }
      }
    },
    orderBy: { vigente_hasta: "desc" }
  })
  
  if (!consentimiento) {
    const errorMessage = responsibleParty.isMinor
      ? "No hay consentimiento de cirugía vigente firmado por el responsable del menor"
      : "No hay consentimiento de cirugía vigente firmado por el paciente"
    
    return {
      isValid: false,
      requiresConsent: true,
      patientIsMinor: responsibleParty.isMinor,
      responsiblePartyId: responsibleParty.responsiblePartyId,
      errorMessage,
      errorCode: "MISSING_SURGERY_CONSENT"
    }
  }
  
  // Valid consent found
  return {
    isValid: true,
    requiresConsent: true,
    patientIsMinor: responsibleParty.isMinor,
    responsiblePartyId: responsibleParty.responsiblePartyId,
    consentSummary: {
      id: consentimiento.idConsentimiento,
      tipo: consentimiento.tipo,
      firmadoEn: consentimiento.firmado_en,
      vigenteHasta: consentimiento.vigente_hasta,
      responsableNombre: `${consentimiento.responsable.nombres} ${consentimiento.responsable.apellidos}`.trim(),
      citaId: consentimiento.Cita_idCita ?? null,
      esEspecificoPorCita: true // All consents are now per-appointment
    }
  }
}

/**
 * Validate surgery consent when creating a surgical procedure
 * This is a lighter check that only validates if the procedure requires consent
 */
export async function validateSurgeryConsentForProcedure(
  procedureId: number,
  pacienteId: number,
  referenceDate: Date = new Date()
): Promise<{ isValid: boolean; errorMessage?: string; errorCode?: string }> {
  // Check if procedure is surgical
  const isSurgical = await isSurgicalProcedure(procedureId)
  
  if (!isSurgical) {
    return { isValid: true }
  }
  
  // Get responsible party
  let responsibleParty: { responsiblePartyId: number; isMinor: boolean }
  try {
    const result = await getResponsiblePartyForSurgery(pacienteId, referenceDate)
    if (!result) {
      return {
        isValid: false,
        errorMessage: "No se pudo determinar el responsable para la cirugía",
        errorCode: "RESPONSIBLE_PARTY_ERROR"
      }
    }
    responsibleParty = result
  } catch (error) {
    if (error instanceof SurgeryConsentError) {
      return {
        isValid: false,
        errorMessage: error.message,
        errorCode: error.code
      }
    }
    throw error
  }
  
  // Check for valid surgery consent
  const consentimiento = await prisma.consentimiento.findFirst({
    where: {
      Paciente_idPaciente: pacienteId,
      Persona_idPersona_responsable: responsibleParty.responsiblePartyId,
      tipo: "CIRUGIA",
      activo: true,
      vigente_hasta: { gte: referenceDate }
    }
  })
  
  if (!consentimiento) {
    const errorMessage = responsibleParty.isMinor
      ? "Se requiere consentimiento de cirugía firmado por el responsable del menor antes de programar este procedimiento"
      : "Se requiere consentimiento de cirugía firmado por el paciente antes de programar este procedimiento"
    
    return {
      isValid: false,
      errorMessage,
      errorCode: "MISSING_SURGERY_CONSENT"
    }
  }
  
  return { isValid: true }
}
