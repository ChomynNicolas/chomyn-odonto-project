// Service for calculating and managing anamnesis status

import { prisma } from "@/lib/prisma"
import type { AnamnesisStatus, AnamnesisStatusInfo } from "@/types/anamnesis-outside-consultation"

/**
 * Calculate anamnesis status based on current state
 */
export async function calculateAnamnesisStatus(
  anamnesisId: number | null
): Promise<AnamnesisStatus> {
  if (!anamnesisId) {
    return "NO_ANAMNESIS"
  }

  const anamnesis = await prisma.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: anamnesisId },
    select: {
      hasPendingReviews: true,
      updatedAt: true,
    },
  })

  if (!anamnesis) {
    return "NO_ANAMNESIS"
  }

  // Check for pending reviews first
  if (anamnesis.hasPendingReviews) {
    return "PENDING_REVIEW"
  }

  // Check if expired (> 12 months)
  const daysSinceUpdate = calculateDaysSince(anamnesis.updatedAt)
  if (daysSinceUpdate > 365) {
    return "EXPIRED"
  }

  return "VALID"
}

/**
 * Get complete anamnesis status information
 */
export async function getAnamnesisStatusInfo(
  anamnesisId: number | null
): Promise<AnamnesisStatusInfo | null> {
  if (!anamnesisId) {
    return {
      status: "NO_ANAMNESIS",
      lastVerifiedAt: null,
      lastVerifiedBy: null,
      hasPendingReviews: false,
      pendingReviewSince: null,
      pendingReviewReason: null,
    }
  }

  const anamnesis = await prisma.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: anamnesisId },
    select: {
      status: true,
      hasPendingReviews: true,
      pendingReviewSince: true,
      pendingReviewReason: true,
      lastVerifiedAt: true,
      lastVerifiedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
    },
  }).catch(() => null)

  if (!anamnesis) {
    return {
      status: "NO_ANAMNESIS",
      lastVerifiedAt: null,
      lastVerifiedBy: null,
      hasPendingReviews: false,
      pendingReviewSince: null,
      pendingReviewReason: null,
    }
  }

  const status = (anamnesis.status as AnamnesisStatus) || (await calculateAnamnesisStatus(anamnesisId))

  return {
    status,
    lastVerifiedAt: anamnesis.lastVerifiedAt?.toISOString() || null,
    lastVerifiedBy: anamnesis.lastVerifiedBy
      ? {
          id: anamnesis.lastVerifiedBy.idUsuario,
          nombreApellido: anamnesis.lastVerifiedBy.nombreApellido,
        }
      : null,
    hasPendingReviews: anamnesis.hasPendingReviews,
    pendingReviewSince: anamnesis.pendingReviewSince?.toISOString() || null,
    pendingReviewReason: anamnesis.pendingReviewReason || null,
  }
}

/**
 * Check if anamnesis has pending reviews
 */
export async function checkPendingReviews(anamnesisId: number): Promise<boolean> {
  const pendingCount = await prisma.anamnesisPendingReview.count({
    where: {
      anamnesisId,
      isApproved: null, // Not reviewed yet
    },
  })

  return pendingCount > 0
}

/**
 * Calculate days since a date
 */
function calculateDaysSince(date: Date): number {
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Update anamnesis status based on current state
 */
export async function updateAnamnesisStatus(anamnesisId: number): Promise<void> {
  const hasPendingReviews = await checkPendingReviews(anamnesisId)

  const anamnesis = await prisma.patientAnamnesis.findUnique({
    where: { idPatientAnamnesis: anamnesisId },
    select: { updatedAt: true, pendingReviewSince: true },
  })

  if (!anamnesis) return

  const daysSinceUpdate = calculateDaysSince(anamnesis.updatedAt)
  const isExpired = daysSinceUpdate > 365

  let status: AnamnesisStatus = "VALID"
  if (hasPendingReviews) {
    status = "PENDING_REVIEW"
  } else if (isExpired) {
    status = "EXPIRED"
  }

  await prisma.patientAnamnesis.update({
    where: { idPatientAnamnesis: anamnesisId },
    data: {
      status,
      hasPendingReviews,
      ...(hasPendingReviews && !anamnesis.pendingReviewSince
        ? { pendingReviewSince: new Date() }
        : {}),
    },
  })
}

