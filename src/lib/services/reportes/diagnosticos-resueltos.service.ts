// src/lib/services/reportes/diagnosticos-resueltos.service.ts
/**
 * Resolved Diagnoses Report Service
 * Provides listing of resolved diagnoses with resolution time metrics and therapeutic success audit.
 */

import { prisma } from "@/lib/prisma"
import type {
  DiagnosticosResueltosFilters,
  DiagnosticosResueltosResponse,
  DiagnosticoResueltoRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type DiagnosticosResueltosService,
} from "./types"
import type { Prisma } from "@prisma/client"

/**
 * Calculate age from birth date.
 */
function calcularEdad(fechaNacimiento: Date | null): number | undefined {
  if (!fechaNacimiento) return undefined
  const today = new Date()
  let age = today.getFullYear() - fechaNacimiento.getFullYear()
  const monthDiff = today.getMonth() - fechaNacimiento.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < fechaNacimiento.getDate())) {
    age--
  }
  return age
}

/**
 * Calculate days between two dates.
 */
function calcularDiasEntre(fechaInicio: Date, fechaFin: Date): number {
  const diffTime = fechaFin.getTime() - fechaInicio.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Build Prisma where clause based on filters and user context.
 */
function buildWhereClause(
  filters: DiagnosticosResueltosFilters,
  user: ReportUserContext
): Prisma.PatientDiagnosisWhereInput {
  const where: Prisma.PatientDiagnosisWhereInput = {
    status: "RESOLVED", // Always filter by resolved status
    resolvedAt: { not: null }, // Must have resolution date
  }

  // RBAC: ODONT can only see diagnoses of patients they have treated
  if (user.role === "ODONT" && user.profesionalId) {
    where.paciente = {
      citas: {
        some: {
          profesionalId: user.profesionalId,
        },
      },
    }
  }

  // Patient filter
  if (filters.pacienteIds && filters.pacienteIds.length > 0) {
    where.pacienteId = { in: filters.pacienteIds }
  }

  // Diagnosis catalog filter
  if (filters.diagnosisCatalogIds && filters.diagnosisCatalogIds.length > 0) {
    where.diagnosisId = { in: filters.diagnosisCatalogIds }
  }

  // Professional filter (who created the diagnosis)
  // Need to filter by Usuario -> Profesional relationship
  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    where.createdBy = {
      profesional: {
        idProfesional: { in: filters.profesionalIds },
      },
    }
  }

  // Date range filter (resolvedAt) - using startDate and endDate from DateRangeFilter
  if (filters.startDate || filters.endDate) {
    where.resolvedAt = {}
    if (filters.startDate) {
      where.resolvedAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999) // Include full day
      where.resolvedAt.lte = endDate
    }
  }

  // Search filter (patient name or diagnosis code/label)
  if (filters.busqueda && filters.busqueda.trim()) {
    const search = filters.busqueda.trim().toLowerCase()
    where.OR = [
      { paciente: { persona: { nombres: { contains: search, mode: "insensitive" } } } },
      { paciente: { persona: { apellidos: { contains: search, mode: "insensitive" } } } },
      { paciente: { persona: { documento: { numero: { contains: search, mode: "insensitive" } } } } },
      { label: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { diagnosisCatalog: { code: { contains: search, mode: "insensitive" } } },
      { diagnosisCatalog: { name: { contains: search, mode: "insensitive" } } },
    ]
  }

  return where
}

/**
 * Calculate KPIs for the resolved diagnoses report.
 */
