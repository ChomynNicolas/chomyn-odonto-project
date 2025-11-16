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

export function esVigente(vigenteHasta: Date): boolean {
  return new Date() <= vigenteHasta
}

export function nombreCompleto(p?: { nombres: string | null; apellidos: string | null }) {
  return [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim()
}
