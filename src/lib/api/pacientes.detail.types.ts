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

export type FacturaItem = {
  id: number | string
  fecha: string | Date
  total: number
  estado: string
}

export type PagoItem = {
  id: number | string
  fecha: string | Date
  monto: number
  medio: string
}

export type DeudaItem = {
  id: number | string
  concepto: string
  saldo: number
}

export type FacturacionPacienteDTO = {
  facturas: FacturaItem[]
  pagos: PagoItem[]
  deudas: DeudaItem[]
  saldo: number
}

export type EvolucionItem = {
  id: number | string
  fecha: string | Date
  profesional: string
  nota: string
}

export type HistoriaClinicaDTO = {
  antecedentesMedicos: string | null
  alergias: string | null
  medicacion: string | null
  evoluciones: EvolucionItem[]
}

export type PlanItem = {
  id: number | string
  nombre: string
  estado: string
  tieneOdontograma: boolean
  progreso: number
}

export type PlanesPacienteDTO = {
  planes: PlanItem[]
}

export type AdjuntoItem = {
  id: string
  tipo: "XRAY" | "INTRAORAL_PHOTO" | "EXTRAORAL_PHOTO" | "IMAGE" | "DOCUMENT" | "PDF" | "LAB_REPORT" | "OTHER"
  descripcion: string | null
  secureUrl: string
  thumbnailUrl: string | null
  createdAt: string
  uploadedBy: string
  bytes: number | null
  originalFilename: string | null
  format: string | null
  width: number | null
  height: number | null
  publicId: string | null
  resourceType: string | null
  uploadedById: number
  accessMode: "PUBLIC" | "AUTHENTICATED"
  context: "patient" | "consultation" | "procedure"
  contextId: number | null
  contextInfo:
    | { consultaId: number; consultaFecha: string }
    | { consultaFecha: string; consultaTipo: string }
    | null
  source: "adjunto" | "consentimiento"
  consentimientoMetadata?: {
    idConsentimiento: number
    tipo: string
    firmadoEn: string
    vigenteHasta: string
    vigente: boolean
  }
}

export type AdjuntosPacienteDTO = {
  adjuntos: AdjuntoItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  porTipo: {
    xrays: number
    photos: number
    documents: number
    other: number
    consentimientos: number
  }
}

export type TurnoItem = {
  id: number
  fecha: string
  fin: string
  motivo: string | null
  tipo: string
  estado: string
  profesional: string
  consultorio: string | null
  duracionMin: number
}

export type TurnosPacienteDTO = {
  proximos: TurnoItem[]
  pasados: TurnoItem[]
  noShow: TurnoItem[]
}