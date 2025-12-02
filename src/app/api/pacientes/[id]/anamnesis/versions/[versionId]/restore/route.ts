// src/app/api/pacientes/[id]/anamnesis/versions/[versionId]/restore/route.ts
// Endpoint para restaurar una versión anterior de anamnesis

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { canRestoreAnamnesisVersion } from "@/lib/audit/anamnesis-rbac"
import { restoreAnamnesisVersion } from "@/lib/services/anamnesis-audit-complete.service"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import { writeAudit } from "@/lib/audit/log"
import { z } from "zod"

const restoreBodySchema = z.object({
  reason: z.string().min(1).max(500).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id, versionId } = await params
    const pacienteId = parseInt(id, 10)
    const versionIdNum = parseInt(versionId, 10)
    const userId = parseInt(session.user.id, 10)

    if (isNaN(pacienteId) || isNaN(versionIdNum) || isNaN(userId)) {
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

    if (!canRestoreAnamnesisVersion(userRole)) {
      return NextResponse.json({ error: "No tiene permisos para restaurar versiones" }, { status: 403 })
    }

    // Parse body
    const body = await req.json().catch(() => ({}))
    const { reason } = restoreBodySchema.parse(body)

    // Restore version in transaction
    const restoredState = await prisma.$transaction(async (tx) => {
      return await restoreAnamnesisVersion(
        anamnesis.idPatientAnamnesis,
        versionIdNum,
        userId,
        userRole,
        reason || "Restauración de versión anterior",
        req.headers,
        tx
      )
    })

    // Register in general AuditLog
    try {
      await writeAudit({
        actorId: userId,
        action: AuditAction.ANAMNESIS_RESTORE,
        entity: AuditEntity.PatientAnamnesis,
        entityId: anamnesis.idPatientAnamnesis,
        metadata: {
          pacienteId,
          versionId: versionIdNum,
          reason: reason || "Restauración de versión anterior",
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    } catch (auditError) {
      console.error("[Audit] Error writing to general AuditLog:", auditError)
    }

    return NextResponse.json({
      data: {
        message: "Versión restaurada correctamente",
        anamnesis: restoredState,
      },
    })
  } catch (error) {
    console.error("Error restoring version:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al restaurar versión" },
      { status: 500 }
    )
  }
}

