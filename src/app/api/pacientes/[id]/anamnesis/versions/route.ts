// src/app/api/pacientes/[id]/anamnesis/versions/route.ts
// Endpoint para listar versiones/snapshots de una anamnesis

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewAnamnesisAudit } from "@/lib/audit/anamnesis-rbac"
import { z } from "zod"

const versionsFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id } = await params
    const pacienteId = parseInt(id, 10)

    if (isNaN(pacienteId)) {
      return NextResponse.json({ error: "ID de paciente inválido" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Get anamnesis
    const anamnesis = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      select: { idPatientAnamnesis: true },
    })

    if (!anamnesis) {
      return NextResponse.json({ error: "Anamnesis no encontrada" }, { status: 404 })
    }

    // Check permissions
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
    const userId = parseInt(session.user.id, 10)

    if (!canViewAnamnesisAudit(userRole, pacienteId, userId, userId)) {
      return NextResponse.json({ error: "No tiene permisos para ver versiones" }, { status: 403 })
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = versionsFiltersSchema.parse(searchParams)

    // Build where clause
    const where: any = {
      anamnesisId: anamnesis.idPatientAnamnesis,
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo)
      }
    }

    // Pagination
    const page = filters.page
    const limit = filters.limit
    const skip = (page - 1) * limit

    // Count total
    const total = await prisma.patientAnamnesisVersion.count({ where })

    // Fetch versions
    const versions = await prisma.patientAnamnesisVersion.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        creadoPor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
          },
        },
        consulta: {
          select: {
            citaId: true,
            diagnosis: true,
          },
        },
      },
    })

    // Format response
    const formattedVersions = versions.map((version) => ({
      id: version.idPatientAnamnesisVersion,
      versionNumber: version.versionNumber,
      createdAt: version.createdAt.toISOString(),
      createdBy: {
        id: version.creadoPor.idUsuario,
        nombre: version.creadoPor.nombreApellido,
      },
      consultaId: version.consultaId,
      consulta: version.consulta
        ? {
            citaId: version.consulta.citaId,
            diagnosis: version.consulta.diagnosis,
          }
        : null,
      motivoCambio: version.motivoCambio,
      reason: version.reason,
      restoredFromVersionId: version.restoredFromVersionId,
      changeSummary: version.changeSummary,
      tipo: version.tipo,
      motivoConsulta: version.motivoConsulta,
      tieneDolorActual: version.tieneDolorActual,
      dolorIntensidad: version.dolorIntensidad,
      urgenciaPercibida: version.urgenciaPercibida,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: formattedVersions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error("Error fetching anamnesis versions:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener versiones" },
      { status: 500 }
    )
  }
}

