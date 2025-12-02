// src/lib/services/reportes/citas-summary.service.ts
/**
 * Citas Summary Report Service
 * Provides appointment summary with KPIs and detailed listing.
 */

import { prisma } from "@/lib/prisma"
import type {
  CitasSummaryFilters,
  CitasSummaryResponse,
  CitaSummaryRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type CitasSummaryService,
} from "./types"
import type { Prisma } from "@prisma/client"

/**
 * Build Prisma where clause based on filters and user context (RBAC).
 */
function buildWhereClause(
  filters: CitasSummaryFilters,
  user: ReportUserContext
): Prisma.CitaWhereInput {
  const where: Prisma.CitaWhereInput = {
    inicio: {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    },
  }

  // Apply RBAC scoping
  if (user.role === "ODONT" && user.profesionalId) {
    where.profesionalId = user.profesionalId
  }

  // Apply optional filters
  if (filters.estados && filters.estados.length > 0) {
    where.estado = { in: filters.estados }
  }

  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    // For ODONT, ensure they can only see their own
    if (user.role === "ODONT" && user.profesionalId) {
      where.profesionalId = user.profesionalId
    } else {
      where.profesionalId = { in: filters.profesionalIds }
    }
  }

  if (filters.consultorioIds && filters.consultorioIds.length > 0) {
    where.consultorioId = { in: filters.consultorioIds }
  }

  if (filters.tipos && filters.tipos.length > 0) {
    where.tipo = { in: filters.tipos }
  }

  return where
}

/**
 * Calculate KPIs for the appointment summary.
 */
async function calculateKpis(
  where: Prisma.CitaWhereInput,
  filters: CitasSummaryFilters
): Promise<ReportKpi[]> {
  // Get counts by status
  const statusCounts = await prisma.cita.groupBy({
    by: ["estado"],
    where,
    _count: { idCita: true },
  })

  const totalCitas = statusCounts.reduce((sum, s) => sum + s._count.idCita, 0)
  const completadas = statusCounts.find((s) => s.estado === "COMPLETED")?._count.idCita ?? 0
  const canceladas = statusCounts.find((s) => s.estado === "CANCELLED")?._count.idCita ?? 0
  const noShows = statusCounts.find((s) => s.estado === "NO_SHOW")?._count.idCita ?? 0

  // Calculate previous period for comparison
  const periodLength = new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()
  const previousStart = new Date(new Date(filters.startDate).getTime() - periodLength)
  const previousEnd = new Date(new Date(filters.startDate).getTime() - 1)

  const previousWhere: Prisma.CitaWhereInput = {
    ...where,
    inicio: {
      gte: previousStart,
      lte: previousEnd,
    },
  }

  const previousTotal = await prisma.cita.count({ where: previousWhere })
  const delta = totalCitas - previousTotal
  const deltaPercent = previousTotal > 0 ? ((delta / previousTotal) * 100) : 0

  return [
    {
      id: "total-citas",
      label: "Total de Citas",
      value: totalCitas,
      format: "number",
      helpText: "Número total de citas en el período seleccionado",
      comparison: {
        previousValue: previousTotal,
        delta,
        deltaPercent,
      },
    },
    {
      id: "citas-completadas",
      label: "Completadas",
      value: completadas,
      format: "number",
      variant: "success",
      helpText: "Citas finalizadas exitosamente",
    },
    {
      id: "tasa-completadas",
      label: "Tasa de Completadas",
      value: totalCitas > 0 ? (completadas / totalCitas) * 100 : 0,
      format: "percent",
      decimals: 1,
      helpText: "Porcentaje de citas completadas sobre el total",
    },
    {
      id: "cancelaciones",
      label: "Canceladas",
      value: canceladas,
      format: "number",
      variant: canceladas > totalCitas * 0.2 ? "danger" : "default",
      helpText: "Citas canceladas en el período",
    },
    {
      id: "no-shows",
      label: "No Asistieron",
      value: noShows,
      format: "number",
      variant: noShows > totalCitas * 0.1 ? "warning" : "default",
      helpText: "Pacientes que no asistieron a su cita",
    },
  ]
}

/**
 * Fetch paginated appointment data.
 */
async function fetchAppointments(
  where: Prisma.CitaWhereInput,
  page: number,
  pageSize: number
): Promise<{ data: CitaSummaryRow[]; total: number }> {
  const [citas, total] = await Promise.all([
    prisma.cita.findMany({
      where,
      include: {
        paciente: {
          include: {
            persona: {
              include: {
                documento: true,
              },
            },
          },
        },
        profesional: {
          include: {
            persona: true,
          },
        },
        consultorio: true,
      },
      orderBy: { inicio: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cita.count({ where }),
  ])

  const data: CitaSummaryRow[] = citas.map((cita) => ({
    idCita: cita.idCita,
    inicio: cita.inicio.toISOString(),
    fin: cita.fin.toISOString(),
    estado: cita.estado,
    tipo: cita.tipo,
    paciente: {
      idPaciente: cita.paciente.idPaciente,
      nombreCompleto: `${cita.paciente.persona.nombres} ${cita.paciente.persona.apellidos}`,
      documento: cita.paciente.persona.documento?.numero,
    },
    profesional: {
      idProfesional: cita.profesional.idProfesional,
      nombreCompleto: `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`,
    },
    consultorio: cita.consultorio
      ? {
          idConsultorio: cita.consultorio.idConsultorio,
          nombre: cita.consultorio.nombre,
        }
      : undefined,
    motivo: cita.motivo ?? undefined,
  }))

  return { data, total }
}

/**
 * Citas Summary Service implementation.
 */
export const citasSummaryService: CitasSummaryService = {
  reportType: "citas-summary",

  async execute(filters, user) {
    const startTime = performance.now()

    try {
      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20

      // Build query with RBAC
      const where = buildWhereClause(filters, user)

      // Execute queries in parallel
      const [kpis, { data, total }] = await Promise.all([
        calculateKpis(where, filters),
        fetchAppointments(where, page, pageSize),
      ])

      const executionTime = performance.now() - startTime

      // Build pagination meta
      const pagination: PaginationMeta = {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPreviousPage: page > 1,
      }

      // Build metadata
      const metadata: ReportMetadata = {
        reportType: "citas-summary",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: CitasSummaryResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[CitasSummaryService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar las citas",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

