// src/lib/services/reportes/diagnosticos-por-tipo.service.ts
/**
 * Diagnoses by Type Report Service
 * Provides epidemiological analysis of diagnoses grouped by type (catalog).
 */

import { prisma } from "@/lib/prisma"
import type {
  DiagnosticosPorTipoFilters,
  DiagnosticosPorTipoResponse,
  DiagnosticoPorTipoRow,
  ReportKpi,
  ReportUserContext,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type DiagnosticosPorTipoService,
} from "./types"
import type { Prisma } from "@prisma/client"

/**
 * Build Prisma where clause based on filters and user context (RBAC).
 */
function buildWhereClause(
  filters: DiagnosticosPorTipoFilters,
  user: ReportUserContext
): Prisma.PatientDiagnosisWhereInput {
  const where: Prisma.PatientDiagnosisWhereInput = {
    notedAt: {
      gte: new Date(filters.startDate),
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    },
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

  // Diagnosis catalog filter
  if (filters.diagnosisCatalogIds && filters.diagnosisCatalogIds.length > 0) {
    where.diagnosisId = { in: filters.diagnosisCatalogIds }
  }

  // Professional filter (who created the diagnosis)
  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    if (user.role === "ODONT" && user.profesionalId) {
      // ODONT can only see their own
      where.createdBy = {
        profesional: {
          idProfesional: user.profesionalId,
        },
      }
    } else {
      where.createdBy = {
        profesional: {
          idProfesional: { in: filters.profesionalIds },
        },
      }
    }
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status as Prisma.EnumDiagnosisStatusFilter["in"] }
  }

  return where
}

/**
 * Calculate KPIs for the diagnoses by type report.
 */
async function calculateKpis(
  where: Prisma.PatientDiagnosisWhereInput
): Promise<ReportKpi[]> {
  // Total diagnoses
  const totalDiagnosticos = await prisma.patientDiagnosis.count({ where })

  // Group by diagnosis catalog to get unique types
  const groupedByCatalog = await prisma.patientDiagnosis.groupBy({
    by: ["diagnosisId"],
    where,
    _count: { idPatientDiagnosis: true },
  })

  // Count unique diagnosis types (including null for non-catalog diagnoses)
  const tiposUnicos = groupedByCatalog.length

  // Find most and least frequent
  const counts = groupedByCatalog.map((g) => g._count.idPatientDiagnosis)
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0
  const minCount = counts.length > 0 ? Math.min(...counts) : 0

  // Get diagnosis catalog info for most frequent
  const mostFrequentGroup = groupedByCatalog.find(
    (g) => g._count.idPatientDiagnosis === maxCount && g.diagnosisId !== null
  )
  let masFrecuente = "N/A"
  if (mostFrequentGroup?.diagnosisId) {
    const catalog = await prisma.diagnosisCatalog.findUnique({
      where: { idDiagnosisCatalog: mostFrequentGroup.diagnosisId },
      select: { name: true, code: true },
    })
    if (catalog) {
      masFrecuente = `${catalog.code} - ${catalog.name}`
    }
  }

  // Get diagnosis catalog info for least frequent
  const leastFrequentGroup = groupedByCatalog.find(
    (g) => g._count.idPatientDiagnosis === minCount && g.diagnosisId !== null
  )
  let menosFrecuente = "N/A"
  if (leastFrequentGroup?.diagnosisId) {
    const catalog = await prisma.diagnosisCatalog.findUnique({
      where: { idDiagnosisCatalog: leastFrequentGroup.diagnosisId },
      select: { name: true, code: true },
    })
    if (catalog) {
      menosFrecuente = `${catalog.code} - ${catalog.name}`
    }
  }

  // Average cases per type
  const promedioPorTipo = tiposUnicos > 0 ? totalDiagnosticos / tiposUnicos : 0

  return [
    {
      id: "total-diagnosticos",
      label: "Total Diagnósticos",
      value: totalDiagnosticos,
      format: "number",
      helpText: "Número total de diagnósticos en el período",
    },
    {
      id: "tipos-unicos",
      label: "Tipos Únicos",
      value: tiposUnicos,
      format: "number",
      helpText: "Número de tipos de diagnósticos diferentes",
    },
    {
      id: "mas-frecuente",
      label: "Más Frecuente",
      value: masFrecuente,
      helpText: "Diagnóstico con mayor cantidad de casos",
    },
    {
      id: "menos-frecuente",
      label: "Menos Frecuente",
      value: menosFrecuente,
      helpText: "Diagnóstico con menor cantidad de casos",
    },
    {
      id: "promedio-por-tipo",
      label: "Promedio por Tipo",
      value: promedioPorTipo,
      format: "number",
      decimals: 1,
      helpText: "Promedio de casos por tipo de diagnóstico",
    },
  ]
}



