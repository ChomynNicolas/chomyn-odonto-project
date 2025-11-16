// src/app/api/dashboard/kpi/_service.ts
/* @server-only */
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, differenceInMinutes, addHours,differenceInDays, isSameDay } from "date-fns"
import type { GetKpiQuery } from "./_schemas"
import type {
  KpiCitasHoyDTO,
  KpiOcupacionItem,
  KpiTiemposDTO,
  AlertaSinConfirmar,
  AlertaBloqueo,
  ConflictoAgenda,
  DashboardKpiResponse,
  CitaAtrasadaItem,
} from "./_dto"
import type { EstadoCita, TipoCita, Genero } from "@prisma/client"


import type { Role } from "@/app/api/_lib/auth"
import type {
  KpiFilters,
  KpiClinicoOverviewDTO,
  AgendaKpiDTO,
  UtilizacionDTO,
  ProduccionClinicaDTO,
  CalidadDTO,
  PacientesKpiDTO,
  DiagnosticoKpiDTO,
} from "./_dto"
import { getPreviousPeriod, calculateComparison } from "@/lib/kpis/date-range"
import { calcularEdad, getEdadGrupo, EDAD_GRUPOS_DEFAULT } from "@/lib/kpis/edad-grupos"

import type { Prisma } from "@prisma/client"

const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"]

