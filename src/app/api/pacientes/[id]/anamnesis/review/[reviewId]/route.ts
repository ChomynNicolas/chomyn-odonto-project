// API route for reviewing pending anamnesis changes

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { reviewPendingChange, batchReviewPendingChanges } from "@/lib/services/anamnesis-review.service"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const reviewSchema = z.object({
  isApproved: z.boolean(),
  reviewNotes: z.string().max(2000).optional(),
})

const batchReviewSchema = z.object({
  reviewIds: z.array(z.number().int().positive()),
  isApproved: z.boolean(),
  reviewNotes: z.string().max(2000).optional(),
})

/**
 * PUT /api/pacientes/[id]/anamnesis/review/[reviewId]
 * Review a single pending change
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id, reviewId } = await params
    const pacienteId = parseInt(id, 10)
    const reviewIdNum = parseInt(reviewId, 10)
    const userId = parseInt(session.user.id, 10)

    if (isNaN(pacienteId) || isNaN(reviewIdNum) || isNaN(userId)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    // Get user role
    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      include: { rol: true },
    })

    const role = (user?.rol?.nombreRol as "ADMIN" | "ODONT" | "RECEP") || "RECEP"

    // Only ODONT and ADMIN can review
    if (role !== "ADMIN" && role !== "ODONT") {
      return NextResponse.json(
        { error: "Solo ODONT y ADMIN pueden revisar cambios" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const data = reviewSchema.parse(body)

    // Verify review belongs to this patient
    const review = await prisma.anamnesisPendingReview.findUnique({
      where: { idAnamnesisPendingReview: reviewIdNum },
      select: { pacienteId: true },
    })

    if (!review) {
      return NextResponse.json({ error: "Revisión no encontrada" }, { status: 404 })
    }

    if (review.pacienteId !== pacienteId) {
      return NextResponse.json(
        { error: "La revisión no pertenece a este paciente" },
        { status: 403 }
      )
    }

    // Review the change
    await reviewPendingChange({
      reviewId: reviewIdNum,
      reviewedByUserId: userId,
      isApproved: data.isApproved,
      reviewNotes: data.reviewNotes,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error reviewing pending change:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al revisar cambio" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pacientes/[id]/anamnesis/review/batch
 * Batch review multiple pending changes
 */
export async function POST(
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
    const userId = parseInt(session.user.id, 10)

    if (isNaN(pacienteId) || isNaN(userId)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    // Get user role
    const user = await prisma.usuario.findUnique({
      where: { idUsuario: userId },
      include: { rol: true },
    })

    const role = (user?.rol?.nombreRol as "ADMIN" | "ODONT" | "RECEP") || "RECEP"

    // Only ODONT and ADMIN can review
    if (role !== "ADMIN" && role !== "ODONT") {
      return NextResponse.json(
        { error: "Solo ODONT y ADMIN pueden revisar cambios" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await req.json()
    const data = batchReviewSchema.parse(body)

    // Verify all reviews belong to this patient
    const reviews = await prisma.anamnesisPendingReview.findMany({
      where: {
        idAnamnesisPendingReview: { in: data.reviewIds },
      },
      select: { pacienteId: true },
    })

    if (reviews.length !== data.reviewIds.length) {
      return NextResponse.json(
        { error: "Algunas revisiones no fueron encontradas" },
        { status: 404 }
      )
    }

    const allBelongToPatient = reviews.every((r) => r.pacienteId === pacienteId)
    if (!allBelongToPatient) {
      return NextResponse.json(
        { error: "Algunas revisiones no pertenecen a este paciente" },
        { status: 403 }
      )
    }

    // Batch review
    await batchReviewPendingChanges({
      reviewIds: data.reviewIds,
      reviewedByUserId: userId,
      isApproved: data.isApproved,
      reviewNotes: data.reviewNotes,
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Error batch reviewing pending changes:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al revisar cambios" },
      { status: 500 }
    )
  }
}

