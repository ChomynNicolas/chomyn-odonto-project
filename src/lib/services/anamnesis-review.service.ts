// Service for reviewing pending anamnesis changes

import { prisma } from "@/lib/prisma"
import { updateAnamnesisStatus } from "./anamnesis-status.service"

export interface ReviewPendingChangeParams {
  reviewId: number
  reviewedByUserId: number
  isApproved: boolean
  reviewNotes?: string
}

/**
 * Review a pending anamnesis change
 */
export async function reviewPendingChange(
  params: ReviewPendingChangeParams
): Promise<void> {
  const review = await prisma.anamnesisPendingReview.findUnique({
    where: { idAnamnesisPendingReview: params.reviewId },
    select: {
      anamnesisId: true,
      isApproved: true, // Check if already reviewed
    },
  })

  if (!review) {
    throw new Error("Pending review not found")
  }

  if (review.isApproved !== null) {
    throw new Error("This review has already been processed")
  }

  // Update the review
  await prisma.anamnesisPendingReview.update({
    where: { idAnamnesisPendingReview: params.reviewId },
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: params.reviewedByUserId,
      reviewNotes: params.reviewNotes || null,
      isApproved: params.isApproved,
    },
  })

  // Update audit log if approved
  if (params.isApproved) {
    const reviewRecord = await prisma.anamnesisPendingReview.findUnique({
      where: { idAnamnesisPendingReview: params.reviewId },
      select: { auditLogId: true },
    })

    if (reviewRecord) {
      await prisma.anamnesisAuditLog.update({
        where: { idAnamnesisAuditLog: reviewRecord.auditLogId },
        data: {
          reviewedAt: new Date(),
          reviewedByUserId: params.reviewedByUserId,
        },
      })
    }
  }

  // Update anamnesis status (check if all reviews are complete)
  await updateAnamnesisStatus(review.anamnesisId)
}

/**
 * Get all pending reviews for an anamnesis
 */
export async function getPendingReviews(anamnesisId: number) {
  return prisma.anamnesisPendingReview.findMany({
    where: {
      anamnesisId,
      isApproved: null, // Only unreviewed
    },
    include: {
      createdBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
      auditLog: {
        select: {
          action: true,
          performedAt: true,
          reason: true,
          severity: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

/**
 * Get all pending reviews for a patient
 */
export async function getPatientPendingReviews(pacienteId: number) {
  return prisma.anamnesisPendingReview.findMany({
    where: {
      pacienteId,
      isApproved: null, // Only unreviewed
    },
    include: {
      anamnesis: {
        select: {
          idPatientAnamnesis: true,
        },
      },
      createdBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
      auditLog: {
        select: {
          action: true,
          performedAt: true,
          reason: true,
          severity: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

/**
 * Batch review multiple pending changes
 */
export async function batchReviewPendingChanges(params: {
  reviewIds: number[]
  reviewedByUserId: number
  isApproved: boolean
  reviewNotes?: string
}): Promise<void> {
  // Check all reviews exist and are unreviewed
  const reviews = await prisma.anamnesisPendingReview.findMany({
    where: {
      idAnamnesisPendingReview: { in: params.reviewIds },
      isApproved: null,
    },
    select: {
      idAnamnesisPendingReview: true,
      anamnesisId: true,
      auditLogId: true,
    },
  })

  if (reviews.length !== params.reviewIds.length) {
    throw new Error("Some reviews were not found or have already been reviewed")
  }

  // Get unique anamnesis IDs
  const anamnesisIds = [...new Set(reviews.map((r) => r.anamnesisId))]

  // Update all reviews
  await prisma.anamnesisPendingReview.updateMany({
    where: {
      idAnamnesisPendingReview: { in: params.reviewIds },
    },
    data: {
      reviewedAt: new Date(),
      reviewedByUserId: params.reviewedByUserId,
      reviewNotes: params.reviewNotes || null,
      isApproved: params.isApproved,
    },
  })

  // Update audit logs if approved
  if (params.isApproved) {
    const auditLogIds = reviews.map((r) => r.auditLogId)
    await prisma.anamnesisAuditLog.updateMany({
      where: {
        idAnamnesisAuditLog: { in: auditLogIds },
      },
      data: {
        reviewedAt: new Date(),
        reviewedByUserId: params.reviewedByUserId,
      },
    })
  }

  // Update status for all affected anamnesis
  for (const anamnesisId of anamnesisIds) {
    await updateAnamnesisStatus(anamnesisId)
  }
}