export async function buildDashboardKpi(
  params: GetKpiQuery,
  role: "RECEP" | "ODONT" | "ADMIN",
): Promise<DashboardKpiResponse> {
  const hoy = params.fecha ? new Date(params.fecha) : new Date()
  const desde = startOfDay(hoy)
  const hasta = endOfDay(hoy)
  const ahora = new Date()

  // Scopes por rol
  const scopeCita: Prisma.CitaWhereInput = { inicio: { gte: desde, lte: hasta } }
  if (role === "ODONT" && params.profesionalId) scopeCita.profesionalId = params.profesionalId
  if (role !== "ADMIN" && params.consultorioId) scopeCita.consultorioId = params.consultorioId

  // 1) KPIs rápidos + tasas
  const [total, confirmadas, canceladas, noShow] = await Promise.all([
    prisma.cita.count({ where: scopeCita }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CONFIRMED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CANCELLED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "NO_SHOW" } }),
  ])

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

  // Sin confirmación (<24h) para card rápida
  const dentro24h = addHours(ahora, 24)
  const sinConfCount = await prisma.cita.count({
    where: { ...scopeCita, estado: "SCHEDULED", inicio: { gte: ahora, lte: dentro24h } },
  })

  const kpis: KpiCitasHoyDTO = {
    total,
    confirmadas,
    canceladas,
    noShow,
    confirmRate: pct(confirmadas, total),
    cancelRate: pct(canceladas, total),
    noShowRate: pct(noShow, total),
    sinConfirmar24h: sinConfCount,
  }

  // 2) Próximas 10
  const proximas = await prisma.cita.findMany({
    where: { ...scopeCita, inicio: { gte: ahora } },
    orderBy: { inicio: "asc" },
    take: 10,
    select: {
      idCita: true,
      inicio: true,
      estado: true,
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { nombre: true } },
    },
  })

  // 2.b) Citas atrasadas (inicio < ahora y estado no finalizado/cancelado/no-show)
  const atrasadasRaw = await prisma.cita.findMany({
    where: {
      ...scopeCita,
      inicio: { lt: ahora },
      estado: { in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN"] },
    },
    orderBy: { inicio: "asc" },
    select: {
      idCita: true,
      inicio: true,
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { nombre: true } },
    },
  })

  const atrasadas: CitaAtrasadaItem[] = atrasadasRaw.map((a) => ({
    idCita: a.idCita,
    inicioISO: a.inicio.toISOString(),
    minutosAtraso: Math.max(0, differenceInMinutes(ahora, a.inicio)),
    paciente: `${a.paciente.persona.nombres} ${a.paciente.persona.apellidos}`.trim(),
    profesional: `${a.profesional.persona.nombres} ${a.profesional.persona.apellidos}`.trim(),
    consultorio: a.consultorio?.nombre ?? null,
  }))

  // 3) Ocupación por consultorio
  const consultorios = await prisma.consultorio.findMany({
    where: { activo: true },
    select: { idConsultorio: true, nombre: true, colorHex: true },
  })
  const slot = params.slotMin ?? 30
  const totalSlots = Math.ceil(differenceInMinutes(hasta, desde) / slot)
  const [citasDia, bloqueosDia] = await Promise.all([
    prisma.cita.groupBy({
      by: ["consultorioId"],
      where: { ...scopeCita, estado: { in: ACTIVE_STATES } },
      _count: { _all: true },
    }),
    prisma.bloqueoAgenda.groupBy({
      by: ["consultorioId"],
      where: { activo: true, desde: { lte: hasta }, hasta: { gte: desde } },
      _count: { _all: true },
    }),
  ])
  const citasCount = new Map<number, number>()
  citasDia.forEach((r) => {
    if (r.consultorioId) citasCount.set(r.consultorioId, r._count._all)
  })
  const bloqueosCount = new Map<number, number>()
  bloqueosDia.forEach((r) => {
    if (r.consultorioId) bloqueosCount.set(r.consultorioId, r._count._all)
  })
  const ocupacion: KpiOcupacionItem[] = consultorios.map((c) => ({
    consultorioId: c.idConsultorio,
    nombre: c.nombre,
    colorHex: c.colorHex,
    slots: totalSlots,
    ocupadas: citasCount.get(c.idConsultorio) ?? 0,
    bloqueos: bloqueosCount.get(c.idConsultorio) ?? 0,
    libres: Math.max(
      totalSlots - (citasCount.get(c.idConsultorio) ?? 0) - (bloqueosCount.get(c.idConsultorio) ?? 0),
      0,
    ),
  }))

  // 4) Tiempos
  const atencionesHoy = await prisma.cita.findMany({
    where: { ...scopeCita, startedAt: { gte: desde }, completedAt: { lte: hasta } },
    select: { startedAt: true, completedAt: true },
  })
  const duraciones = atencionesHoy
    .map((a) => differenceInMinutes(a.completedAt!, a.startedAt!))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b)

  const promedio = duraciones.length ? Math.round(duraciones.reduce((s, n) => s + n, 0) / duraciones.length) : null
  const mediana = duraciones.length
    ? duraciones.length % 2 === 1
      ? duraciones[(duraciones.length - 1) / 2]
      : Math.round((duraciones[duraciones.length / 2 - 1] + duraciones[duraciones.length / 2]) / 2)
    : null
  const tiempos: KpiTiemposDTO = { atencionesHoy: duraciones.length, promedioMin: promedio, medianaMin: mediana }

  // 5) Alertas (listas)
  const sinConfirmar = await prisma.cita.findMany({
    where: { ...scopeCita, estado: "SCHEDULED", inicio: { gte: ahora, lte: dentro24h } },
    orderBy: { inicio: "asc" },
    select: {
      idCita: true,
      inicio: true,
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
    },
  })
  const sinConfirmar24h: AlertaSinConfirmar[] = sinConfirmar.map((c) => ({
    idCita: c.idCita,
    inicioISO: c.inicio.toISOString(),
    paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
    profesional: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    horasFaltantes: Math.max(0, Math.round(differenceInMinutes(c.inicio, ahora) / 60)),
  }))

  const bloqueosActRaw = await prisma.bloqueoAgenda.findMany({
    where: { activo: true, desde: { lte: hasta }, hasta: { gte: desde } },
    select: {
      idBloqueoAgenda: true,
      desde: true,
      hasta: true,
      tipo: true,
      consultorio: { select: { nombre: true } },
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
    },
    orderBy: { desde: "asc" },
  })
  const bloqueosActivos: AlertaBloqueo[] = bloqueosActRaw.map((b) => ({
    idBloqueoAgenda: b.idBloqueoAgenda,
    desdeISO: b.desde.toISOString(),
    hastaISO: b.hasta.toISOString(),
    tipo: b.tipo,
    consultorio: b.consultorio?.nombre ?? null,
    profesional: b.profesional ? `${b.profesional.persona.nombres} ${b.profesional.persona.apellidos}` : null,
  }))

  const activas = await prisma.cita.findMany({
    where: { ...scopeCita, estado: { in: ACTIVE_STATES } },
    select: { idCita: true, inicio: true, fin: true, profesionalId: true, consultorioId: true },
  })
  const conflictos: ConflictoAgenda[] = []
  for (let i = 0; i < activas.length; i++) {
    for (let j = i + 1; j < activas.length; j++) {
      const A = activas[i],
        B = activas[j]
      const overlap = !(A.fin <= B.inicio || B.fin <= A.inicio)
      if (!overlap) continue
      const solapadoMin = Math.max(
        0,
        Math.min(differenceInMinutes(A.fin, B.inicio), differenceInMinutes(B.fin, A.inicio)) * -1,
      )
      if (A.profesionalId === B.profesionalId) {
        conflictos.push({
          recurso: "PROFESIONAL",
          recursoId: A.profesionalId,
          idCitaA: A.idCita,
          idCitaB: B.idCita,
          solapadoMin,
        })
      }
      if (A.consultorioId && B.consultorioId && A.consultorioId === B.consultorioId) {
        conflictos.push({
          recurso: "CONSULTORIO",
          recursoId: A.consultorioId,
          idCitaA: A.idCita,
          idCitaB: B.idCita,
          solapadoMin,
        })
      }
    }
  }

  // 6) Colas
  const [colaCheckIn, colaInProgress] = await Promise.all([
    prisma.cita.findMany({
      where: { ...scopeCita, estado: "CHECKED_IN" },
      select: {
        idCita: true,
        inicio: true,
        paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { nombre: true } },
      },
      orderBy: { checkedInAt: "asc" },
    }),
    prisma.cita.findMany({
      where: { ...scopeCita, estado: "IN_PROGRESS" },
      select: {
        idCita: true,
        inicio: true,
        paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
        profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      },
      orderBy: { startedAt: "asc" },
    }),
  ])

  const colas = {
    checkIn: colaCheckIn.map((c) => ({
      idCita: c.idCita,
      hora: c.inicio.toISOString(),
      paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`,
      consultorio: c.consultorio?.nombre ?? null,
    })),
    enAtencion: colaInProgress.map((c) => ({
      idCita: c.idCita,
      hora: c.inicio.toISOString(),
      paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`,
      profesional: c.profesional?.persona ? `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}` : "",
    })),
  }

  return {
    ok: true,
    data: {
      fecha: desde.toISOString().slice(0, 10),
      kpis,
      proximas10: proximas.map((p) => ({
        idCita: p.idCita,
        inicioISO: p.inicio.toISOString(),
        estado: p.estado,
        paciente: `${p.paciente.persona.nombres} ${p.paciente.persona.apellidos}`.trim(),
        profesional: `${p.profesional.persona.nombres} ${p.profesional.persona.apellidos}`.trim(),
        consultorio: p.consultorio?.nombre ?? null,
      })),
      atrasadas,
      ocupacion,
      tiempos,
      alertas: { sinConfirmar24h, bloqueosActivos, conflictos },
      colas,
    },
  }
}


