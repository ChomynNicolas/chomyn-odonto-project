// src/lib/services/reportes/pacientes-activos.service.ts
/**
 * Active Patients Report Service
 * Provides patient listing with activity status and demographics.
 */

import { prisma } from "@/lib/prisma"
import type {
  PacientesActivosFilters,
  PacientesActivosResponse,
  PacienteActivoRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type PacientesActivosService,
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
 * Build Prisma where clause based on filters and user context.
 */
function buildWhereClause(
  filters: PacientesActivosFilters,
  user: ReportUserContext
): Prisma.PacienteWhereInput {
  const where: Prisma.PacienteWhereInput = {
    estaActivo: true,
  }

  // RBAC: ODONT can only see patients they have treated
  if (user.role === "ODONT" && user.profesionalId) {
    where.citas = {
      some: {
        profesionalId: user.profesionalId,
      },
    }
  }

  // Gender filter
  if (filters.generos && filters.generos.length > 0) {
    where.persona = {
      ...where.persona as Prisma.PersonaWhereInput,
      genero: { in: filters.generos },
    }
  }

  // Age filters (will be applied post-query due to calculated field)
  // We'll handle this in the data processing

  // Search filter
  if (filters.busqueda && filters.busqueda.trim()) {
    const search = filters.busqueda.trim().toLowerCase()
    where.OR = [
      { persona: { nombres: { contains: search, mode: "insensitive" } } },
      { persona: { apellidos: { contains: search, mode: "insensitive" } } },
      { persona: { documento: { numero: { contains: search, mode: "insensitive" } } } },
    ]
  }

  // Only patients with pending appointments
  if (filters.soloConCitasPendientes) {
    where.citas = {
      some: {
        estado: { in: ["SCHEDULED", "CONFIRMED"] },
        inicio: { gte: new Date() },
      },
    }
  }

  return where
}

/**
 * Calculate KPIs for the active patients report.
 */
async function calculateKpis(
  where: Prisma.PacienteWhereInput,
  filters: PacientesActivosFilters
): Promise<ReportKpi[]> {
  // Total active patients
  const totalPacientes = await prisma.paciente.count({ where })

  // Patients with allergies
  const conAlergias = await prisma.paciente.count({
    where: {
      ...where,
      anamnesisActual: {
        tieneAlergias: true,
      },
    },
  })

  // Patients with chronic conditions
  const conEnfermedadesCronicas = await prisma.paciente.count({
    where: {
      ...where,
      anamnesisActual: {
        tieneEnfermedadesCronicas: true,
      },
    },
  })

  // Inactive patients (no appointment in N days)
  const inactiveDays = filters.inactivosDesdeDias ?? 90
  const inactiveDate = new Date()
  inactiveDate.setDate(inactiveDate.getDate() - inactiveDays)

  const pacientesInactivos = await prisma.paciente.count({
    where: {
      ...where,
      citas: {
        none: {
          inicio: { gte: inactiveDate },
        },
      },
    },
  })

  // New patients (registered in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const nuevosUltimoMes = await prisma.paciente.count({
    where: {
      ...where,
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  return [
    {
      id: "total-pacientes",
      label: "Total Pacientes Activos",
      value: totalPacientes,
      format: "number",
      helpText: "Número total de pacientes activos en el sistema",
    },
    {
      id: "nuevos-ultimo-mes",
      label: "Nuevos (último mes)",
      value: nuevosUltimoMes,
      format: "number",
      variant: "success",
      helpText: "Pacientes registrados en los últimos 30 días",
    },
    {
      id: "inactivos",
      label: `Inactivos (+${inactiveDays} días)`,
      value: pacientesInactivos,
      format: "number",
      variant: pacientesInactivos > totalPacientes * 0.3 ? "warning" : "default",
      helpText: `Pacientes sin citas en los últimos ${inactiveDays} días`,
    },
    {
      id: "con-alergias",
      label: "Con Alergias",
      value: conAlergias,
      format: "number",
      variant: "warning",
      helpText: "Pacientes con alergias registradas",
    },
    {
      id: "con-cronicas",
      label: "Con Enf. Crónicas",
      value: conEnfermedadesCronicas,
      format: "number",
      helpText: "Pacientes con enfermedades crónicas",
    },
  ]
}

/**
 * Fetch paginated patient data.
 */
async function fetchPatients(
  where: Prisma.PacienteWhereInput,
  filters: PacientesActivosFilters,
  page: number,
  pageSize: number
): Promise<{ data: PacienteActivoRow[]; total: number }> {
  const [pacientes, total] = await Promise.all([
    prisma.paciente.findMany({
      where,
      include: {
        persona: {
          include: {
            documento: true,
            contactos: {
              where: { activo: true, esPrincipal: true },
              take: 2,
            },
          },
        },
        citas: {
          orderBy: { inicio: "desc" },
          take: 1,
          select: {
            inicio: true,
            tipo: true,
            estado: true,
          },
        },
        anamnesisActual: {
          select: {
            tieneAlergias: true,
            tieneEnfermedadesCronicas: true,
          },
        },
        _count: {
          select: { citas: true },
        },
      },
      orderBy: { persona: { apellidos: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.paciente.count({ where }),
  ])

  // Process and filter by age (if needed)
  let data: PacienteActivoRow[] = pacientes.map((paciente) => {
    const edad = calcularEdad(paciente.persona.fechaNacimiento)
    const ultimaCita = paciente.citas[0]
    const diasDesdeUltimaCita = ultimaCita
      ? Math.floor((Date.now() - new Date(ultimaCita.inicio).getTime()) / (1000 * 60 * 60 * 24))
      : undefined

    const telefono = paciente.persona.contactos.find((c) => c.tipo === "PHONE")?.valorRaw
    const email = paciente.persona.contactos.find((c) => c.tipo === "EMAIL")?.valorRaw

    const tieneAlertas =
      paciente.anamnesisActual?.tieneAlergias ||
      paciente.anamnesisActual?.tieneEnfermedadesCronicas ||
      false

    return {
      idPaciente: paciente.idPaciente,
      nombreCompleto: `${paciente.persona.nombres} ${paciente.persona.apellidos}`,
      documento: paciente.persona.documento?.numero,
      fechaNacimiento: paciente.persona.fechaNacimiento?.toISOString(),
      edad,
      genero: paciente.persona.genero ?? undefined,
      telefono,
      email,
      ultimaCita: ultimaCita
        ? {
            fecha: ultimaCita.inicio.toISOString(),
            tipo: ultimaCita.tipo,
            estado: ultimaCita.estado,
          }
        : undefined,
      totalCitas: paciente._count.citas,
      diasDesdeUltimaCita,
      tieneAlertas,
    }
  })

  // Apply age filters (post-processing since it's calculated)
  if (filters.edadMin !== undefined || filters.edadMax !== undefined) {
    data = data.filter((p) => {
      if (p.edad === undefined) return false
      if (filters.edadMin !== undefined && p.edad < filters.edadMin) return false
      if (filters.edadMax !== undefined && p.edad > filters.edadMax) return false
      return true
    })
  }

  return { data, total }
}

/**
 * Active Patients Service implementation.
 */
export const pacientesActivosService: PacientesActivosService = {
  reportType: "pacientes-activos",

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
        fetchPatients(where, filters, page, pageSize),
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
        reportType: "pacientes-activos",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: PacientesActivosResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[PacientesActivosService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar los pacientes",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

