export type TipoDocumento = "CI" | "DNI" | "PASAPORTE" | "RUC" | "OTRO"

export interface PacienteItem {
  idPaciente: number
  persona: {
    idPersona: number
    nombres: string
    apellidos: string
    genero: string | null
    documento: {
      tipo: TipoDocumento
      numero: string
      ruc: string | null
    } | null
    contactos: Array<{
      tipo: "PHONE" | "EMAIL"
      valorNorm: string
      activo: boolean
      esPrincipal: boolean
    }>
  }
}

export interface PacientesQueryParams {
  q?: string
  soloActivos?: boolean
  limit?: number
  cursor?: number
}

export interface PacientesResponse {
  items: PacienteItem[]
  nextCursor: number | null
  hasMore: boolean
}

export interface CreatePacienteQuickDTO {
  nombreCompleto: string
  genero?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  tipoDocumento: TipoDocumento
  dni: string
  telefono: string
  email?: string
}

export interface CreatePacienteFullDTO extends CreatePacienteQuickDTO {
  ruc?: string
  domicilio?: string
  antecedentesMedicos?: string
  alergias?: string
  medicacion?: string
  responsablePago?: string
  obraSocial?: string
  preferenciasContacto?: {
    whatsapp?: boolean
    sms?: boolean
    llamada?: boolean
    email?: boolean
  }
}