// src/app/api/kpis/clinico/_service.ts
/* @server-only */


/**
 * Servicio principal para cálculo de KPIs clínicos
 * Aplica scopes por rol y filtros del usuario
 */
export async function buildKpiClinicoOverview(
  filters: KpiFilters,
  role: Role,
  userId: number,
): Promise<KpiClinicoOverviewDTO> {
  const startDate = new Date(filters.startDate)
  const endDate = new Date(filters.endDate)
  const previousPeriod = getPreviousPeriod(startDate, endDate)

  // Aplicar scopes por rol
  const scopedFilters = applyScopesByRole(filters, role, userId)

  // Calcular cada grupo de KPIs en paralelo
  const [agenda, utilizacion, produccion, calidad, pacientes, diagnostico] = await Promise.all([
    calculateAgendaKpis(scopedFilters, startDate, endDate, previousPeriod),
    calculateUtilizacionKpis(scopedFilters, startDate, endDate),
    calculateProduccionKpis(scopedFilters, startDate, endDate, previousPeriod, role),
    calculateCalidadKpis(scopedFilters, startDate, endDate),
    calculatePacientesKpis(scopedFilters, startDate, endDate, previousPeriod),
    calculateDiagnosticoKpis(scopedFilters, startDate, endDate),
  ])

  return {
    filters: scopedFilters,
    agenda,
    utilizacion,
    produccion,
    calidad,
    pacientes,
    diagnostico,
    calculatedAt: new Date().toISOString(),
    previousPeriodStart: previousPeriod.start.toISOString(),
    previousPeriodEnd: previousPeriod.end.toISOString(),
  }
}

/**
 * Aplica restricciones de datos según rol
 */
function applyScopesByRole(filters: KpiFilters, role: Role, userId: number): KpiFilters {
  if (role === "ADMIN") {
    return filters // Sin restricciones
  }

  if (role === "ODONT") {
    // Solo datos del profesional actual
    return {
      ...filters,
      profesionalIds: [userId], // Asumiendo que userId = profesionalId
    }
  }

  // RECEP: sin acceso a ingresos (se maneja en producción)
  return filters
}

/**
 * Construye el WHERE clause base para Citas según filtros
 */