/**
 * Fetch diagnoses grouped by type.
 */
async function fetchDiagnosesByType(
  where: Prisma.PatientDiagnosisWhereInput
): Promise<DiagnosticoPorTipoRow[]> {
  // Group by diagnosis catalog
  const grouped = await prisma.patientDiagnosis.groupBy({
    by: ["diagnosisId"],
    where,
    _count: { idPatientDiagnosis: true },
    _min: { notedAt: true },
    _max: { notedAt: true },
  })

  // Get all diagnosis catalog IDs
  const catalogIds = grouped
    .map((g) => g.diagnosisId)
    .filter((id): id is number => id !== null)

  // Fetch catalog information
  const catalogs = await prisma.diagnosisCatalog.findMany({
    where: { idDiagnosisCatalog: { in: catalogIds } },
    select: {
      idDiagnosisCatalog: true,
      code: true,
      name: true,
    },
  })

  const catalogMap = new Map(
    catalogs.map((c) => [c.idDiagnosisCatalog, c])
  )

  // Process non-catalog diagnoses (group by code and label) - fetch first to get count
  const nonCatalogDiagnoses = await prisma.patientDiagnosis.findMany({
    where: {
      ...where,
      diagnosisId: null,
    },
    select: {
      code: true,
      label: true,
      notedAt: true,
    },
  })

  // Group non-catalog diagnoses by code and label
  const nonCatalogMap = new Map<string, { count: number; first: Date; last: Date }>()
  nonCatalogDiagnoses.forEach((d) => {
    const key = `${d.code || ""}|${d.label}`
    const existing = nonCatalogMap.get(key)
    if (existing) {
      existing.count++
      if (d.notedAt < existing.first) existing.first = d.notedAt
      if (d.notedAt > existing.last) existing.last = d.notedAt
    } else {
      nonCatalogMap.set(key, {
        count: 1,
        first: d.notedAt,
        last: d.notedAt,
      })
    }
  })

  // Calculate total for percentage calculation (includes both catalog and non-catalog)
  const catalogTotal = grouped.reduce(
    (sum, g) => sum + g._count.idPatientDiagnosis,
    0
  )
  const nonCatalogTotal = nonCatalogDiagnoses.length
  const total = catalogTotal + nonCatalogTotal

  // Build rows
  const rows: DiagnosticoPorTipoRow[] = []

  // Process catalog diagnoses
  for (const group of grouped) {
    if (group.diagnosisId !== null) {
      const catalog = catalogMap.get(group.diagnosisId)
      if (catalog) {
        rows.push({
          ranking: 0, // Will be set after sorting
          diagnosisCatalog: {
            id: catalog.idDiagnosisCatalog,
            code: catalog.code,
            name: catalog.name,
          },
          totalCasos: group._count.idPatientDiagnosis,
          porcentaje: total > 0 ? (group._count.idPatientDiagnosis / total) * 100 : 0,
          primerRegistro: group._min.notedAt?.toISOString() ?? "",
          ultimoRegistro: group._max.notedAt?.toISOString() ?? "",
        })
      }
    }
  }

  // Add non-catalog rows
  for (const [key, data] of nonCatalogMap.entries()) {
    const [code, label] = key.split("|")
    rows.push({
      ranking: 0, // Will be set after sorting
      code: code || undefined,
      label: label || undefined,
      totalCasos: data.count,
      porcentaje: total > 0 ? (data.count / total) * 100 : 0,
      primerRegistro: data.first.toISOString(),
      ultimoRegistro: data.last.toISOString(),
    })
  }

  // Sort by total cases descending and assign rankings
  rows.sort((a, b) => b.totalCasos - a.totalCasos)
  rows.forEach((row, index) => {
    row.ranking = index + 1
  })

  return rows
}

/**
 * Diagnoses by Type Service implementation.
 */
export const diagnosticosPorTipoService: DiagnosticosPorTipoService = {
  reportType: "diagnosticos-por-tipo",

  async execute(filters, user) {
    const startTime = performance.now()

    try {
      // RBAC: Only ADMIN and ODONT can access this report
      if (user.role === "RECEP") {
        return createReportError(
          ReportErrorCode.FORBIDDEN,
          "No tiene permisos para acceder a este reporte"
        )
      }

      // Build query with RBAC
      const where = buildWhereClause(filters, user)

      // Execute queries in parallel
      const [kpis, data] = await Promise.all([
        calculateKpis(where),
        fetchDiagnosesByType(where),
      ])

      const executionTime = performance.now() - startTime

      // Build metadata
      const metadata: ReportMetadata = {
        reportType: "diagnosticos-por-tipo",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: DiagnosticosPorTipoResponse = {
        metadata,
        kpis,
        data,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[DiagnosticosPorTipoService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al generar el reporte de diagnósticos por tipo",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

