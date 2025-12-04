// src/lib/services/reportes/top-procedimientos.service.ts
/**
 * Top Procedures Ranking Report Service
 * Provides ranking of most frequent and highest revenue procedures.
 */

import { prisma } from "@/lib/prisma"
import type {
  TopProcedimientosFilters,
  TopProcedimientosResponse,
  TopProcedimientoRow,
  ReportKpi,
  ReportUserContext,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type TopProcedimientosService,
} from "./types"
import type { Prisma } from "@prisma/client"

/**
 * Build Prisma where clause based on filters and user context (RBAC).
 */
function buildWhereClause(
  filters: TopProcedimientosFilters,
  user: ReportUserContext
): Prisma.ConsultaProcedimientoWhereInput {
  const where: Prisma.ConsultaProcedimientoWhereInput = {
    consulta: {
      cita: {
        inicio: {
          gte: new Date(filters.startDate),
          lte: new Date(`${filters.endDate}T23:59:59.999Z`),
        },
      },
    },
  }

  // RBAC: ODONT can only see their own procedures
  if (user.role === "ODONT" && user.profesionalId) {
    where.consulta = {
      ...where.consulta as Prisma.ConsultaWhereInput,
      performedById: user.profesionalId,
    }
  }

  // Apply optional filters
  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    if (user.role === "ODONT" && user.profesionalId) {
      // ODONT can only see their own
      where.consulta = {
        ...where.consulta as Prisma.ConsultaWhereInput,
        performedById: user.profesionalId,
      }
    } else {
      where.consulta = {
        ...where.consulta as Prisma.ConsultaWhereInput,
        performedById: { in: filters.profesionalIds },
      }
    }
  }

  return where
}

/**
 * Calculate KPIs for the top procedures report.
 * NOTA: Calcula ingresos usando jerarquía: totalCents > quantity * unitPriceCents > quantity * defaultPriceCents
 */
async function calculateKpis(
  where: Prisma.ConsultaProcedimientoWhereInput
): Promise<ReportKpi[]> {
  // Obtener procedimientos para calcular ingresos correctamente
  const procedimientos = await prisma.consultaProcedimiento.findMany({
    where,
    include: {
      catalogo: true,
    },
  })

  const totalRegistros = procedimientos.length
  const totalCantidad = procedimientos.reduce((sum, p) => sum + p.quantity, 0)
  
  // Calcular ingresos usando jerarquía: totalCents > quantity * unitPriceCents > quantity * defaultPriceCents
  let totalIngresos = 0
  for (const proc of procedimientos) {
    let precio = proc.totalCents

    if (precio === null && proc.unitPriceCents !== null) {
      precio = proc.quantity * proc.unitPriceCents
    }

    if (precio === null && proc.catalogo && proc.catalogo.defaultPriceCents !== null) {
      precio = proc.quantity * proc.catalogo.defaultPriceCents
    }

    if (precio !== null) {
      totalIngresos += precio
    }
  }

  // Unique procedures
  const uniqueProcedures = await prisma.consultaProcedimiento.groupBy({
    by: ["procedureId"],
    where,
    _count: true,
  })

  // Average revenue per procedure
  const avgRevenue = totalRegistros > 0 ? totalIngresos / totalRegistros : 0

  return [
    {
      id: "total-registros",
      label: "Total Registros",
      value: totalRegistros,
      format: "number",
      helpText: "Total de procedimientos registrados",
    },
    {
      id: "tipos-procedimientos",
      label: "Tipos de Procedimientos",
      value: uniqueProcedures.length,
      format: "number",
      helpText: "Número de procedimientos diferentes realizados",
    },
    {
      id: "total-cantidad",
      label: "Cantidad Total",
      value: totalCantidad,
      format: "number",
      helpText: "Suma de todas las cantidades",
    },
    {
      id: "ingresos-totales",
      label: "Ingresos Totales",
      value: totalIngresos,
      format: "currency",
      variant: "success",
      helpText: "Suma total de ingresos por procedimientos",
    },
    {
      id: "ingreso-promedio",
      label: "Ingreso Promedio",
      value: avgRevenue,
      format: "currency",
      helpText: "Ingreso promedio por registro de procedimiento",
    },
  ]
}

/**
 * Fetch top procedures ranking.
 * NOTA: Calcula ingresos usando jerarquía: totalCents > quantity * unitPriceCents > quantity * defaultPriceCents
 */
