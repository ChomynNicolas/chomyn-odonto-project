// src/app/api/pacientes/[id]/_dto.ts
export function splitNombreCompleto(nombre: string) {
  const parts = nombre.trim().split(/\s+/)
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" }
  const apellidos = parts.pop()!
  return { nombres: parts.join(" "), apellidos }
}

export function safeJsonParse<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export type PacienteFichaDTO = {
  idPaciente: number
  estaActivo: boolean
  createdAt: string
  updatedAt: string
  persona: {
    idPersona: number
    nombres: string | null
    apellidos: string | null
    genero: string | null
    fechaNacimiento: string | null
    direccion: string | null
    documento: { tipo: string; numero: string; ruc: string | null } | null
    contactos: Array<{
      tipo: "PHONE" | "EMAIL"
      valorNorm: string
      label: string | null
      esPrincipal: boolean
      activo: boolean
    }>
  }
  antecedentes: {
    antecedentesMedicos: string | null
    alergias: string | null
    medicacion: string | null
    obraSocial: string | null
  }
  klinic: {
    alergiasCatalogadas: Array<{ id: number; label: string; severity: string; isActive: boolean; notedAt: string }>
    medicacionCatalogada: Array<{
      id: number
      label: string
      isActive: boolean
      startAt: string | null
      endAt: string | null
    }>
    diagnosticos: Array<{ id: number; label: string; status: string; notedAt: string; resolvedAt: string | null }>
  }
  kpis: {
    proximoTurno: string | null
    turnos90dias: number
    saldo: number // placeholder si aún no hay módulo de facturas
    noShow: number // placeholder (podrías contar estado NO_SHOW)
  }
  proximasCitas: CitaLite[]
  ultimasCitas: CitaLite[]
}

export type CitaLite = {
  idCita: number
  inicio: string
  fin: string
  tipo: string
  estado: string
  profesional: { idProfesional: number; nombre: string }
  consultorio: { idConsultorio: number; nombre: string } | null
}

export function nombreCompleto(p?: { nombres: string | null; apellidos: string | null }) {
  return [p?.nombres ?? "", p?.apellidos ?? ""].join(" ").trim()
}

export type PacienteFichaCompletaDTO = {
  idPaciente: number
  estaActivo: boolean
  createdAt: string
  updatedAt: string

  // Basic demographics
  persona: {
    idPersona: number
    nombres: string
    apellidos: string
    nombreCompleto: string
    genero: string | null
    fechaNacimiento: string | null
    edad: number | null
    direccion: string | null
    documento: { tipo: string; numero: string; ruc: string | null } | null
    contactos: Array<{
      tipo: "PHONE" | "EMAIL"
      valorNorm: string
      label: string | null
      esPrincipal: boolean
      activo: boolean
      whatsappCapaz?: boolean | null
      esPreferidoRecordatorio?: boolean
      esPreferidoCobranza?: boolean
    }>
  }

  // Responsables
  responsables: Array<{
    idPacienteResponsable: number
    relacion: string
    esPrincipal: boolean
    autoridadLegal: boolean
    persona: {
      idPersona: number
      nombreCompleto: string
      documento: { tipo: string; numero: string } | null
      contactoPrincipal: string | null
    }
  }>

  // Legacy clinical notes (from JSON field)
  antecedentes: {
    antecedentesMedicos: string | null
    alergias: string | null
    medicacion: string | null
    obraSocial: string | null
  }

  // Structured clinical data
  clinico: {
    alergias: Array<{
      id: number
      label: string
      severity: string
      reaction: string | null
      isActive: boolean
      notedAt: string
    }>
    medicacion: Array<{
      id: number
      label: string
      dose: string | null
      freq: string | null
      route: string | null
      isActive: boolean
      startAt: string | null
      endAt: string | null
    }>
    diagnosticos: Array<{
      id: number
      code: string | null
      label: string
      status: string
      notedAt: string
      resolvedAt: string | null
      notes: string | null
    }>
    vitales: {
      ultimo: {
        id: number
        measuredAt: string
        heightCm: number | null
        weightKg: number | null
        bmi: number | null
        bpSyst: number | null
        bpDiast: number | null
        heartRate: number | null
      } | null
      historial: Array<{
        id: number
        measuredAt: string
        bpSyst: number | null
        bpDiast: number | null
        heartRate: number | null
      }>
    }
  }

  // Treatment plans
  planes: {
    activo: {
      id: number
      titulo: string
      descripcion: string | null
      createdAt: string
      pasos: Array<{
        id: number
        order: number
        serviceType: string | null
        toothNumber: number | null
        status: string
        estimatedCostCents: number | null
        notes: string | null
      }>
    } | null
    historial: Array<{
      id: number
      titulo: string
      isActive: boolean
      createdAt: string
      pasosCompletados: number
      pasosTotal: number
    }>
  }

  // Appointments
  citas: {
    proxima: {
      idCita: number
      inicio: string
      fin: string
      tipo: string
      estado: string
      motivo: string | null
      profesional: { idProfesional: number; nombre: string }
      consultorio: { idConsultorio: number; nombre: string } | null
    } | null
    proximasSemana: Array<CitaLite>
    ultimas: Array<CitaLite>
  }

  // Odontogram & Periodontogram
  odontograma: {
    ultimo: {
      id: number
      takenAt: string
      consultaId: number | null
      entries: Array<{
        toothNumber: number
        surface: string | null
        condition: string
        notes: string | null
      }>
    } | null
  }

  periodontograma: {
    ultimo: {
      id: number
      takenAt: string
      consultaId: number | null
      measures: Array<{
        toothNumber: number
        site: string
        probingDepthMm: number | null
        bleeding: string | null
        plaque: boolean | null
        mobility: number | null
      }>
    } | null
  }

  // Attachments
  adjuntos: {
    recientes: Array<{
      id: number
      tipo: string
      descripcion: string | null
      secureUrl: string
      thumbnailUrl: string | null
      createdAt: string
      uploadedBy: string
    }>
    porTipo: {
      xrays: number
      photos: number
      documents: number
      other: number
    }
  }

  // KPIs and summary
  resumen: {
    proximaCitaEn: string | null
    ultimaCitaHace: string | null
    citasProximos90Dias: number
    citasUltimos90Dias: number
    citasNoShow: number
    saldoPendiente: number
    planActivoId: number | null
    tieneAlergias: boolean
    tieneMedicacion: boolean
    ultimoOdontogramaHace: string | null
    ultimoPeriodontogramaHace: string | null
  }
}

export function calculateAge(fechaNacimiento: Date | null): number | null {
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

export function daysSince(date: Date | null): number | null {
  if (!date) return null
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
