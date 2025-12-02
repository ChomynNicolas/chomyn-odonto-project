import { isMinorAt } from "@/lib/utils/consent-helpers"
import { prisma } from "@/lib/prisma"
import { validateSurgeryConsent } from "@/lib/services/surgery-consent-validator"

/**
 * Resumen del consentimiento informado vigente para un paciente menor o cirugía.
 * 
 * @remarks
 * Este objeto se incluye en CitaConsentimientoStatus cuando hay un consentimiento vigente.
 * Contiene información sobre quién firmó el consentimiento y a qué cita está asociado.
 */
export interface ConsentimientoResumen {
  firmadoEn: string // ISO string (serializado)
  vigenteHasta: string // ISO string (serializado) - Solo para consentimientos de menor con validez temporal
  responsableNombre: string
  responsableTipoVinculo: string
  citaId?: number | null // ID de la cita asociada (si aplica)
  esEspecificoPorCita?: boolean // true si el consentimiento es válido solo para esta cita específica
}

/**
 * Estado del consentimiento informado para una cita específica.
 * 
 * @remarks
 * Este objeto se calcula en el backend cada vez que se solicita el detalle de una cita.
 * Determina si un paciente necesita consentimiento para iniciar la consulta, considerando:
 * - Consentimiento de menor (si es menor de edad)
 * - Consentimiento de cirugía (si hay procedimientos quirúrgicos)
 * 
 * Flujo de estados:
 * 1. Paciente mayor sin cirugía:
 *    - esMenorAlInicio = false, requiereCirugia = false
 *    - requiereConsentimiento = false, consentimientoVigente = true
 *    - bloqueaInicio = false
 * 
 * 2. Paciente menor sin consentimiento:
 *    - esMenorAlInicio = true, requiereConsentimiento = true
 *    - consentimientoVigente = false, bloqueaInicio = true
 * 
 * 3. Paciente con cirugía sin consentimiento quirúrgico:
 *    - requiereCirugia = true, cirugiaConsentimientoVigente = false
 *    - bloqueaInicio = true, mensajeBloqueo = mensaje explicativo
 * 
 * @see getCitaConsentimientoStatus para la lógica de cálculo
 */
export interface CitaConsentimientoStatus {
  // Consentimiento de menor
  esMenorAlInicio: boolean
  requiereConsentimiento: boolean
  consentimientoVigente: boolean
  consentimientoResumen?: ConsentimientoResumen
  
  // Consentimiento de cirugía
  requiereCirugia: boolean
  cirugiaConsentimientoVigente: boolean
  cirugiaConsentimientoResumen?: ConsentimientoResumen
  responsableParaId?: number
  
  // Estado general
  bloqueaInicio: boolean
  mensajeBloqueo?: string
}

/**
 * Calcula el estado del consentimiento informado para una cita específica.
 * 
 * @param citaId - ID de la cita
 * @returns Promise con el estado del consentimiento
 * 
 * @remarks
 * Esta función:
 * 1. Obtiene la cita con el paciente y sus consentimientos
 * 2. Verifica si el paciente es menor de edad al momento de la cita
 * 3. Si es menor, verifica si hay un consentimiento vigente
 * 4. Retorna el estado completo del consentimiento
 * 
 * El consentimiento se considera vigente si:
 * - Está activo (activo = true)
 * - Es del tipo CONSENTIMIENTO_MENOR_ATENCION
 * - Su fecha de vigencia (vigente_hasta) es >= fecha de inicio de la cita
 * 
 * Esta función se llama cada vez que se solicita el detalle de una cita,
 * por lo que siempre refleja el estado actualizado del consentimiento.
 * 
 * @throws Error si la cita no existe
 */
