// src/app/api/pacientes/[id]/anamnesis/audit/[logId]/route.ts
// Endpoint para obtener detalle completo de un log de auditoría

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canViewAnamnesisAudit, canViewTechnicalDetails } from "@/lib/audit/anamnesis-rbac"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id, logId } = await params
    const pacienteId = parseInt(id, 10)
    const auditLogId = parseInt(logId, 10)

    if (isNaN(pacienteId) || isNaN(auditLogId)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    // Verify patient exists
    const paciente = await prisma.paciente.findUnique({
      where: { idPaciente: pacienteId },
      select: { idPaciente: true },
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Check permissions
    const userRole = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!canViewAnamnesisAudit(userRole)) {
      return NextResponse.json({ error: "No tiene permisos para ver esta auditoría" }, { status: 403 })
    }

    // Fetch audit log with details
    const log = await prisma.anamnesisAuditLog.findUnique({
      where: { idAnamnesisAuditLog: auditLogId },
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
        fieldDiffsDetails: {
          orderBy: { idAnamnesisFieldDiff: "asc" },
        },
        consulta: {
          select: {
            citaId: true,
            diagnosis: true,
          },
        },
      },
    })

    if (!log) {
      return NextResponse.json({ error: "Log de auditoría no encontrado" }, { status: 404 })
    }

    // Verify log belongs to this patient
    if (log.pacienteId !== pacienteId) {
      return NextResponse.json({ error: "El log no pertenece a este paciente" }, { status: 403 })
    }

    // Format response
    const canViewTechnical = canViewTechnicalDetails(userRole)

    return NextResponse.json({
      data: {
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
        sessionId: canViewTechnical ? log.sessionId : undefined,
        requestPath: canViewTechnical ? log.requestPath : undefined,
        reason: log.reason,
        consultaId: log.consultaId,
        consulta: log.consulta
          ? {
              citaId: log.consulta.citaId,
              diagnosis: log.consulta.diagnosis,
            }
          : null,
        previousVersionNumber: log.previousVersionNumber,
        newVersionNumber: log.newVersionNumber,
        previousState: log.previousState,
        newState: log.newState,
        fieldDiffs: log.fieldDiffs,
        fieldDiffsDetails: log.fieldDiffsDetails.map((diff) => ({
          id: diff.idAnamnesisFieldDiff,
          fieldPath: diff.fieldPath,
          fieldLabel: diff.fieldLabel,
          fieldType: diff.fieldType,
          oldValue: diff.oldValue,
          newValue: diff.newValue,
          oldValueDisplay: diff.oldValueDisplay,
          newValueDisplay: diff.newValueDisplay,
          isCritical: diff.isCritical,
          changeType: diff.changeType,
        })),
        changesSummary: log.changesSummary,
        integrityHash: canViewTechnical ? log.integrityHash : undefined,
      },
    })
  } catch (error) {
    console.error("Error fetching audit log detail:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener detalle del log" },
      { status: 500 }
    )
  }
}

