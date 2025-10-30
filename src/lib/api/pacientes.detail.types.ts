export type ContactoItem = {
  tipo: "PHONE" | "EMAIL"
  valorNorm: string
  label: string | null
  esPrincipal: boolean
  activo: boolean
}

export type DocumentoItem = {
  tipo: "CI" | "DNI" | "PASAPORTE" | "RUC" | "OTRO"
  numero: string
  ruc: string | null
}

export type PersonaLite = {
  idPersona: number
  nombres: string
  apellidos: string
  genero: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO" | null
  fechaNacimiento: string | null
  direccion: string | null
  documento: DocumentoItem | null
  contactos: ContactoItem[]
}

export type CitaLite = {
  idCita: number
  inicio: string
  fin: string
  tipo: string
  estado: string
  profesional: { idProfesional: number; nombre: string }
  consultorio?: { idConsultorio: number; nombre: string } | null
}

export type PacienteDetailDTO = {
  idPaciente: number
  estaActivo: boolean
  createdAt: string
  updatedAt: string
  persona: PersonaLite
  kpis: {
    proximoTurno?: string | null
    turnos90dias: number
    saldo: number
    noShow: number
  }
  proximasCitas: CitaLite[]
  ultimasCitas: CitaLite[]
}
