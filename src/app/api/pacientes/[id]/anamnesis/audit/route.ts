// src/app/api/pacientes/[id]/anamnesis/audit/route.ts
// Endpoint para obtener historial de auditoría de una anamnesis

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewAnamnesisAudit } from "@/lib/audit/anamnesis-rbac"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

const auditFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),
  action: z.enum(["CREATE", "UPDATE", "DELETE", "VIEW", "RESTORE", "EXPORT", "PRINT"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
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

    if (!canViewAnamnesisAudit(userRole)) {
      return NextResponse.json({ error: "No tiene permisos para ver esta auditoría" }, { status: 403 })
    }

    // Parse query params
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries())
    const filters = auditFiltersSchema.parse(searchParams)

    // Build where clause
    const where: Prisma.AnamnesisAuditLogWhereInput = {
      anamnesisId: anamnesis.idPatientAnamnesis,
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.severity) {
      where.severity = filters.severity
    }

    if (filters.dateFrom || filters.dateTo) {
      where.performedAt = {}
      if (filters.dateFrom) {
        where.performedAt.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.performedAt.lte = new Date(filters.dateTo)
      }
    }

    // Pagination
    const page = filters.page
    const limit = filters.limit
    const skip = (page - 1) * limit

    // Count total
    const total = await prisma.anamnesisAuditLog.count({ where })

    // Fetch logs
    const logs = await prisma.anamnesisAuditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { performedAt: "desc" },
      include: {
        actor: {
          select: {
            idUsuario: true,
            nombreApellido: true,
            email: true,
            rol: {
              select: {
                nombreRol: true,
              },
            },
          },
        },
      },
    })

    // Format response (sanitize technical details based on role)
    const canViewTechnical = userRole === "ADMIN"
    const formattedLogs = logs.map((log) => ({
      id: log.idAnamnesisAuditLog,
      action: log.action,
      severity: log.severity,
      performedAt: log.performedAt.toISOString(),
      actor: {
        id: log.actor.idUsuario,
        nombre: log.actor.nombreApellido,
        email: canViewTechnical ? log.actor.email : undefined,
        role: log.actor.rol.nombreRol,
      },
      ipAddress: canViewTechnical ? log.ipAddress : undefined,
      userAgent: canViewTechnical ? log.userAgent : undefined,
      reason: log.reason,
      consultaId: log.consultaId,
      previousVersionNumber: log.previousVersionNumber,
      newVersionNumber: log.newVersionNumber,
      changesSummary: log.changesSummary as Record<string, unknown> | null,
      fieldDiffsCount: (log.fieldDiffs as unknown[] | null)?.length || 0,
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: formattedLogs,
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
    console.error("Error fetching anamnesis audit logs:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener logs de auditoría" },
      { status: 500 }
    )
  }
}