async function fetchTopProcedures(
  where: Prisma.ConsultaProcedimientoWhereInput,
  filters: TopProcedimientosFilters
): Promise<TopProcedimientoRow[]> {
  const limite = filters.limite ?? 10
  const ordenarPor = filters.ordenarPor ?? "cantidad"

  // Obtener procedimientos individuales para calcular ingresos correctamente
  const procedimientos = await prisma.consultaProcedimiento.findMany({
    where,
    include: {
      catalogo: true,
    },
  })

  // Get procedure names
  const procedureIds = procedimientos
    .map((p) => p.procedureId)
    .filter((id): id is number => id !== null)

  const procedures = await prisma.procedimientoCatalogo.findMany({
    where: { idProcedimiento: { in: procedureIds } },
    select: {
      idProcedimiento: true,
      code: true,
      nombre: true,
      defaultPriceCents: true,
    },
  })

  const procedureMap = new Map(
    procedures.map((p) => [p.idProcedimiento, p])
  )

  // Agrupar y calcular ingresos correctamente
  const ingresosPorProcedimiento = new Map<
    number,
    { cantidad: number; ingresos: number; nombre: string; code: string }
  >()

  for (const proc of procedimientos) {
    if (!proc.procedureId) continue

    // Calcular precio usando jerarquía: totalCents > quantity * unitPriceCents > quantity * defaultPriceCents
    let precio = proc.totalCents

    if (precio === null && proc.unitPriceCents !== null) {
      precio = proc.quantity * proc.unitPriceCents
    }

    if (precio === null && proc.catalogo && proc.catalogo.defaultPriceCents !== null) {
      precio = proc.quantity * proc.catalogo.defaultPriceCents
    }

    const procedimiento = procedureMap.get(proc.procedureId)
    const nombre = procedimiento?.nombre ?? proc.serviceType ?? "Sin nombre"
    const code = procedimiento?.code ?? ""

    if (!ingresosPorProcedimiento.has(proc.procedureId)) {
      ingresosPorProcedimiento.set(proc.procedureId, {
        cantidad: 0,
        ingresos: 0,
        nombre,
        code,
      })
    }

    const datos = ingresosPorProcedimiento.get(proc.procedureId)!
    datos.cantidad += proc.quantity
    if (precio !== null) {
      datos.ingresos += precio
    }
  }

  // Calcular totales para porcentajes
  const totalCantidad = Array.from(ingresosPorProcedimiento.values()).reduce(
    (sum, d) => sum + d.cantidad,
    0
  )
  const totalIngresos = Array.from(ingresosPorProcedimiento.values()).reduce(
    (sum, d) => sum + d.ingresos,
    0
  )

  // Build ranking data
  const rankingData = Array.from(ingresosPorProcedimiento.entries()).map(([id, datos]) => {
    const procedimiento = procedureMap.get(id)
    return {
      procedimiento: {
        idProcedimiento: procedimiento?.idProcedimiento,
        codigo: datos.code,
        nombre: datos.nombre,
      },
      cantidad: datos.cantidad,
      ingresosTotalCents: datos.ingresos,
      porcentajeCantidad: totalCantidad > 0 ? (datos.cantidad / totalCantidad) * 100 : 0,
      porcentajeIngresos: totalIngresos > 0 ? (datos.ingresos / totalIngresos) * 100 : 0,
    }
  })

  // Sort by specified criteria
  rankingData.sort((a, b) => {
    if (ordenarPor === "ingresos") {
      return b.ingresosTotalCents - a.ingresosTotalCents
    }
    return b.cantidad - a.cantidad
  })

  // Apply limit and add ranking
  return rankingData.slice(0, limite).map((item, index) => ({
    ranking: index + 1,
    ...item,
  }))
}

/**
 * Top Procedures Ranking Service implementation.
 */
export const topProcedimientosService: TopProcedimientosService = {
  reportType: "top-procedimientos",

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
        fetchTopProcedures(where, filters),
      ])

      const executionTime = performance.now() - startTime

      // Build metadata
      const metadata: ReportMetadata = {
        reportType: "top-procedimientos",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: TopProcedimientosResponse = {
        metadata,
        kpis,
        data,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[TopProcedimientosService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al generar ranking de procedimientos",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