export async function getCitaConsentimientoStatus(citaId: number): Promise<CitaConsentimientoStatus> {
  // ⬇⬇⬇  NOMBRES DE RELACIÓN CORRECTOS SEGÚN TU SCHEMA  ⬇⬇⬇
  const cita = await prisma.cita.findUnique({
    where: { idCita: citaId },
    include: {
      paciente: {
        include: {
          persona: true,
          consentimientos: {
            where: {
              activo: true,
            },
            include: {
              responsable: true, // <- NO "PersonaResponsable"
            },
            orderBy: {
              vigente_hasta: "desc", // <- NO "vigenteHasta"
            },
          },
        },
      },
    },
  })

  if (!cita) {
    throw new Error("Cita no encontrada")
  }

  const persona = cita.paciente.persona
  const fechaNacimiento = persona?.fechaNacimiento ?? null // <- NO "fecha_nacimiento"

  // Si no hay fecha de nacimiento, bloquear por precaución
  if (!fechaNacimiento) {
    return {
      esMenorAlInicio: false,
      requiereConsentimiento: false,
      consentimientoVigente: false,
      requiereCirugia: false,
      cirugiaConsentimientoVigente: false,
      bloqueaInicio: true,
      mensajeBloqueo:
        "Falta fecha de nacimiento del paciente. Complete esta información antes de iniciar la consulta.",
    }
  }

  const esMenor = isMinorAt(fechaNacimiento, cita.inicio)

  // 1. Verificar consentimiento de menor (si aplica)
  const minorConsentStatus = {
    esMenorAlInicio: esMenor === true,
    requiereConsentimiento: esMenor === true,
    consentimientoVigente: esMenor !== true, // Si no es menor, no requiere consentimiento
    consentimientoResumen: undefined as ConsentimientoResumen | undefined
  }

  if (esMenor === true) {
    // Es menor de edad: verificar consentimiento vigente para ESTA cita específica
    // Solo se aceptan consentimientos específicos para esta cita (esEspecificoPorCita = true)
    const consentimientoMenor = cita.paciente.consentimientos.find(
      (c) => c.tipo === "CONSENTIMIENTO_MENOR_ATENCION" && 
             c.Cita_idCita === citaId
    )

    if (consentimientoMenor) {
      const resp = consentimientoMenor.responsable
      const responsableNombre = resp ? `${resp.nombres ?? ""} ${resp.apellidos ?? ""}`.trim() : "Responsable"

      minorConsentStatus.consentimientoVigente = true
      minorConsentStatus.consentimientoResumen = {
        firmadoEn: consentimientoMenor.firmado_en.toISOString(),
        vigenteHasta: consentimientoMenor.vigente_hasta.toISOString(),
        responsableNombre,
        responsableTipoVinculo: "RESPONSABLE",
        citaId: consentimientoMenor.Cita_idCita ?? null,
        esEspecificoPorCita: true, // Always per-appointment
      }
    } else {
      minorConsentStatus.consentimientoVigente = false
    }
  }

  // 2. Verificar consentimiento de cirugía
  const surgeryValidation = await validateSurgeryConsent(citaId, cita.pacienteId, cita.inicio)
  
  const surgeryConsentStatus = {
    requiereCirugia: surgeryValidation.requiresConsent,
    cirugiaConsentimientoVigente: surgeryValidation.isValid,
    cirugiaConsentimientoResumen: undefined as ConsentimientoResumen | undefined,
    responsableParaId: surgeryValidation.responsiblePartyId
  }

  if (surgeryValidation.requiresConsent && surgeryValidation.isValid && surgeryValidation.consentSummary) {
    surgeryConsentStatus.cirugiaConsentimientoResumen = {
      firmadoEn: surgeryValidation.consentSummary.firmadoEn.toISOString(),
      vigenteHasta: surgeryValidation.consentSummary.vigenteHasta.toISOString(),
      responsableNombre: surgeryValidation.consentSummary.responsableNombre,
      responsableTipoVinculo: surgeryValidation.patientIsMinor ? "RESPONSABLE" : "PACIENTE",
      citaId: surgeryValidation.consentSummary.citaId ?? null,
      esEspecificoPorCita: surgeryValidation.consentSummary.esEspecificoPorCita ?? true, // Surgery consents are always appointment-specific
    }
  }

  // 3. Determinar estado general
  const bloqueaInicio = 
    (minorConsentStatus.requiereConsentimiento && !minorConsentStatus.consentimientoVigente) ||
    (surgeryConsentStatus.requiereCirugia && !surgeryConsentStatus.cirugiaConsentimientoVigente)

  let mensajeBloqueo: string | undefined
  if (bloqueaInicio) {
    const mensajes: string[] = []
    if (minorConsentStatus.requiereConsentimiento && !minorConsentStatus.consentimientoVigente) {
      mensajes.push("Se requiere consentimiento informado vigente para el menor")
    }
    if (surgeryConsentStatus.requiereCirugia && !surgeryConsentStatus.cirugiaConsentimientoVigente) {
      mensajes.push(surgeryValidation.errorMessage || "Se requiere consentimiento de cirugía")
    }
    mensajeBloqueo = mensajes.join(". ")
  }

  return {
    ...minorConsentStatus,
    ...surgeryConsentStatus,
    bloqueaInicio,
    mensajeBloqueo,
  }
}