async function calculateKpis(
  where: Prisma.PatientDiagnosisWhereInput
): Promise<ReportKpi[]> {
  // Get all resolved diagnoses for calculations
  const diagnoses = await prisma.patientDiagnosis.findMany({
    where,
    select: {
      notedAt: true,
      resolvedAt: true,
      diagnosisId: true,
      createdBy: {
        select: {
          profesional: {
            select: {
              idProfesional: true,
            },
          },
        },
      },
    },
  })

  // Filter out any with null resolvedAt (shouldn't happen but safety check)
  const validDiagnoses = diagnoses.filter((d) => d.resolvedAt !== null) as Array<{
    notedAt: Date
    resolvedAt: Date
    diagnosisId: number | null
    createdBy: {
      profesional: { idProfesional: number } | null
    }
  }>

  // Total resolved diagnoses
  const totalDiagnosticos = validDiagnoses.length

  // Calculate resolution times
  const tiemposResolucion = validDiagnoses.map((d) =>
    calcularDiasEntre(d.notedAt, d.resolvedAt)
  )

  const tiempoPromedio =
    tiemposResolucion.length > 0
      ? tiemposResolucion.reduce((sum, days) => sum + days, 0) / tiemposResolucion.length
      : 0

  const tiempoMinimo = tiemposResolucion.length > 0 ? Math.min(...tiemposResolucion) : 0
  const tiempoMaximo = tiemposResolucion.length > 0 ? Math.max(...tiemposResolucion) : 0

  // Group by professional (createdBy -> Profesional)
  const profesionalesUnicos = new Set(
    validDiagnoses
      .map((d) => d.createdBy.profesional?.idProfesional)
      .filter((id): id is number => id !== undefined && id !== null)
  ).size

  // Group by catalog vs free text
  const diagnosticosConCatalogo = validDiagnoses.filter((d) => d.diagnosisId !== null).length
  const diagnosticosSinCatalogo = totalDiagnosticos - diagnosticosConCatalogo

  // Distribution by resolution speed
  const rapidos = tiemposResolucion.filter((dias) => dias < 30).length
  const normales = tiemposResolucion.filter((dias) => dias >= 30 && dias <= 90).length
  const lentos = tiemposResolucion.filter((dias) => dias > 90).length

  return [
    {
      id: "total-diagnosticos",
      label: "Total Diagnósticos Resueltos",
      value: totalDiagnosticos,
      format: "number",
      helpText: "Número total de diagnósticos resueltos en el período",
    },
    {
      id: "tiempo-promedio",
      label: "Tiempo Promedio de Resolución",
      value: Math.round(tiempoPromedio),
      format: "number",
      unit: "días",
      helpText: "Promedio de días entre registro y resolución",
    },
    {
      id: "tiempo-minimo",
      label: "Tiempo Mínimo",
      value: tiempoMinimo,
      format: "number",
      unit: "días",
      variant: "success",
      helpText: "Menor tiempo de resolución",
    },
    {
      id: "tiempo-maximo",
      label: "Tiempo Máximo",
      value: tiempoMaximo,
      format: "number",
      unit: "días",
      variant: tiempoMaximo > 180 ? "warning" : "default",
      helpText: "Mayor tiempo de resolución",
    },
    {
      id: "profesionales",
      label: "Profesionales",
      value: profesionalesUnicos,
      format: "number",
      helpText: "Número de profesionales que resolvieron diagnósticos",
    },
    {
      id: "con-catalogo",
      label: "Con Catálogo",
      value: diagnosticosConCatalogo,
      format: "number",
      helpText: "Diagnósticos vinculados a catálogo",
    },
    {
      id: "sin-catalogo",
      label: "Sin Catálogo",
      value: diagnosticosSinCatalogo,
      format: "number",
      variant: diagnosticosSinCatalogo > 0 ? "warning" : "default",
      helpText: "Diagnósticos sin catálogo (texto libre)",
    },
    {
      id: "rapidos",
      label: "Rápidos (<30 días)",
      value: rapidos,
      format: "number",
      variant: "success",
      helpText: "Diagnósticos resueltos en menos de 30 días",
    },
    {
      id: "normales",
      label: "Normales (30-90 días)",
      value: normales,
      format: "number",
      variant: "default",
      helpText: "Diagnósticos resueltos entre 30 y 90 días",
    },
    {
      id: "lentos",
      label: "Lentos (>90 días)",
      value: lentos,
      format: "number",
      variant: lentos > 0 ? "warning" : "default",
      helpText: "Diagnósticos resueltos en más de 90 días",
    },
  ]
}

