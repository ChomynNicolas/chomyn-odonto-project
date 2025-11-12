/**
 * Endpoint para drill-down de citas con paginación
 * Permite ver detalle de citas que componen un KPI
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { prisma } from "@/lib/prisma"
import { ofuscarNombre, ofuscarDocumento } from "@/lib/kpis/privacy"
import type { Prisma } from "@prisma/client"
import { EstadoCita } from "@prisma/client"
import { kpiFiltersSchema, drillDownQuerySchema } from "../../../_schemas"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const url = new URL(req.url)
  const params = Object.fromEntries(url.searchParams.entries())

  // Parsear filtros
  const filtersParsed = kpiFiltersSchema.safeParse({
    startDate: params.startDate,
    endDate: params.endDate,
    profesionalIds: params.profesionalIds ? JSON.parse(params.profesionalIds) : undefined,
    consultorioIds: params.consultorioIds ? JSON.parse(params.consultorioIds) : undefined,
    estadoCita: params.estadoCita ? JSON.parse(params.estadoCita) : undefined,
    privacyMode: params.privacyMode === "true",
  })

  const paginationParsed = drillDownQuerySchema.safeParse({
    page: params.page,
    pageSize: params.pageSize,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  })

  if (!filtersParsed.success || !paginationParsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAD_REQUEST",
        details: {
          filters: filtersParsed.error?.flatten(),
          pagination: paginationParsed.error?.flatten(),
        },
      },
      { status: 400 },
    )
  }

  const filters = filtersParsed.data
  const pagination = paginationParsed.data
  const role = (auth.session.user.role ?? "RECEP") as "RECEP" | "ODONT" | "ADMIN"
  const userId = auth.session.user.id ? Number.parseInt(auth.session.user.id, 10) : 0

  try {
    // Construir WHERE clause
    const where: Prisma.CitaWhereInput = {
      inicio: {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      },
    }

    // Aplicar scopes por rol
    if (role === "ODONT") {
      where.profesionalId = userId
    }

    if (filters.profesionalIds?.length) {
      where.profesionalId = { in: filters.profesionalIds }
    }

    if (filters.consultorioIds?.length) {
      where.consultorioId = { in: filters.consultorioIds }
    }

    if (filters.estadoCita?.length) {
      where.estado = { in: filters.estadoCita as EstadoCita[] }
    }

    // Contar total
    const total = await prisma.cita.count({ where })

    // Obtener página
    const skip = (pagination.page - 1) * pagination.pageSize
    const orderBy: Prisma.CitaOrderByWithRelationInput = {}

    if (pagination.sortBy === "inicio") {
      orderBy.inicio = pagination.sortOrder
    } else if (pagination.sortBy === "paciente") {
      orderBy.paciente = { persona: { apellidos: pagination.sortOrder } }
    } else {
      orderBy.inicio = "desc" // Default
    }

    const citas = await prisma.cita.findMany({
      where,
      skip,
      take: pagination.pageSize,
      orderBy,
      include: {
        paciente: {
          include: {
            persona: true,
          },
        },
        profesional: {
          include: {
            persona: true,
          },
        },
        consultorio: true,
      },
    })

    // Formatear respuesta
    const data = citas.map((cita) => {
      const pacienteNombre = `${cita.paciente.persona.nombres} ${cita.paciente.persona.apellidos}`
      const profesionalNombre = `${cita.profesional.persona.nombres} ${cita.profesional.persona.apellidos}`

      return {
        idCita: cita.idCita,
        inicio: cita.inicio.toISOString(),
        fin: cita.fin.toISOString(),
        estado: cita.estado,
        paciente: filters.privacyMode ? ofuscarNombre(pacienteNombre) : pacienteNombre,
        pacienteDocumento: filters.privacyMode
          ? ofuscarDocumento(cita.paciente.persona.numeroDocumento || "")
          : cita.paciente.persona.numeroDocumento,
        profesional: profesionalNombre,
        consultorio: cita.consultorio?.nombre || null,
        tipo: cita.tipo,
        duracionMinutos: cita.duracionMinutos,
        notas: filters.privacyMode ? null : cita.notas,
      }
    })

    return NextResponse.json(
      {
        ok: true,
        data,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages: Math.ceil(total / pagination.pageSize),
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("GET /api/kpis/clinico/drill-down/citas error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
