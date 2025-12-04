// src/app/api/dashboard/kpi/_dto.ts
import type { EstadoCita } from "@prisma/client"

export type KpiCitasHoyDTO = {
  total: number
  confirmadas: number
  canceladas: number
  noShow: number
  confirmRate: number // 0..100 (redondeado)
  cancelRate: number // 0..100
  noShowRate: number // 0..100
  sinConfirmar24h: number // cantidad (para card rápida)
}

export type KpiTiemposDTO = {
  atencionesHoy: number
  promedioMin: number | null
  medianaMin: number | null
}

export type ProximaCitaItem = {
  idCita: number
  inicioISO: string
  estado: EstadoCita
  paciente: string
  profesional: string
  consultorio: string | null
}

export type CitaAtrasadaItem = {
  idCita: number
  inicioISO: string // ya pasó
  minutosAtraso: number // ahora - inicio
  paciente: string
  profesional: string
  consultorio: string | null
}

export type KpiOcupacionItem = {
  consultorioId: number
  nombre: string
  colorHex: string | null
  slots: number
  ocupadas: number
  bloqueos: number
  libres: number
}

export type AlertaSinConfirmar = {
  idCita: number
  inicioISO: string
  paciente: string
  profesional: string
  horasFaltantes: number
}

export type AlertaBloqueo = {
  idBloqueoAgenda: number
  desdeISO: string
  hastaISO: string
  tipo: string
  consultorio: string | null
  profesional: string | null
}

export type ConflictoAgenda = {
  recurso: "PROFESIONAL" | "CONSULTORIO"
  recursoId: number
  idCitaA: number
  idCitaB: number
  solapadoMin: number
}

export type ColaDTO = {
  checkIn: Array<{ idCita: number; pacienteId: number; hora: string; paciente: string; consultorio: string | null }>
  enAtencion: Array<{ idCita: number; pacienteId: number; hora: string; paciente: string; profesional: string; profesionalId: number | null }>
}

export type DashboardKpiResponse =
  | {
      ok: true
      data: {
        fecha: string // YYYY-MM-DD
        kpis: KpiCitasHoyDTO
        proximas10: ProximaCitaItem[]
        atrasadas: CitaAtrasadaItem[]
        ocupacion: KpiOcupacionItem[]
        tiempos: KpiTiemposDTO
        alertas: {
          sinConfirmar24h: AlertaSinConfirmar[]
          bloqueosActivos: AlertaBloqueo[]
          conflictos: ConflictoAgenda[]
        }
        colas: ColaDTO
      }
    }
  | { ok: false; error: string; details?: unknown }


  // ============== Filtros globales ==============
export interface KpiFilters {
  // Rango de fechas (ISO strings en UTC, se convierten a TZ de negocio)
  startDate: string
  endDate: string

  // Segmentaciones opcionales
  profesionalIds?: number[]
  consultorioIds?: number[]
  tipoCita?: string[] // TipoCita enum values
  estadoCita?: string[] // EstadoCita enum values
  procedimientoIds?: number[]
  diagnosisIds?: number[]

  // Demografía
  genero?: string[] // Genero enum values
  edadMin?: number
  edadMax?: number

  // Nuevo vs recurrente
  pacienteNuevo?: boolean

  // Modo privacidad (ofuscar PII en drill-downs)
  privacyMode?: boolean
}

// ============== Comparación con período anterior ==============
export interface KpiComparison {
  current: number
  previous: number
  delta: number
  deltaPercent: number
}

// ============== 1. Agenda y flujo asistencial ==============
export interface AgendaKpiDTO {
  turnosProgramados: KpiComparison
  turnosCompletados: KpiComparison
  confirmacionRate: KpiComparison
  cancelacionRate: KpiComparison
  noShowRate: KpiComparison
  reprogramacionRate: KpiComparison
  leadTimeDiasPromedio: KpiComparison
  puntualidadMinutosPromedio: KpiComparison
  esperaMinutosPromedio: KpiComparison
  duracionRealVsEstimadaMinutos: {
    realPromedio: number
    estimadaPromedio: number
    diferencia: number
  }
  sameDayCancellations: number
}

