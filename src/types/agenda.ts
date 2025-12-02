// ============================================================================
// TIPOS Y ENUMS COMPARTIDOS - Sistema de Agenda Clínica
// ============================================================================

export type EstadoCita =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

export type TipoCita =
  | "CONSULTA"
  | "LIMPIEZA"
  | "ENDODONCIA"
  | "EXTRACCION"
  | "URGENCIA"
  | "ORTODONCIA"
  | "CONTROL"
  | "OTRO"

export type RolUsuario = "ADMIN" | "ODONT" | "RECEP"

export interface CurrentUser {
  idUsuario: number
  role: RolUsuario
  profesionalId?: number | null
  nombre?: string
}

// ============================================================================
// DTOs PARA FULLCALENDAR (extendedProps)
// ============================================================================

export interface CitaEventDTO {
  id: number | string
  title: string
  start: string // ISO
  end: string // ISO
  extendedProps: {
    // Core
    estado: EstadoCita
    tipo: TipoCita

    // Paciente
    pacienteId: number
    pacienteNombre: string

    // Profesional
    profesionalId: number
    profesionalNombre: string

    // Consultorio
    consultorioId: number | null
    consultorioNombre: string | null
    consultorioColorHex: string | null

    // Flags UI (badges)
    urgencia: boolean
    primeraVez: boolean
    planActivo: boolean
    tieneAlergias: boolean
    noShowCount: number

    // Obra social y saldo
    obraSocial: string | null
    saldoPendiente: boolean
  }
}

// ============================================================================
// DTO DETALLE DE CITA (Drawer)
// ============================================================================

export interface CitaDetalleDTO {
  idCita: number
  inicio: string // ISO
  fin: string // ISO
  duracionMinutos: number
  estado: EstadoCita
  tipo: TipoCita
  motivo: string | null
  notas: string | null

  // Paciente
  paciente: {
    id: number
    personaId: number // Add persona ID for consent responsible party
    nombre: string
    fechaNacimiento: string,
    documento: string | null
    telefono: string | null
    email: string | null
  }

  // Profesional
  profesional: {
    id: number
    nombre: string
  }

  // Consultorio
  consultorio: {
    id: number
    nombre: string
    colorHex: string | null
  } | null

  // Alertas clínicas (RBAC: RECEP ve indicador, ODONT/ADMIN ven detalle)
  alertas: {
    tieneAlergias: boolean
    alergiasDetalle: string | null // null para RECEP
    obraSocial: string | null
    noShowCount: number
  }

  // Contexto clínico
  contexto: {
    planActivo: {
      titulo: string
      proximasEtapas: string[]
    } | null
    ultimaConsulta: string | null // ISO o null
    proximoTurno: string | null // ISO o null
  }

  // Adjuntos recientes (últimos 3)
  adjuntos: Array<{
    id: number
    nombre: string
    tipo: string // "image/jpeg", "application/pdf", etc.
    url: string
    fechaSubida: string // ISO
  }>

  // Auditoría
  auditoria: {
    creadoPor: string
    creadoEn: string // ISO
    ultimaTransicion: {
      usuario: string
      fecha: string // ISO
      motivo: string | null
    } | null
    canceladoPor?: string | null
  }

  // Cancelación/No-show
  cancelReason?: "PACIENTE"|"PROFESIONAL"|"CLINICA"|"EMERGENCIA"|"OTRO" | null

  // Timestamps de transiciones
  timestamps: {
    checkinAt: string | null
    startAt: string | null
    completeAt: string | null
    cancelledAt: string | null  
  }

  // Estado de consentimiento (menor y cirugía)
  consentimientoStatus?: {
    // Consentimiento de menor
    esMenorAlInicio: boolean
    requiereConsentimiento: boolean
    consentimientoVigente: boolean
    consentimientoResumen?: {
      firmadoEn: string // ISO
      vigenteHasta: string // ISO
      responsableNombre: string
      responsableTipoVinculo: string
    }
    
    // Consentimiento de cirugía
    requiereCirugia: boolean
    cirugiaConsentimientoVigente: boolean
    cirugiaConsentimientoResumen?: {
      firmadoEn: string // ISO
      vigenteHasta: string // ISO
      responsableNombre: string
      responsableTipoVinculo: string
    }
    responsableParaId?: number
    
    // Estado general
    bloqueaInicio: boolean
    mensajeBloqueo?: string
  }
}

// ============================================================================
// FILTROS DE AGENDA
// ============================================================================

export interface AgendaFilters {
  profesionalId?: number
  consultorioId?: number
  estado?: EstadoCita[]
  tipo?: TipoCita[]
  soloUrgencias?: boolean
  soloPrimeraVez?: boolean
  soloPlanActivo?: boolean
  busquedaPaciente?: string // nombre o documento
  hideCompleted?: boolean // Ocultar citas completadas
  hideCancelled?: boolean // Ocultar citas canceladas
}

// ============================================================================
// DISPONIBILIDAD
// ============================================================================

export interface SlotDisponibilidadDTO {
  slotStart: string // ISO
  slotEnd: string // ISO
  motivoBloqueo: string | null // si está bloqueado
}

export interface DisponibilidadResponse {
  slots: SlotDisponibilidadDTO[]
  meta: {
    fecha: string // ISO
    duracionMinutos: number
    intervalo: number
  }
}

// ============================================================================
// ACCIONES POR ESTADO
// ============================================================================

export type AccionCita = "CONFIRM" | "CHECKIN" | "START" | "COMPLETE" | "CANCEL" | "NO_SHOW" | "RESCHEDULE"

export interface TransicionCitaRequest {
  action: Exclude<AccionCita, "RESCHEDULE">
  note?: string
}

export interface RescheduleRequest {
  nuevoInicio: string // ISO
  duracionMinutos?: number
  motivo: string
}

// ============================================================================
// FOLLOW-UP APPOINTMENT CONTEXT
// ============================================================================

export interface NextSessionInfo {
  stepId: number
  stepOrder: number
  stepName: string
  currentSession: number
  totalSessions: number
  nextSessionNumber: number
  estimatedDurationMin: number | null
}

export interface FollowUpContext {
  hasActivePlan: boolean
  planId: number | null
  planTitle: string | null
  hasPendingSessions: boolean
  nextSessions: NextSessionInfo[]
  recommendedFollowUpDate: string | null // ISO
  isMultiSessionFollowUp: boolean
}

// ============================================================================
// ACTIVE PLANS CONTEXT FOR APPOINTMENT CREATION
// ============================================================================

export interface ActivePlanContext {
  hasActivePlans: boolean
  plans: Array<{
    planId: number
    planTitle: string
    nextSessions: NextSessionInfo[]
    recommendedMotivo: string
    recommendedTipo: TipoCita
    recommendedDuracion: number
  }>
}