function buildCitaWhereClause(filters: KpiFilters, startDate: Date, endDate: Date): Prisma.CitaWhereInput {
  const where: Prisma.CitaWhereInput = {
    inicio: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (filters.profesionalIds?.length) {
    where.profesionalId = { in: filters.profesionalIds }
  }

  if (filters.consultorioIds?.length) {
    where.consultorioId = { in: filters.consultorioIds }
  }

  if (filters.tipoCita?.length) {
    where.tipo = { in: filters.tipoCita as TipoCita[] }
  }

  if (filters.estadoCita?.length) {
    where.estado = { in: filters.estadoCita as EstadoCita[] }
  }

  // Filtros demográficos del paciente
  if (filters.genero?.length || filters.edadMin !== undefined || filters.edadMax !== undefined) {
    where.paciente = {
      persona: {
        ...(filters.genero?.length ? { genero: { in: filters.genero as Genero[] } } : {}),
      },
    }

    // Edad se calcula en aplicación, no en query (complejo en SQL)
  }

  return where
}

/**
 * 1. KPIs de Agenda y flujo asistencial
 */
async function calculateAgendaKpis(
  filters: KpiFilters,
  startDate: Date,
  endDate: Date,
  previousPeriod: { start: Date; end: Date },
): Promise<AgendaKpiDTO> {
  // Período actual
  const currentWhere = buildCitaWhereClause(filters, startDate, endDate)
  const currentCitas = await prisma.cita.findMany({
    where: currentWhere,
    include: {
      CitaEstadoHistorial: {
        orderBy: { changedAt: "asc" },
      },
    },
  })

  // Período anterior
  const previousWhere = buildCitaWhereClause(filters, previousPeriod.start, previousPeriod.end)
  const previousCitas = await prisma.cita.findMany({
    where: previousWhere,
    include: {
      CitaEstadoHistorial: {
        orderBy: { changedAt: "asc" },
      },
    },
  })

  // Calcular métricas para ambos períodos
  const currentMetrics = calculateAgendaMetrics(currentCitas)
  const previousMetrics = calculateAgendaMetrics(previousCitas)

  return {
    turnosProgramados: calculateComparison(currentMetrics.programados, previousMetrics.programados),
    turnosCompletados: calculateComparison(currentMetrics.completados, previousMetrics.completados),
    confirmacionRate: calculateComparison(currentMetrics.confirmacionRate, previousMetrics.confirmacionRate),
    cancelacionRate: calculateComparison(currentMetrics.cancelacionRate, previousMetrics.cancelacionRate),
    noShowRate: calculateComparison(currentMetrics.noShowRate, previousMetrics.noShowRate),
    reprogramacionRate: calculateComparison(currentMetrics.reprogramacionRate, previousMetrics.reprogramacionRate),
    leadTimeDiasPromedio: calculateComparison(currentMetrics.leadTimeDias, previousMetrics.leadTimeDias),
    puntualidadMinutosPromedio: calculateComparison(
      currentMetrics.puntualidadMinutos,
      previousMetrics.puntualidadMinutos,
    ),
    esperaMinutosPromedio: calculateComparison(currentMetrics.esperaMinutos, previousMetrics.esperaMinutos),
    duracionRealVsEstimadaMinutos: currentMetrics.duracionRealVsEstimada,
    sameDayCancellations: currentMetrics.sameDayCancellations,
  }
}

interface AgendaMetrics {
  programados: number
  completados: number
  confirmacionRate: number
  cancelacionRate: number
  noShowRate: number
  reprogramacionRate: number
  leadTimeDias: number
  puntualidadMinutos: number
  esperaMinutos: number
  duracionRealVsEstimada: {
    realPromedio: number
    estimadaPromedio: number
    diferencia: number
  }
  sameDayCancellations: number
}

type CitaWithHistorial = Prisma.CitaGetPayload<{
  include: {
    CitaEstadoHistorial: true;
  };
}>;

function calculateAgendaMetrics(citas: CitaWithHistorial[]): AgendaMetrics {
  const programados = citas.length
  const completados = citas.filter((c) => c.estado === "COMPLETED").length
  const cancelados = citas.filter((c) => c.estado === "CANCELLED").length
  const noShow = citas.filter((c) => c.estado === "NO_SHOW").length
  const reprogramados = citas.filter((c) => c.reprogramadaDesdeId !== null).length

  // Confirmación: citas que tuvieron transición a CONFIRMED
  const confirmados = citas.filter((c) => c.CitaEstadoHistorial.some((h) => h.estadoNuevo === "CONFIRMED")).length

  // Lead time: promedio de (inicio - createdAt) en días
  const leadTimes = citas.map((c) => differenceInDays(new Date(c.inicio), new Date(c.createdAt))).filter((d) => d >= 0)
  const leadTimeDias = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0

  // Puntualidad: promedio de (startedAt - inicio) en minutos
  const puntualidades = citas
    .filter((c): c is typeof c & { startedAt: Date } => c.startedAt !== null)
    .map((c) => differenceInMinutes(new Date(c.startedAt), new Date(c.inicio)))
  const puntualidadMinutos =
    puntualidades.length > 0 ? puntualidades.reduce((a, b) => a + b, 0) / puntualidades.length : 0

  // Espera: promedio de (startedAt - checkedInAt) en minutos
  const esperas = citas
    .filter((c): c is typeof c & { startedAt: Date; checkedInAt: Date } => 
      c.startedAt !== null && c.checkedInAt !== null
    )
    .map((c) => differenceInMinutes(new Date(c.startedAt), new Date(c.checkedInAt)))
    .filter((m) => m >= 0)
  const esperaMinutos = esperas.length > 0 ? esperas.reduce((a, b) => a + b, 0) / esperas.length : 0

  // Duración real vs estimada
  const duracionesReales = citas
    .filter((c): c is typeof c & { startedAt: Date; completedAt: Date } => 
      c.completedAt !== null && c.startedAt !== null
    )
    .map((c) => differenceInMinutes(new Date(c.completedAt), new Date(c.startedAt)))
    .filter((m) => m >= 0)
  const realPromedio =
    duracionesReales.length > 0 ? duracionesReales.reduce((a, b) => a + b, 0) / duracionesReales.length : 0
  const estimadaPromedio = citas.length > 0 ? citas.reduce((a, c) => a + c.duracionMinutos, 0) / citas.length : 0

  // Cancelaciones same-day
  const sameDayCancellations = citas.filter(
    (c) => c.estado === "CANCELLED" && c.cancelledAt && isSameDay(new Date(c.cancelledAt), new Date(c.inicio)),
  ).length

  return {
    programados,
    completados,
    confirmacionRate: programados > 0 ? (confirmados / programados) * 100 : 0,
    cancelacionRate: programados > 0 ? (cancelados / programados) * 100 : 0,
    noShowRate: programados > 0 ? (noShow / programados) * 100 : 0,
    reprogramacionRate: programados > 0 ? (reprogramados / programados) * 100 : 0,
    leadTimeDias: Math.round(leadTimeDias * 10) / 10,
    puntualidadMinutos: Math.round(puntualidadMinutos),
    esperaMinutos: Math.round(esperaMinutos),
    duracionRealVsEstimada: {
      realPromedio: Math.round(realPromedio),
      estimadaPromedio: Math.round(estimadaPromedio),
      diferencia: Math.round(realPromedio - estimadaPromedio),
    },
    sameDayCancellations,
  }
}

/**
 * 2. KPIs de Utilización y capacidad
 */
async function calculateUtilizacionKpis(filters: KpiFilters, startDate: Date, endDate: Date): Promise<UtilizacionDTO> {
  const where = buildCitaWhereClause(filters, startDate, endDate)
  where.estado = "COMPLETED" // Solo citas completadas

  const citas = await prisma.cita.findMany({
    where,
    include: {
      profesional: {
        include: {
          persona: true,
        },
      },
      consultorio: true,
    },
  })

  // Agrupar por profesional
  const porProfesional = new Map<number, { nombre: string; minutos: number }>()
  const porConsultorio = new Map<number, { nombre: string; minutos: number }>()

  for (const cita of citas) {
    const duracion =
      cita.completedAt && cita.startedAt
        ? differenceInMinutes(new Date(cita.startedAt), new Date(cita.completedAt))
        : cita.duracionMinutos

    // Por profesional
    if (!porProfesional.has(cita.profesionalId)) {
      const nombreCompleto = `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`
      porProfesional.set(cita.profesionalId, { nombre: nombreCompleto, minutos: 0 })
    }
    porProfesional.get(cita.profesionalId)!.minutos += duracion

    // Por consultorio
    if (cita.consultorioId) {
      if (!porConsultorio.has(cita.consultorioId)) {
        porConsultorio.set(cita.consultorioId, { nombre: cita.consultorio!.nombre, minutos: 0 })
      }
      porConsultorio.get(cita.consultorioId)!.minutos += duracion
    }
  }

  // Calcular capacidad teórica (simplificado: 8 horas/día * días en rango)
  const dias = differenceInDays(endDate, startDate) + 1
  const capacidadMinutosPorDia = 8 * 60
  const capacidadTotal = capacidadMinutosPorDia * dias

  // Detectar conflictos (citas solapadas)
  const conflictos = await detectarConflictos(citas)

  return {
    porProfesional: Array.from(porProfesional.entries()).map(([id, data]) => ({
      profesionalId: id,
      nombreCompleto: data.nombre,
      horasReales: Math.round((data.minutos / 60) * 10) / 10,
      horasCapacidad: Math.round((capacidadTotal / 60) * 10) / 10,
      utilizacionPercent: Math.round((data.minutos / capacidadTotal) * 100 * 10) / 10,
    })),
    porConsultorio: Array.from(porConsultorio.entries()).map(([id, data]) => ({
      consultorioId: id,
      nombre: data.nombre,
      horasReales: Math.round((data.minutos / 60) * 10) / 10,
      horasCapacidad: Math.round((capacidadTotal / 60) * 10) / 10,
      utilizacionPercent: Math.round((data.minutos / capacidadTotal) * 100 * 10) / 10,
    })),
    conflictos,
  }
}

type CitaForConflict = {
  idCita: number;
  inicio: Date;
  fin: Date;
  profesionalId: number;
  consultorioId: number | null;
};

function detectarConflictos(citas: CitaForConflict[]): number {
  let conflictos = 0

  // Agrupar por profesional
  const citasPorProfesional = new Map<number, CitaForConflict[]>()
  for (const cita of citas) {
    if (!citasPorProfesional.has(cita.profesionalId)) {
      citasPorProfesional.set(cita.profesionalId, [])
    }
    citasPorProfesional.get(cita.profesionalId)!.push(cita)
  }

  // Detectar solapamientos
  for (const [, citasProf] of citasPorProfesional) {
    const sorted = citasProf.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())

    for (let i = 0; i < sorted.length - 1; i++) {
      const actual = sorted[i]
      const siguiente = sorted[i + 1]

      if (new Date(actual.fin) > new Date(siguiente.inicio)) {
        conflictos++
      }
    }
  }

  return conflictos
}

