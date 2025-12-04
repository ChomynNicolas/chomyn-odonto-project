// src/lib/services/reportes/diagnosticos-pendientes-seguimiento.service.ts
/**
 * Pending Follow-up Diagnoses Report Service
 * Provides listing of diagnoses with status UNDER_FOLLOW_UP with patient information,
 * days in follow-up, last evaluation, next appointment, and evolution notes.
 */

import { prisma } from "@/lib/prisma"
import type {
  DiagnosticosPendientesSeguimientoFilters,
  DiagnosticosPendientesSeguimientoResponse,
  DiagnosticoPendienteSeguimientoRow,
  ReportKpi,
  ReportUserContext,
  PaginationMeta,
  ReportMetadata,
} from "@/types/reportes"
import {
  createReportSuccess,
  createReportError,
  ReportErrorCode,
  type DiagnosticosPendientesSeguimientoService,
} from "./types"
import type { Prisma } from "@prisma/client"
import { DiagnosisStatus } from "@prisma/client"

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
  filters: DiagnosticosPendientesSeguimientoFilters,
  user: ReportUserContext
): Prisma.PatientDiagnosisWhereInput {
  const where: Prisma.PatientDiagnosisWhereInput = {
    status: DiagnosisStatus.UNDER_FOLLOW_UP, // Always filter by UNDER_FOLLOW_UP status
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
  if (filters.profesionalIds && filters.profesionalIds.length > 0) {
    where.createdBy = {
      profesional: {
        idProfesional: { in: filters.profesionalIds },
      },
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

  // Date range filter - filter by when status changed to UNDER_FOLLOW_UP
  // This requires checking DiagnosisStatusHistory, so we'll filter in post-processing
  // or use a subquery. For now, we'll apply date range filter after fetching status history.

  return where
}

/**
 * Calculate KPIs for the pending follow-up diagnoses report.
 */
async function calculateKpis(
  where: Prisma.PatientDiagnosisWhereInput
): Promise<ReportKpi[]> {
  // Get all diagnoses with UNDER_FOLLOW_UP status
  const allDiagnoses = await prisma.patientDiagnosis.findMany({
    where,
    include: {
      statusHistory: {
        orderBy: {
          changedAt: "desc",
        },
      },
    },
  })


  const daysInFollowUp: number[] = []
  const totalDiagnosticos = allDiagnoses.length
  let masDe30Dias = 0
  let masDe90Dias = 0

  for (const diagnosis of allDiagnoses) {
    let followUpStartDate: Date

    // Find when status changed to UNDER_FOLLOW_UP
    const statusChange = diagnosis.statusHistory.find((h) => h.newStatus === DiagnosisStatus.UNDER_FOLLOW_UP)

    if (statusChange) {
      followUpStartDate = statusChange.changedAt
    } else {
      // Fallback to notedAt if no status history
      followUpStartDate = diagnosis.notedAt
    }

    const days = calcularDiasDesde(followUpStartDate)
    daysInFollowUp.push(days)

    if (days > 90) {
      masDe90Dias++
    } else if (days > 30) {
      masDe30Dias++
    }
  }

  // Calculate average days
  const promedioDias =
    daysInFollowUp.length > 0
      ? Math.round((daysInFollowUp.reduce((a, b) => a + b, 0) / daysInFollowUp.length) * 10) / 10
      : 0

  // Count unique patients
  const uniquePatients = new Set(allDiagnoses.map((d) => d.pacienteId)).size

  return [
    {
      id: "total-diagnosticos",
      label: "Total en Seguimiento",
      value: totalDiagnosticos,
      format: "number",
      helpText: "Número total de diagnósticos en seguimiento",
    },
    {
      id: "promedio-dias",
      label: "Promedio Días",
      value: promedioDias,
      format: "number",
      decimals: 1,
      unit: "días",
      helpText: "Promedio de días en seguimiento",
    },
    {
      id: "mas-30-dias",
      label: "Con >30 días",
      value: masDe30Dias,
      format: "number",
      variant: masDe30Dias > 0 ? "warning" : "default",
      helpText: "Diagnósticos con más de 30 días en seguimiento",
    },
    {
      id: "mas-90-dias",
      label: "Con >90 días",
      value: masDe90Dias,
      format: "number",
      variant: masDe90Dias > 0 ? "danger" : "default",
      helpText: "Diagnósticos con más de 90 días en seguimiento",
    },
    {
      id: "pacientes-unicos",
      label: "Pacientes Únicos",
      value: uniquePatients,
      format: "number",
      helpText: "Número de pacientes únicos con diagnósticos pendientes",
    },
  ]
}

/**
 * Get days in follow-up for a diagnosis.
 */
function getDaysInFollowUp(diagnosis: {
  statusHistory: Array<{ newStatus: DiagnosisStatus; changedAt: Date }>
  notedAt: Date
}): number {
  // Find when status changed to UNDER_FOLLOW_UP
  const statusChange = diagnosis.statusHistory
    .filter((h) => h.newStatus === DiagnosisStatus.UNDER_FOLLOW_UP)
    .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0]

  if (statusChange) {
    return calcularDiasDesde(statusChange.changedAt)
  }

  // Fallback to notedAt if no status history
  return calcularDiasDesde(diagnosis.notedAt)
}

/**
 * Fetch paginated diagnosis data with all related information.
 */
async function fetchDiagnoses(
  where: Prisma.PatientDiagnosisWhereInput,
  filters: DiagnosticosPendientesSeguimientoFilters,
  page: number,
  pageSize: number
): Promise<{ data: DiagnosticoPendienteSeguimientoRow[]; total: number }> {
  // First, get all diagnoses matching the where clause
  const allDiagnoses = await prisma.patientDiagnosis.findMany({
    where,
    include: {
      paciente: {
        include: {
          persona: {
            include: {
              documento: true,
            },
          },
          citas: {
            where: {
              estado: {
                in: ["SCHEDULED", "CONFIRMED"],
              },
              inicio: {
                gt: new Date(),
              },
            },
            orderBy: {
              inicio: "asc",
            },
            take: 1,
            include: {
              profesional: {
                include: {
                  persona: true,
                },
              },
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
      statusHistory: {
        orderBy: {
          changedAt: "desc",
        },
        include: {
          changedBy: {
            include: {
              profesional: {
                include: {
                  persona: true,
                },
              },
            },
          },
          consulta: {
            include: {
              cita: {
                include: {
                  profesional: {
                    include: {
                      persona: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      encounterDiagnoses: {
        where: {
          wasEvaluated: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        include: {
          consulta: {
            include: {
              cita: {
                include: {
                  profesional: {
                    include: {
                      persona: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  // Process data and calculate days in follow-up
  const processedData: Array<DiagnosticoPendienteSeguimientoRow & { diasEnSeguimiento: number }> = []

  for (const diagnosis of allDiagnoses) {
    const diasEnSeguimiento = getDaysInFollowUp(diagnosis)

    // Apply date range filter if specified (filter by when status changed to UNDER_FOLLOW_UP)
    if (filters.startDate || filters.endDate) {
      // Find when status changed to UNDER_FOLLOW_UP
      const statusChangeToFollowUp = diagnosis.statusHistory
        .filter((h) => h.newStatus === DiagnosisStatus.UNDER_FOLLOW_UP)
        .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())[0]
      
      const changeDate = statusChangeToFollowUp?.changedAt || diagnosis.notedAt

      if (filters.startDate) {
        const startDate = new Date(filters.startDate)
        startDate.setHours(0, 0, 0, 0)
        if (changeDate < startDate) {
          continue
        }
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        if (changeDate > endDate) {
          continue
        }
      }
    }

    // Apply days range filter
    if (filters.diasMinimos !== undefined && diasEnSeguimiento < filters.diasMinimos) {
      continue
    }
    if (filters.diasMaximos !== undefined && diasEnSeguimiento > filters.diasMaximos) {
      continue
    }

    // Get last evaluation
    const lastEncounter = diagnosis.encounterDiagnoses.find((ed) => ed.wasEvaluated)
    let ultimaEvaluacion: DiagnosticoPendienteSeguimientoRow["ultimaEvaluacion"] | undefined

    if (lastEncounter) {
      const consulta = lastEncounter.consulta
      const profesional = consulta.cita.profesional.persona
      ultimaEvaluacion = {
        fecha: consulta.cita.inicio.toISOString(),
        profesional:
          profesional && profesional.nombres && profesional.apellidos
            ? `${profesional.nombres} ${profesional.apellidos}`.trim()
            : undefined,
        consultaId: consulta.citaId,
      }
    } else {
      // Use status history if no encounter diagnosis - find most recent status change
      const mostRecentStatusChange = diagnosis.statusHistory.length > 0 ? diagnosis.statusHistory[0] : null
      if (mostRecentStatusChange) {
        const changedBy = mostRecentStatusChange.changedBy
        const profesional = changedBy.profesional?.persona
        ultimaEvaluacion = {
          fecha: mostRecentStatusChange.changedAt.toISOString(),
          profesional:
            profesional && profesional.nombres && profesional.apellidos
              ? `${profesional.nombres} ${profesional.apellidos}`.trim()
              : changedBy.nombreApellido,
          consultaId: mostRecentStatusChange.consulta?.citaId,
        }
      }
    }

    // Get next appointment
    const proximaCita = diagnosis.paciente.citas[0]
    let proximaCitaSugerida: DiagnosticoPendienteSeguimientoRow["proximaCitaSugerida"] | undefined

    if (proximaCita) {
      const profesional = proximaCita.profesional.persona
      proximaCitaSugerida = {
        idCita: proximaCita.idCita,
        fecha: proximaCita.inicio.toISOString(),
        hora: proximaCita.inicio.toLocaleTimeString("es-PY", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        profesional:
          profesional && profesional.nombres && profesional.apellidos
            ? `${profesional.nombres} ${profesional.apellidos}`.trim()
            : undefined,
        tipo: proximaCita.tipo,
      }
    }

    // Collect evolution notes
    const notasEvolucion: DiagnosticoPendienteSeguimientoRow["notasEvolucion"] = []

    // From EncounterDiagnosis
    for (const encounter of diagnosis.encounterDiagnoses) {
      if (encounter.encounterNotes) {
        const consulta = encounter.consulta
        const profesional = consulta.cita.profesional.persona
        notasEvolucion.push({
          fecha: consulta.cita.inicio.toISOString(),
          nota: encounter.encounterNotes,
          fuente: "ENCOUNTER",
          profesional:
            profesional && profesional.nombres && profesional.apellidos
              ? `${profesional.nombres} ${profesional.apellidos}`.trim()
              : undefined,
        })
      }
    }

    // From StatusHistory (if reason is provided)
    for (const statusHistory of diagnosis.statusHistory) {
      if (statusHistory.reason) {
        const changedBy = statusHistory.changedBy
        const profesional = changedBy.profesional?.persona
        notasEvolucion.push({
          fecha: statusHistory.changedAt.toISOString(),
          nota: statusHistory.reason,
          fuente: "STATUS_HISTORY",
          profesional:
            profesional && profesional.nombres && profesional.apellidos
              ? `${profesional.nombres} ${profesional.apellidos}`.trim()
              : changedBy.nombreApellido,
        })
      }
    }

    // Sort notes by date descending (most recent first)
    notasEvolucion.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const edad = calcularEdad(diagnosis.paciente.persona.fechaNacimiento)

    processedData.push({
      idPatientDiagnosis: diagnosis.idPatientDiagnosis,
      paciente: {
        idPaciente: diagnosis.paciente.idPaciente,
        nombreCompleto: `${diagnosis.paciente.persona.nombres} ${diagnosis.paciente.persona.apellidos}`.trim(),
        documento: diagnosis.paciente.persona.documento?.numero,
        edad,
      },
      diagnostico: {
        id: diagnosis.idPatientDiagnosis,
        code: diagnosis.code ?? undefined,
        label: diagnosis.label,
        status: diagnosis.status,
        notedAt: diagnosis.notedAt.toISOString(),
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
      diasEnSeguimiento,
      ultimaEvaluacion,
      proximaCitaSugerida,
      notasEvolucion: notasEvolucion.slice(0, 10), // Limit to last 10 notes
    })
  }

  // Sort by days in follow-up descending (most ancient first)
  processedData.sort((a, b) => b.diasEnSeguimiento - a.diasEnSeguimiento)

  // Apply pagination
  const total = processedData.length
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)

  return { data: paginatedData, total }
}

/**
 * Pending Follow-up Diagnoses Service implementation.
 */
export const diagnosticosPendientesSeguimientoService: DiagnosticosPendientesSeguimientoService = {
  reportType: "diagnosticos-pendientes-seguimiento",

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
        reportType: "diagnosticos-pendientes-seguimiento",
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: user.userId,
          username: user.username,
          role: user.role,
        },
        filters: filters as unknown as Record<string, unknown>,
        executionTimeMs: Math.round(executionTime),
      }

      const response: DiagnosticosPendientesSeguimientoResponse = {
        metadata,
        kpis,
        data,
        pagination,
      }

      return createReportSuccess(response)
    } catch (error) {
      console.error("[DiagnosticosPendientesSeguimientoService] Error:", error)
      return createReportError(
        ReportErrorCode.DATABASE_ERROR,
        "Error al consultar los diagnósticos pendientes de seguimiento",
        { error: error instanceof Error ? error.message : "Unknown error" }
      )
    }
  },
}

