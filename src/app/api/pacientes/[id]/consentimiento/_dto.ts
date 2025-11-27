export type ConsentimientoDTO = {
  idConsentimiento: number
  pacienteId: number
  tipo: string
  firmadoEn: string
  vigenteHasta: string
  vigente: boolean
  activo: boolean
  version: number
  observaciones: string | null
  esEspecificoPorCita: boolean

  responsable: {
    idPersona: number
    nombreCompleto: string
    documento: { tipo: string; numero: string } | null
    relacion: string | null
  }

  cita: {
    idCita: number
    inicio: string
    tipo: string
    estado?: string
  } | null

  archivo: {
    publicId: string
    secureUrl: string
    format: string | null
    bytes: number
    thumbnailUrl: string | null
  }

  registro: {
    registradoEn: string
    registradoPor: {
      idUsuario: number
      nombre: string
    }
  }
}

export function calcularVigenteHasta(firmadoEn: Date, meses: number): Date {
  const vigenteHasta = new Date(firmadoEn)
  vigenteHasta.setMonth(vigenteHasta.getMonth() + meses)
  return vigenteHasta
}

/**
 * Determines if a consent is valid.
 * 
 * All consents are now per-appointment (esEspecificoPorCita=true):
 * - Valid only if linked to an appointment that is not cancelled/no-show
 * - If no citaId is provided, the consent is invalid (legacy consents are no longer supported)
 * 
 * @param _vigenteHasta - Deprecated: No longer used for validation
 * @param _esEspecificoPorCita - Deprecated: Always treated as true
 * @param citaId - Associated appointment ID (required for valid consent)
 * @param citaEstado - Status of the associated appointment
 */
export function esVigente(
  _vigenteHasta: Date,
  _esEspecificoPorCita: boolean,
  citaId?: number | null,
  citaEstado?: string | null
): boolean {
  // All consents must be per-appointment
  // A consent is valid only if:
  // 1. It's linked to a specific appointment (citaId exists)
  // 2. The appointment is not cancelled/no-show
  if (citaId) {
    return citaEstado !== "CANCELLED" && citaEstado !== "NO_SHOW"
  }
  // Legacy consents without citaId are no longer valid
  return false
}

export function nombreCompleto(p?: { nombres: string | null; apellidos: string | null }) {
  return [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim()
}