// ============== 2. Utilización y capacidad ==============
export interface UtilizacionDTO {
  porProfesional: Array<{
    profesionalId: number
    nombreCompleto: string
    horasReales: number
    horasCapacidad: number
    utilizacionPercent: number
  }>
  porConsultorio: Array<{
    consultorioId: number
    nombre: string
    horasReales: number
    horasCapacidad: number
    utilizacionPercent: number
  }>
  conflictos: number
}

// ============== 3. Producción clínica ==============
export interface ProduccionClinicaDTO {
  procedimientosRealizados: number
  ingresosClinicosTotal: number // en guaraníes (nota: el campo defaultPriceCents almacena guaraníes)
  topProcedimientosPorVolumen: Array<{
    procedimientoId: number
    code: string
    nombre: string
    cantidad: number
  }>
  topProcedimientosPorIngresos: Array<{
    procedimientoId: number
    code: string
    nombre: string
    ingresosCents: number
  }>
  pipelineTratamiento: {
    pending: number
    scheduled: number
    inProgress: number
    completed: number
    cancelled: number
    deferred: number
  }
  procedimientosSinPrecio: number // contador de casos omitidos
}

// ============== 4. Calidad y cumplimiento ==============
export interface CalidadDTO {
  coberturaVitalesPercent: number
  documentacionCompletaPercent: number
  consultasConAdjuntos: number
  adjuntosPorTipo: Array<{
    tipo: string
    cantidad: number
  }>
  tiempoCierrePromedioHoras: number
  consultasEnDraftMasDeNHoras: number
  thresholdHoras: number
}

// ============== 5. Pacientes y demografía ==============
export interface PacientesKpiDTO {
  pacientesNuevos: KpiComparison
  pacientesActivosAtendidos: KpiComparison
  distribucionPorEdad: Array<{
    grupo: string // "0-12", "13-17", "18-39", "40-64", "65+"
    cantidad: number
  }>
  distribucionPorGenero: Array<{
    genero: string
    cantidad: number
  }>
  retencionPercent: number // % con al menos 2 consultas en 90 días
}

// ============== 6. Diagnóstico y complejidad ==============
export interface DiagnosticoKpiDTO {
  diagnosticosActivos: number
  diagnosticosResueltos: number
  topDiagnosticos: Array<{
    diagnosisId: number | null
    code: string
    label: string
    frecuencia: number
  }>
  relacionDiagnosticoProcedimiento: Array<{
    diagnosisCode: string
    diagnosisLabel: string
    procedureCode: string
    procedureNombre: string
    frecuencia: number
  }>
}

// ============== DTO principal (Overview) ==============
export interface KpiClinicoOverviewDTO {
  filters: KpiFilters
  agenda: AgendaKpiDTO
  utilizacion: UtilizacionDTO
  produccion: ProduccionClinicaDTO
  calidad: CalidadDTO
  pacientes: PacientesKpiDTO
  diagnostico: DiagnosticoKpiDTO

  // Metadata
  calculatedAt: string
  previousPeriodStart: string
  previousPeriodEnd: string
}

// ============== Drill-down: lista de citas ==============
export interface CitaDrillDownItem {
  citaId: number
  inicio: string
  fin: string
  estado: string
  tipo: string
  pacienteNombre: string // ofuscado si privacyMode
  pacienteDocumento: string // ofuscado si privacyMode
  profesionalNombre: string
  consultorioNombre: string | null
  duracionMinutos: number
  leadTimeDias: number | null
  esperaMinutos: number | null
  puntualidadMinutos: number | null
}

export interface CitaDrillDownDTO {
  items: CitaDrillDownItem[]
  total: number
  page: number
  pageSize: number
}

// ============== Drill-down: procedimientos ==============
export interface ProcedimientoDrillDownItem {
  consultaId: number
  fecha: string
  pacienteNombre: string
  profesionalNombre: string
  procedureCode: string
  procedureNombre: string
  quantity: number
  totalCents: number | null
}

export interface ProcedimientoDrillDownDTO {
  items: ProcedimientoDrillDownItem[]
  total: number
  page: number
  pageSize: number
}

// ============== Series temporales para gráficos ==============
export interface TimeSeriesPoint {
  date: string // YYYY-MM-DD
  programados: number
  completados: number
  cancelados: number
  noShow: number
}

export interface TimeSeriesDTO {
  points: TimeSeriesPoint[]
  downsampleApplied: boolean
}