// src/lib/services/reportes/diagnosticos-activos.service.ts
/**
 * Active Diagnoses Report Service
 * Provides listing of active diagnoses with patient and diagnosis information.
 */

import { prisma } from "@/lib/prisma"
import type {
  DiagnosticosActivosFilters,
  DiagnosticosActivosResponse,
  DiagnosticoActivoRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type DiagnosticosActivosService,
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
 * Calculate days since a date.
 */
function calcularDiasDesde(fecha: Date): number {
  const today = new Date()
  const diffTime = today.getTime() - fecha.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Build Prisma where clause based on filters and user context.
 */
function buildWhereClause(
  filters: DiagnosticosActivosFilters,
  user: ReportUserContext
): Prisma.PatientDiagnosisWhereInput {
  const where: Prisma.PatientDiagnosisWhereInput = {
    status: "ACTIVE", // Always filter by active status
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

  // Date range filter (notedAt) - using startDate and endDate from DateRangeFilter
  if (filters.startDate || filters.endDate) {
    where.notedAt = {}
    if (filters.startDate) {
      where.notedAt.gte = new Date(filters.startDate)
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      endDate.setHours(23, 59, 59, 999) // Include full day
      where.notedAt.lte = endDate
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
 * Calculate KPIs for the active diagnoses report.
 */
async function calculateKpis(
  where: Prisma.PatientDiagnosisWhereInput
): Promise<ReportKpi[]> {
  // Total active diagnoses
  const totalDiagnosticos = await prisma.patientDiagnosis.count({ where })

  // Group by diagnosis catalog
  const diagnosticosPorCatalogo = await prisma.patientDiagnosis.groupBy({
    where,
    by: ["diagnosisId"],
    _count: true,
  })

  const diagnosticosConCatalogo = diagnosticosPorCatalogo.filter((d) => d.diagnosisId !== null).length
  const diagnosticosSinCatalogo = totalDiagnosticos - diagnosticosConCatalogo

  // Group by professional (createdBy -> Profesional)
  // We need to count unique profesionales, not usuarios
  const diagnosticosConProfesional = await prisma.patientDiagnosis.findMany({
    where: {
      ...where,
      createdBy: {
        profesional: {
          isNot: null,
        },
      },
    },
    select: {
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
    distinct: ["createdByUserId"],
  })

  const profesionalesUnicos = new Set(
    diagnosticosConProfesional
      .map((d) => d.createdBy.profesional?.idProfesional)
      .filter((id): id is number => id !== undefined && id !== null)
  ).size

  // Group by age ranges (based on notedAt)
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const diagnosticosRecientes = await prisma.patientDiagnosis.count({
    where: {
      ...where,
      notedAt: { gte: thirtyDaysAgo },
    },
  })

  const diagnosticosIntermedios = await prisma.patientDiagnosis.count({
    where: {
      ...where,
      notedAt: {
        gte: ninetyDaysAgo,
        lt: thirtyDaysAgo,
      },
    },
  })

  const diagnosticosAntiguos = await prisma.patientDiagnosis.count({
    where: {
      ...where,
      notedAt: { lt: ninetyDaysAgo },
    },
  })

  return [
    {
      id: "total-diagnosticos",
      label: "Total Diagnósticos Activos",
      value: totalDiagnosticos,
      format: "number",
      helpText: "Número total de diagnósticos activos en el sistema",
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
      id: "profesionales",
      label: "Profesionales",
      value: profesionalesUnicos,
      format: "number",
      helpText: "Número de profesionales que han registrado diagnósticos",
    },
    {
      id: "recientes",
      label: "Recientes (<30 días)",
      value: diagnosticosRecientes,
      format: "number",
      variant: "success",
      helpText: "Diagnósticos registrados en los últimos 30 días",
    },
    {
      id: "intermedios",
      label: "Intermedios (30-90 días)",
      value: diagnosticosIntermedios,
      format: "number",
      variant: "default",
      helpText: "Diagnósticos registrados entre 30 y 90 días",
    },
    {
      id: "antiguos",
      label: "Antiguos (>90 días)",
      value: diagnosticosAntiguos,
      format: "number",
      variant: diagnosticosAntiguos > 0 ? "warning" : "default",
      helpText: "Diagnósticos registrados hace más de 90 días",
    },
  ]
}

/**
 * Fetch paginated diagnosis data.
 */
async function fetchDiagnoses(
  where: Prisma.PatientDiagnosisWhereInput,
  filters: DiagnosticosActivosFilters,
  page: number,
  pageSize: number
): Promise<{ data: DiagnosticoActivoRow[]; total: number }> {
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
      orderBy: { notedAt: "desc" }, // Most ancient first
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.patientDiagnosis.count({ where }),
  ])

  // Process data
  const data: DiagnosticoActivoRow[] = diagnoses.map((diagnosis) => {
    const edad = calcularEdad(diagnosis.paciente.persona.fechaNacimiento)
    const antiguedadDias = calcularDiasDesde(diagnosis.notedAt)

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
        resolvedAt: diagnosis.resolvedAt?.toISOString() ?? null,
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
      antiguedadDias,
    }
  })

  return { data, total }
}

/**
 * Active Diagnoses Service implementation.
 */
export const diagnosticosActivosService: DiagnosticosActivosService = {
  reportType: "diagnosticos-activos",

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
        reportType: "diagnosticos-activos",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: DiagnosticosActivosResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[DiagnosticosActivosService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar los diagnósticos",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