/**
 * Fetch paginated resolved diagnosis data.
 */
async function fetchDiagnoses(
  where: Prisma.PatientDiagnosisWhereInput,
  filters: DiagnosticosResueltosFilters,
  page: number,
  pageSize: number
): Promise<{ data: DiagnosticoResueltoRow[]; total: number }> {
  const [diagnoses, total] = await Promise.all([
    prisma.patientDiagnosis.findMany({
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
        diagnosisCatalog: true,
        createdBy: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
        consulta: {
          select: {
            citaId: true,
            cita: {
              select: {
                inicio: true,
              },
            },
          },
        },
      },
      orderBy: { resolvedAt: "desc" }, // Most recently resolved first
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patientDiagnosis.count({ where }),
  ])

  // Process data
  const data: DiagnosticoResueltoRow[] = diagnoses
    .filter((diagnosis) => diagnosis.resolvedAt !== null) // Safety check
    .map((diagnosis) => {
      const edad = calcularEdad(diagnosis.paciente.persona.fechaNacimiento)
      const resolvedAt = diagnosis.resolvedAt as Date // We know it's not null from filter
      const tiempoResolucionDias = calcularDiasEntre(diagnosis.notedAt, resolvedAt)

      // Validate business logic: resolvedAt >= notedAt
      if (tiempoResolucionDias < 0) {
        console.warn(
          `[DiagnosticosResueltosService] Invalid diagnosis ${diagnosis.idPatientDiagnosis}: resolvedAt < notedAt`
        )
      }

      return {
        idPatientDiagnosis: diagnosis.idPatientDiagnosis,
        paciente: {
          idPaciente: diagnosis.paciente.idPaciente,
          nombreCompleto: `${diagnosis.paciente.persona.nombres} ${diagnosis.paciente.persona.apellidos}`,
          documento: diagnosis.paciente.persona.documento?.numero,
          edad,
        },
        diagnostico: {
          id: diagnosis.idPatientDiagnosis,
          code: diagnosis.code ?? undefined,
          label: diagnosis.label,
          status: diagnosis.status,
          notedAt: diagnosis.notedAt.toISOString(),
          resolvedAt: resolvedAt.toISOString(),
        },
        diagnosisCatalog: diagnosis.diagnosisCatalog
          ? {
              id: diagnosis.diagnosisCatalog.idDiagnosisCatalog,
              code: diagnosis.diagnosisCatalog.code,
              name: diagnosis.diagnosisCatalog.name,
            }
          : undefined,
        createdBy: {
          idUsuario: diagnosis.createdBy.idUsuario,
          nombreApellido: diagnosis.createdBy.nombreApellido,
        },
        consulta: diagnosis.consulta
          ? {
              idCita: diagnosis.consulta.citaId,
              fecha: diagnosis.consulta.cita.inicio.toISOString(),
            }
          : undefined,
        fechaRegistro: diagnosis.notedAt.toISOString(),
        fechaResolucion: resolvedAt.toISOString(),
        tiempoResolucionDias,
      }
    })

  return { data, total }
}

/**
 * Resolved Diagnoses Service implementation.
 */
export const diagnosticosResueltosService: DiagnosticosResueltosService = {
  reportType: "diagnosticos-resueltos",

  async execute(filters, user) {
    const startTime = performance.now()

    try {
      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20

      // Build query with RBAC
      const where = buildWhereClause(filters, user)

      // Execute queries in parallel
      const [kpis, { data, total }] = await Promise.all([
        calculateKpis(where),
        fetchDiagnoses(where, filters, page, pageSize),
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
        reportType: "diagnosticos-resueltos",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: DiagnosticosResueltosResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[DiagnosticosResueltosService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar los diagnósticos resueltos",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

