// src/lib/services/reportes/procedimientos.service.ts
/**
 * Performed Procedures Report Service
 * Provides detailed listing of clinical procedures with monetary values.
 */

import { prisma } from "@/lib/prisma"
import type {
  ProcedimientosFilters,
  ProcedimientosResponse,
  ProcedimientoRealizadoRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type ProcedimientosService,
} from "./types"
import type { Prisma } from "@prisma/client"

/**
 * Build Prisma where clause based on filters and user context (RBAC).
 */
function buildWhereClause(
  filters: ProcedimientosFilters,
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
  if (filters.procedimientoIds && filters.procedimientoIds.length > 0) {
    where.procedureId = { in: filters.procedimientoIds }
  }

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

  if (filters.pacienteIds && filters.pacienteIds.length > 0) {
    where.consulta = {
      ...where.consulta as Prisma.ConsultaWhereInput,
      cita: {
        ...((where.consulta as Prisma.ConsultaWhereInput)?.cita as Prisma.CitaWhereInput),
        pacienteId: { in: filters.pacienteIds },
      },
    }
  }

  if (filters.soloConValor) {
    where.totalCents = { gt: 0 }
  }

  return where
}

/**
 * Calculate KPIs for the procedures report.
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

  const totalProcedimientos = procedimientos.length
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

  // Unique patients
  const uniquePatients = await prisma.consultaProcedimiento.findMany({
    where,
    select: {
      consulta: {
        select: {
          cita: {
            select: { pacienteId: true },
          },
        },
      },
    },
    distinct: ["consultaId"],
  })

  const uniquePatientsCount = new Set(
    uniquePatients.map((p) => p.consulta.cita.pacienteId)
  ).size

  return [
    {
      id: "total-registros",
      label: "Registros de Procedimientos",
      value: totalProcedimientos,
      format: "number",
      helpText: "Total de registros de procedimientos realizados",
    },
    {
      id: "total-cantidad",
      label: "Cantidad Total",
      value: totalCantidad,
      format: "number",
      helpText: "Suma de todas las cantidades realizadas",
    },
    {
      id: "tipos-unicos",
      label: "Tipos de Procedimientos",
      value: uniqueProcedures.length,
      format: "number",
      helpText: "Número de procedimientos diferentes realizados",
    },
    {
      id: "pacientes-unicos",
      label: "Pacientes Atendidos",
      value: uniquePatientsCount,
      format: "number",
      helpText: "Número de pacientes únicos que recibieron procedimientos",
    },
    {
      id: "ingresos-totales",
      label: "Ingresos Totales",
      value: totalIngresos,
      format: "currency",
      helpText: "Suma total de valores de procedimientos (en céntimos)",
      variant: "success",
    },
  ]
}

/**
 * Fetch paginated procedures data.
 */
async function fetchProcedures(
  where: Prisma.ConsultaProcedimientoWhereInput,
  page: number,
  pageSize: number
): Promise<{ data: ProcedimientoRealizadoRow[]; total: number }> {
  const [procedimientos, total] = await Promise.all([
    prisma.consultaProcedimiento.findMany({
      where,
      include: {
        catalogo: true,
        consulta: {
          include: {
            performedBy: {
              include: {
                persona: true,
              },
            },
            cita: {
              include: {
                paciente: {
                  include: {
                    persona: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.consultaProcedimiento.count({ where }),
  ])

  const data: ProcedimientoRealizadoRow[] = procedimientos.map((proc) => ({
    idConsultaProcedimiento: proc.idConsultaProcedimiento,
    fecha: proc.consulta.cita.inicio.toISOString(),
    procedimiento: {
      idProcedimiento: proc.catalogo?.idProcedimiento,
      codigo: proc.catalogo?.code,
      nombre: proc.catalogo?.nombre ?? proc.serviceType ?? "Procedimiento sin nombre",
    },
    paciente: {
      idPaciente: proc.consulta.cita.paciente.idPaciente,
      nombreCompleto: `${proc.consulta.cita.paciente.persona.nombres} ${proc.consulta.cita.paciente.persona.apellidos}`,
    },
    profesional: {
      idProfesional: proc.consulta.performedBy.idProfesional,
      nombreCompleto: `${proc.consulta.performedBy.persona.nombres} ${proc.consulta.performedBy.persona.apellidos}`,
    },
    cantidad: proc.quantity,
    precioUnitarioCents: proc.unitPriceCents ?? undefined,
    totalCents: proc.totalCents ?? undefined,
    diente: proc.toothNumber ?? undefined,
    superficie: proc.toothSurface ?? undefined,
  }))

  return { data, total }
}

/**
 * Performed Procedures Service implementation.
 */
export const procedimientosService: ProcedimientosService = {
  reportType: "procedimientos",

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

      const page = filters.page ?? 1
      const pageSize = filters.pageSize ?? 20

      // Build query with RBAC
      const where = buildWhereClause(filters, user)

      // Execute queries in parallel
      const [kpis, { data, total }] = await Promise.all([
        calculateKpis(where),
        fetchProcedures(where, page, pageSize),
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
        reportType: "procedimientos",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: ProcedimientosResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[ProcedimientosService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar los procedimientos",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

