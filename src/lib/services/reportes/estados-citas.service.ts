// src/lib/services/reportes/estados-citas.service.ts
/**
 * Appointment Status Analysis Report Service
 * Provides analysis of appointment status distribution and trends.
 */

import { prisma } from "@/lib/prisma"
import type { EstadoCita } from "@prisma/client"
import type {
  EstadosCitasFilters,
  EstadosCitasResponse,
  EstadoCitaPeriodo,
  ReportKpi,
  ReportUserContext,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type EstadosCitasService,
} from "./types"
import type { Prisma } from "@prisma/client"

/** All possible appointment statuses */
const ESTADOS: EstadoCita[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]

/**
 * Build Prisma where clause based on filters and user context (RBAC).
 */
function buildWhereClause(
  filters: EstadosCitasFilters,
  user: ReportUserContext
): Prisma.CitaWhereInput {
  const where: Prisma.CitaWhereInput = {
    inicio: {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    },
  }

  // RBAC: ODONT can only see their own appointments
  if (user.role === "ODONT" && user.profesionalId) {
    where.profesionalId = user.profesionalId
  }

  // Apply optional filters
  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    if (user.role === "ODONT" && user.profesionalId) {
      // ODONT can only see their own
      where.profesionalId = user.profesionalId
    } else {
      where.profesionalId = { in: filters.profesionalIds }
    }
  }

  if (filters.consultorioIds && filters.consultorioIds.length > 0) {
    where.consultorioId = { in: filters.consultorioIds }
  }

  return where
}

/**
 * Calculate KPIs for the status analysis report.
 */
async function calculateKpis(
  where: Prisma.CitaWhereInput
): Promise<ReportKpi[]> {
  // Get counts by status
  const statusCounts = await prisma.cita.groupBy({
    by: ["estado"],
    where,
    _count: { idCita: true },
  })

  const total = statusCounts.reduce((sum, s) => sum + s._count.idCita, 0)
  const completadas = statusCounts.find((s) => s.estado === "COMPLETED")?._count.idCita ?? 0
  const canceladas = statusCounts.find((s) => s.estado === "CANCELLED")?._count.idCita ?? 0
  const noShows = statusCounts.find((s) => s.estado === "NO_SHOW")?._count.idCita ?? 0
  const enProgreso = statusCounts.find((s) => s.estado === "IN_PROGRESS")?._count.idCita ?? 0
  const pendientes = (
    (statusCounts.find((s) => s.estado === "SCHEDULED")?._count.idCita ?? 0) +
    (statusCounts.find((s) => s.estado === "CONFIRMED")?._count.idCita ?? 0) +
    (statusCounts.find((s) => s.estado === "CHECKED_IN")?._count.idCita ?? 0)
  )

  const tasaCompletadas = total > 0 ? (completadas / total) * 100 : 0
  const tasaCancelacion = total > 0 ? (canceladas / total) * 100 : 0
  const tasaNoShow = total > 0 ? (noShows / total) * 100 : 0

  return [
    {
      id: "total-citas",
      label: "Total de Citas",
      value: total,
      format: "number",
      helpText: "Total de citas analizadas en el período",
    },
    {
      id: "tasa-completadas",
      label: "Tasa de Éxito",
      value: tasaCompletadas,
      format: "percent",
      decimals: 1,
      variant: tasaCompletadas >= 80 ? "success" : tasaCompletadas >= 60 ? "warning" : "danger",
      helpText: "Porcentaje de citas completadas exitosamente",
    },
    {
      id: "tasa-cancelacion",
      label: "Tasa de Cancelación",
      value: tasaCancelacion,
      format: "percent",
      decimals: 1,
      variant: tasaCancelacion <= 10 ? "success" : tasaCancelacion <= 20 ? "warning" : "danger",
      helpText: "Porcentaje de citas canceladas",
    },
    {
      id: "tasa-no-show",
      label: "Tasa de No Asistencia",
      value: tasaNoShow,
      format: "percent",
      decimals: 1,
      variant: tasaNoShow <= 5 ? "success" : tasaNoShow <= 10 ? "warning" : "danger",
      helpText: "Porcentaje de pacientes que no asistieron",
    },
    {
      id: "pendientes",
      label: "Pendientes",
      value: pendientes,
      format: "number",
      helpText: "Citas agendadas, confirmadas o en check-in",
    },
    {
      id: "en-progreso",
      label: "En Progreso",
      value: enProgreso,
      format: "number",
      helpText: "Citas actualmente en atención",
    },
  ]
}

