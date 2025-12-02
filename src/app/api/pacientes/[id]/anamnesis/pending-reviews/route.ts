// API route for managing pending anamnesis reviews

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPendingReviews } from "@/lib/services/anamnesis-review.service"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/pacientes/[id]/anamnesis/pending-reviews
 * Get all pending reviews for a patient's anamnesis
 */
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

    // Get user role
    const user = await prisma.usuario.findUnique({
      where: { idUsuario: parseInt(session.user.id, 10) },
      include: { rol: true },
    })

    const role = (user?.rol?.nombreRol as "ADMIN" | "ODONT" | "RECEP") || "RECEP"

    // Only ODONT and ADMIN can view pending reviews
    if (role !== "ADMIN" && role !== "ODONT") {
      return NextResponse.json(
        { error: "No tiene permisos para ver revisiones pendientes" },
        { status: 403 }
      )
    }

    // Get anamnesis for this patient
    const anamnesis = await prisma.patientAnamnesis.findUnique({
      where: { pacienteId },
      select: { idPatientAnamnesis: true },
    })

    if (!anamnesis) {
      return NextResponse.json({ data: [] }, { status: 200 })
    }

    // Get pending reviews
    const reviews = await getPendingReviews(anamnesis.idPatientAnamnesis)

    return NextResponse.json({
      data: reviews.map((review) => ({
        idAnamnesisPendingReview: review.idAnamnesisPendingReview,
        anamnesisId: review.anamnesisId,
        pacienteId: review.pacienteId,
        auditLogId: review.auditLogId,
        fieldPath: review.fieldPath,
        fieldLabel: review.fieldLabel,
        oldValue: review.oldValue,
        newValue: review.newValue,
        reason: review.reason,
        severity: review.severity,
        createdBy: {
          id: review.createdBy.idUsuario,
          nombreApellido: review.createdBy.nombreApellido,
        },
        createdAt: review.createdAt.toISOString(),
        auditLog: {
          action: review.auditLog.action,
          performedAt: review.auditLog.performedAt.toISOString(),
          reason: review.auditLog.reason,
          severity: review.auditLog.severity,
        },
      })),
    })
  } catch (error) {
    console.error("Error fetching pending reviews:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al obtener revisiones pendientes" },
      { status: 500 }
    )
  }
}