/**
 * 3. KPIs de Producción clínica
 */
async function calculateProduccionKpis(
  filters: KpiFilters,
  startDate: Date,
  endDate: Date,
  previousPeriod: { start: Date; end: Date },
  role: Role,
): Promise<ProduccionClinicaDTO> {
  // RECEP no ve ingresos
  const incluirIngresos = role !== "RECEP"

  const where: Prisma.ConsultaProcedimientoWhereInput = {
    consulta: {
      cita: {
        inicio: {
          gte: startDate,
          lte: endDate,
        },
      },
      ...(filters.profesionalIds?.length ? { performedById: { in: filters.profesionalIds } } : {}),
    },
  }

  if (filters.procedimientoIds?.length) {
    where.procedureId = { in: filters.procedimientoIds }
  }

  const procedimientos = await prisma.consultaProcedimiento.findMany({
    where,
    include: {
      catalogo: true,
    },
  })

  const procedimientosRealizados = procedimientos.reduce((sum, p) => sum + p.quantity, 0)

  // Ingresos: jerarquía totalCents > quantity * unitPriceCents > defaultPriceCents
  let ingresosClinicosTotal = 0
  let procedimientosSinPrecio = 0

  if (incluirIngresos) {
    for (const proc of procedimientos) {
      let precio = proc.totalCents

      if (precio === null && proc.unitPriceCents !== null) {
        precio = proc.quantity * proc.unitPriceCents
      }

      if (precio === null && proc.catalogo && proc.catalogo.defaultPriceCents !== null) {
        precio = proc.quantity * proc.catalogo.defaultPriceCents
      }

      if (precio !== null) {
        ingresosClinicosTotal += precio
      } else {
        procedimientosSinPrecio++
      }
    }
  }

  // Top 10 por volumen
  const volumenes = new Map<number, { code: string; nombre: string; cantidad: number }>()
  for (const proc of procedimientos) {
    if (!proc.procedureId) continue

    if (!volumenes.has(proc.procedureId)) {
      volumenes.set(proc.procedureId, {
        code: proc.catalogo?.code || "",
        nombre: proc.catalogo?.nombre || proc.serviceType || "",
        cantidad: 0,
      })
    }
    volumenes.get(proc.procedureId)!.cantidad += proc.quantity
  }

  const topProcedimientosPorVolumen = Array.from(volumenes.entries())
    .map(([id, data]) => ({
      procedimientoId: id,
      ...data,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 10)

  // Top 10 por ingresos
  const ingresos = new Map<number, { code: string; nombre: string; ingresosCents: number }>()
  if (incluirIngresos) {
    for (const proc of procedimientos) {
      if (!proc.procedureId) continue

      let precio = proc.totalCents
      if (precio === null && proc.unitPriceCents !== null) {
        precio = proc.quantity * proc.unitPriceCents
      }
      if (precio === null && proc.catalogo && proc.catalogo.defaultPriceCents !== null) {
        precio = proc.quantity * proc.catalogo.defaultPriceCents
      }

      if (precio !== null) {
        if (!ingresos.has(proc.procedureId)) {
          ingresos.set(proc.procedureId, {
            code: proc.catalogo?.code || "",
            nombre: proc.catalogo?.nombre || proc.serviceType || "",
            ingresosCents: 0,
          })
        }
        ingresos.get(proc.procedureId)!.ingresosCents += precio
      }
    }
  }

  const topProcedimientosPorIngresos = Array.from(ingresos.entries())
    .map(([id, data]) => ({
      procedimientoId: id,
      ...data,
    }))
    .sort((a, b) => b.ingresosCents - a.ingresosCents)
    .slice(0, 10)

  // Pipeline de tratamiento
  const treatmentSteps = await prisma.treatmentStep.findMany({
    where: {
      plan: {
        paciente: {
          citas: {
            some: {
              inicio: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      },
    },
  })

  const pipelineTratamiento = {
    pending: treatmentSteps.filter((s) => s.status === "PENDING").length,
    scheduled: treatmentSteps.filter((s) => s.status === "SCHEDULED").length,
    inProgress: treatmentSteps.filter((s) => s.status === "IN_PROGRESS").length,
    completed: treatmentSteps.filter((s) => s.status === "COMPLETED").length,
    cancelled: treatmentSteps.filter((s) => s.status === "CANCELLED").length,
    deferred: treatmentSteps.filter((s) => s.status === "DEFERRED").length,
  }

  return {
    procedimientosRealizados,
    ingresosClinicosTotal,
    topProcedimientosPorVolumen,
    topProcedimientosPorIngresos,
    pipelineTratamiento,
    procedimientosSinPrecio,
  }
}

/**
 * 4. KPIs de Calidad y cumplimiento
 */
async function calculateCalidadKpis(filters: KpiFilters, startDate: Date, endDate: Date): Promise<CalidadDTO> {
  const where: Prisma.ConsultaWhereInput = {
    cita: {
      inicio: {
        gte: startDate,
        lte: endDate,
      },
    },
  }

  if (filters.profesionalIds?.length) {
    where.performedById = { in: filters.profesionalIds }
  }

  const consultas = await prisma.consulta.findMany({
    where,
    include: {
      PatientVitals: true,
      procedimientos: true,
      adjuntos: true,
    },
  })

  const totalConsultas = consultas.length

  // Cobertura de vitales
  const consultasConVitales = consultas.filter((c) => c.PatientVitals.length > 0).length
  const coberturaVitalesPercent = totalConsultas > 0 ? (consultasConVitales / totalConsultas) * 100 : 0

  // Documentación completa: notas + al menos 1 procedimiento
  const consultasCompletas = consultas.filter(
    (c) => c.clinicalNotes && c.clinicalNotes.trim().length > 0 && c.procedimientos.length > 0,
  ).length
  const documentacionCompletaPercent = totalConsultas > 0 ? (consultasCompletas / totalConsultas) * 100 : 0

  // Consultas con adjuntos
  const consultasConAdjuntos = consultas.filter((c) => c.adjuntos.length > 0).length

  // Adjuntos por tipo
  const adjuntosPorTipo = new Map<string, number>()
  for (const consulta of consultas) {
    for (const adj of consulta.adjuntos) {
      adjuntosPorTipo.set(adj.tipo, (adjuntosPorTipo.get(adj.tipo) || 0) + 1)
    }
  }

  // Tiempo de cierre: promedio de (finishedAt - startedAt) en horas
  const tiemposCierre = consultas
    .filter((c) => c.finishedAt && c.startedAt)
    .map((c) => differenceInMinutes(new Date(c.startedAt!), new Date(c.finishedAt!)) / 60)
    .filter((h) => h >= 0)
  const tiempoCierrePromedioHoras =
    tiemposCierre.length > 0 ? tiemposCierre.reduce((a, b) => a + b, 0) / tiemposCierre.length : 0

  // Consultas en DRAFT > N horas (threshold configurable, default 24h)
  const thresholdHoras = 24
  const ahora = new Date()
  const consultasEnDraftMasDeNHoras = consultas.filter((c) => {
    if (c.status !== "DRAFT" || !c.startedAt) return false
    const horasDesdeInicio = differenceInMinutes(new Date(c.startedAt), ahora) / 60
    return horasDesdeInicio > thresholdHoras
  }).length

  return {
    coberturaVitalesPercent: Math.round(coberturaVitalesPercent * 10) / 10,
    documentacionCompletaPercent: Math.round(documentacionCompletaPercent * 10) / 10,
    consultasConAdjuntos,
    adjuntosPorTipo: Array.from(adjuntosPorTipo.entries()).map(([tipo, cantidad]) => ({
      tipo,
      cantidad,
    })),
    tiempoCierrePromedioHoras: Math.round(tiempoCierrePromedioHoras * 10) / 10,
    consultasEnDraftMasDeNHoras,
    thresholdHoras,
  }
}

/**
 * 5. KPIs de Pacientes y demografía
 */
async function calculatePacientesKpis(
  filters: KpiFilters,
  startDate: Date,
  endDate: Date,
  previousPeriod: { start: Date; end: Date },
): Promise<PacientesKpiDTO> {
  // Pacientes nuevos (createdAt en rango)
  const currentNuevos = await prisma.paciente.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      estaActivo: true,
    },
  })

  const previousNuevos = await prisma.paciente.count({
    where: {
      createdAt: {
        gte: previousPeriod.start,
        lte: previousPeriod.end,
      },
      estaActivo: true,
    },
  })

  // Pacientes activos atendidos (con cita COMPLETED en rango)
  const citasWhere = buildCitaWhereClause(filters, startDate, endDate)
  citasWhere.estado = "COMPLETED"

  const citasCompletadas = await prisma.cita.findMany({
    where: citasWhere,
    select: { pacienteId: true },
    distinct: ["pacienteId"],
  })
  const currentActivos = citasCompletadas.length

  const citasWherePrev = buildCitaWhereClause(filters, previousPeriod.start, previousPeriod.end)
  citasWherePrev.estado = "COMPLETED"

  const citasCompletadasPrev = await prisma.cita.findMany({
    where: citasWherePrev,
    select: { pacienteId: true },
    distinct: ["pacienteId"],
  })
  const previousActivos = citasCompletadasPrev.length

  // Distribución por edad y género
  const pacientesAtendidos = await prisma.paciente.findMany({
    where: {
      idPaciente: {
        in: citasCompletadas.map((c) => c.pacienteId),
      },
    },
    include: {
      persona: true,
    },
  })

  // Por edad
  const distribucionPorEdad = new Map<string, number>()
  for (const grupo of EDAD_GRUPOS_DEFAULT) {
    distribucionPorEdad.set(grupo.label, 0)
  }

  for (const paciente of pacientesAtendidos) {
    if (paciente.persona.fechaNacimiento) {
      const edad = calcularEdad(new Date(paciente.persona.fechaNacimiento))
      const grupo = getEdadGrupo(edad)
      if (grupo) {
        distribucionPorEdad.set(grupo, (distribucionPorEdad.get(grupo) || 0) + 1)
      }
    }
  }

  // Por género
  const distribucionPorGenero = new Map<string, number>()
  for (const paciente of pacientesAtendidos) {
    const genero = paciente.persona.genero || "NO_ESPECIFICADO"
    distribucionPorGenero.set(genero, (distribucionPorGenero.get(genero) || 0) + 1)
  }

  // Retención: % con al menos 2 consultas en ventana móvil de 90 días
  const hace90Dias = new Date(endDate)
  hace90Dias.setDate(hace90Dias.getDate() - 90)

  const citasUltimos90 = await prisma.cita.groupBy({
    by: ["pacienteId"],
    where: {
      inicio: {
        gte: hace90Dias,
        lte: endDate,
      },
      estado: "COMPLETED",
    },
    _count: {
      idCita: true,
    },
  })

  const pacientesConDosOMas = citasUltimos90.filter((g) => g._count.idCita >= 2).length
  const totalPacientesUltimos90 = citasUltimos90.length
  const retencionPercent = totalPacientesUltimos90 > 0 ? (pacientesConDosOMas / totalPacientesUltimos90) * 100 : 0

  return {
    pacientesNuevos: calculateComparison(currentNuevos, previousNuevos),
    pacientesActivosAtendidos: calculateComparison(currentActivos, previousActivos),
    distribucionPorEdad: Array.from(distribucionPorEdad.entries()).map(([grupo, cantidad]) => ({
      grupo,
      cantidad,
    })),
    distribucionPorGenero: Array.from(distribucionPorGenero.entries()).map(([genero, cantidad]) => ({
      genero,
      cantidad,
    })),
    retencionPercent: Math.round(retencionPercent * 10) / 10,
  }
}

/**
 * 6. KPIs de Diagnóstico y complejidad
 */
async function calculateDiagnosticoKpis(
  filters: KpiFilters,
  startDate: Date,
  endDate: Date,
): Promise<DiagnosticoKpiDTO> {
  const where: Prisma.PatientDiagnosisWhereInput = {
    notedAt: {
      gte: startDate,
      lte: endDate,
    },
  }

  if (filters.diagnosisIds?.length) {
    where.diagnosisId = { in: filters.diagnosisIds }
  }

  const diagnosticos = await prisma.patientDiagnosis.findMany({
    where,
    include: {
      diagnosisCatalog: true,
      consulta: {
        include: {
          procedimientos: {
            include: {
              catalogo: true,
            },
          },
        },
      },
    },
  })

  const diagnosticosActivos = diagnosticos.filter((d) => d.status === "ACTIVE").length
  const diagnosticosResueltos = diagnosticos.filter((d) => d.status === "RESOLVED").length

  // Top diagnósticos por frecuencia
  const frecuencias = new Map<string, { diagnosisId: number | null; code: string; label: string; count: number }>()

  for (const diag of diagnosticos) {
    const key = diag.code || diag.diagnosisCatalog?.code || "UNKNOWN"
    if (!frecuencias.has(key)) {
      frecuencias.set(key, {
        diagnosisId: diag.diagnosisId,
        code: key,
        label: diag.label || diag.diagnosisCatalog?.name || "Sin etiqueta",
        count: 0,
      })
    }
    frecuencias.get(key)!.count++
  }

  const topDiagnosticos = Array.from(frecuencias.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((d) => ({
      diagnosisId: d.diagnosisId,
      code: d.code,
      label: d.label,
      frecuencia: d.count,
    }))

  // Relación diagnóstico-procedimiento
  const relaciones = new Map<string, number>()

  for (const diag of diagnosticos) {
    if (!diag.consulta) continue

    const diagKey = diag.code || diag.diagnosisCatalog?.code || "UNKNOWN"
    const diagLabel = diag.label || diag.diagnosisCatalog?.name || "Sin etiqueta"

    for (const proc of diag.consulta.procedimientos) {
      const procCode = proc.catalogo?.code || "UNKNOWN"
      const procNombre = proc.catalogo?.nombre || proc.serviceType || "Sin nombre"
      const key = `${diagKey}|${diagLabel}|${procCode}|${procNombre}`

      relaciones.set(key, (relaciones.get(key) || 0) + 1)
    }
  }

  const relacionDiagnosticoProcedimiento = Array.from(relaciones.entries())
    .map(([key, frecuencia]) => {
      const [diagnosisCode, diagnosisLabel, procedureCode, procedureNombre] = key.split("|")
      return {
        diagnosisCode,
        diagnosisLabel,
        procedureCode,
        procedureNombre,
        frecuencia,
      }
    })
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .slice(0, 20)

  return {
    diagnosticosActivos,
    diagnosticosResueltos,
    topDiagnosticos,
    relacionDiagnosticoProcedimiento,
  }
}
