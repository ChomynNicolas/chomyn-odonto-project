import { isMinorAt } from "@/lib/utils/consent-helpers"
import { prisma } from "@/lib/prisma"

/**
 * Resumen del consentimiento informado vigente para un paciente menor.
 * 
 * @remarks
 * Este objeto se incluye en CitaConsentimientoStatus cuando hay un consentimiento vigente.
 * Contiene información sobre quién firmó el consentimiento y hasta cuándo es válido.
 */
export interface ConsentimientoResumen {
  firmadoEn: string // ISO string (serializado)
  vigenteHasta: string // ISO string (serializado)
  responsableNombre: string
  responsableTipoVinculo: string
}

/**
 * Estado del consentimiento informado para una cita específica.
 * 
 * @remarks
 * Este objeto se calcula en el backend cada vez que se solicita el detalle de una cita.
 * Determina si un paciente menor de edad tiene el consentimiento necesario para iniciar la consulta.
 * 
 * Flujo de estados:
 * 1. Si el paciente es mayor de edad:
 *    - esMenorAlInicio = false
 *    - requiereConsentimiento = false
 *    - consentimientoVigente = true (no requiere)
 *    - bloqueaInicio = false
 * 
 * 2. Si el paciente es menor sin consentimiento:
 *    - esMenorAlInicio = true
 *    - requiereConsentimiento = true
 *    - consentimientoVigente = false
 *    - bloqueaInicio = true
 *    - mensajeBloqueo = mensaje explicativo
 * 
 * 3. Si el paciente es menor con consentimiento vigente:
 *    - esMenorAlInicio = true
 *    - requiereConsentimiento = true
 *    - consentimientoVigente = true
 *    - bloqueaInicio = false
 *    - consentimientoResumen = detalles del consentimiento
 * 
 * @see getCitaConsentimientoStatus para la lógica de cálculo
 */
export interface CitaConsentimientoStatus {
  esMenorAlInicio: boolean
  requiereConsentimiento: boolean
  consentimientoVigente: boolean
  consentimientoResumen?: ConsentimientoResumen
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
              tipo: "CONSENTIMIENTO_MENOR_ATENCION",
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
      bloqueaInicio: true,
      mensajeBloqueo:
        "Falta fecha de nacimiento del paciente. Complete esta información antes de iniciar la consulta.",
    }
  }

  const esMenor = isMinorAt(fechaNacimiento, cita.inicio)

  // Si es mayor de edad, no requiere consentimiento
  if (esMenor === false) {
    return {
      esMenorAlInicio: false,
      requiereConsentimiento: false,
      consentimientoVigente: true,
      bloqueaInicio: false,
    }
  }

  // Es menor de edad: verificar consentimiento vigente a la fecha/hora de la cita
  const consentimientoVigente = cita.paciente.consentimientos.find(
    (c) => c.vigente_hasta >= cita.inicio, // <- NO "vigenteHasta"
  )

  if (consentimientoVigente) {
    const resp = consentimientoVigente.responsable
    const responsableNombre = resp ? `${resp.nombres ?? ""} ${resp.apellidos ?? ""}`.trim() : "Responsable"

    return {
      esMenorAlInicio: true,
      requiereConsentimiento: true,
      consentimientoVigente: true,
      consentimientoResumen: {
        firmadoEn: consentimientoVigente.firmado_en.toISOString(),   // Convertir a ISO string
        vigenteHasta: consentimientoVigente.vigente_hasta.toISOString(), // Convertir a ISO string
        responsableNombre,
        // Si querés el vínculo real, podés consultar PacienteResponsable por (pacienteId, personaId)
        responsableTipoVinculo: "RESPONSABLE",
      },
      bloqueaInicio: false,
    }
  }

  // No hay consentimiento vigente
  return {
    esMenorAlInicio: true,
    requiereConsentimiento: true,
    consentimientoVigente: false,
    bloqueaInicio: true,
    mensajeBloqueo:
      "El paciente es menor de edad y no tiene un consentimiento informado vigente. Debe subir un consentimiento firmado por su responsable antes de iniciar la consulta.",
  }
}