/**
 * Generate period labels and date ranges based on grouping.
 */
function generatePeriods(
  startDate: string,
  endDate: string,
  agruparPor: "dia" | "semana" | "mes"
): Array<{ label: string; start: Date; end: Date }> {
  const periods: Array<{ label: string; start: Date; end: Date }> = []
  const start = new Date(startDate)
  const end = new Date(`${endDate}T23:59:59.999Z`)

  let current = new Date(start)

  while (current <= end) {
    let periodEnd: Date
    let label: string

    switch (agruparPor) {
      case "dia":
        periodEnd = new Date(current)
        periodEnd.setHours(23, 59, 59, 999)
        label = current.toISOString().split("T")[0]
        break

      case "semana":
        periodEnd = new Date(current)
        periodEnd.setDate(periodEnd.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
        if (periodEnd > end) periodEnd = end
        label = `Sem ${current.toISOString().split("T")[0]}`
        break

      case "mes":
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999)
        if (periodEnd > end) periodEnd = end
        label = `${current.toLocaleString("es", { month: "short" })} ${current.getFullYear()}`
        break

      default:
        throw new Error(`Agrupación no soportada: ${agruparPor}`)
    }

    periods.push({
      label,
      start: new Date(current),
      end: periodEnd,
    })

    // Move to next period
    switch (agruparPor) {
      case "dia":
        current.setDate(current.getDate() + 1)
        break
      case "semana":
        current.setDate(current.getDate() + 7)
        break
      case "mes":
        current.setMonth(current.getMonth() + 1)
        current.setDate(1)
        break
    }
  }

  return periods
}

/**
 * Fetch status breakdown by periods.
 */
async function fetchStatusByPeriods(
  where: Prisma.CitaWhereInput,
  filters: EstadosCitasFilters
): Promise<{ data: EstadoCitaPeriodo[]; resumen: Array<{ estado: EstadoCita; cantidad: number; porcentaje: number }> }> {
  const periods = generatePeriods(filters.startDate, filters.endDate, filters.agruparPor ?? "semana")
  
  // Fetch all appointments in the range
  const citas = await prisma.cita.findMany({
    where,
    select: {
      inicio: true,
      estado: true,
    },
  })

  // Calculate overall summary
  const totalOverall = citas.length
  const overallCounts = ESTADOS.reduce((acc, estado) => {
    acc[estado] = citas.filter((c) => c.estado === estado).length
    return acc
  }, {} as Record<EstadoCita, number>)

  const resumen = ESTADOS.map((estado) => ({
    estado,
    cantidad: overallCounts[estado],
    porcentaje: totalOverall > 0 ? (overallCounts[estado] / totalOverall) * 100 : 0,
  }))

  // Calculate by period
  const data: EstadoCitaPeriodo[] = periods.map((period) => {
    const citasInPeriod = citas.filter(
      (c) => c.inicio >= period.start && c.inicio <= period.end
    )
    const totalPeriod = citasInPeriod.length

    const estadisticas = ESTADOS.map((estado) => {
      const cantidad = citasInPeriod.filter((c) => c.estado === estado).length
      return {
        estado,
        cantidad,
        porcentaje: totalPeriod > 0 ? (cantidad / totalPeriod) * 100 : 0,
      }
    })

    return {
      periodo: period.label,
      periodoInicio: period.start.toISOString(),
      periodoFin: period.end.toISOString(),
      estadisticas,
      total: totalPeriod,
    }
  })

  return { data, resumen }
}

/**
 * Appointment Status Analysis Service implementation.
 */
export const estadosCitasService: EstadosCitasService = {
  reportType: "estados-citas",

  async execute(filters, user) {
    const startTime = performance.now()

    try {
      // Build query with RBAC
      const where = buildWhereClause(filters, user)

      // Execute queries in parallel
      const [kpis, { data, resumen }] = await Promise.all([
        calculateKpis(where),
        fetchStatusByPeriods(where, filters),
      ])

      const executionTime = performance.now() - startTime

      // Build metadata
      const metadata: ReportMetadata = {
        reportType: "estados-citas",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: EstadosCitasResponse = {
        metadata,
        kpis,
        data,
        resumenGeneral: resumen,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[EstadosCitasService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al analizar estados de citas",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

