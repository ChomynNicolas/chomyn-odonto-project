// src/lib/services/anamnesis-audit.service.ts
// Audit service for tracking medication and allergy changes in anamnesis

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export type AuditAction = "ADDED" | "UPDATED" | "DEACTIVATED" | "REACTIVATED" | "REMOVED"

interface MedicationSnapshot {
  medicationId?: number
  catalogId?: number
  customLabel?: string
  customDose?: string
  customFreq?: string
  customRoute?: string
  notes?: string | null
  isActive: boolean
}

interface AllergySnapshot {
  allergyId?: number
  catalogId?: number
  customLabel?: string
  severity?: "MILD" | "MODERATE" | "SEVERE"
  reaction?: string | null
  notes?: string | null
  isActive: boolean
}

type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>

// Type for Prisma client that can be either transaction or regular client
type PrismaClientLike = PrismaTransaction | typeof prisma

/**
 * Log a medication change in anamnesis
 * @param params - Parameters for logging the change
 * @param tx - Optional transaction client. If provided, uses transaction; otherwise uses prisma directly.
 */
export async function logMedicationChange(
  params: {
    anamnesisMedicationId: number
    action: AuditAction
    previousValue?: MedicationSnapshot
    newValue?: MedicationSnapshot
    performedByUserId: number
    notes?: string
  },
  tx?: PrismaTransaction
): Promise<void> {
  const client: PrismaClientLike = tx || prisma
  await client.anamnesisMedicationAudit.create({
    data: {
      anamnesisMedicationId: params.anamnesisMedicationId,
      action: params.action,
      previousValue: params.previousValue ? (params.previousValue as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValue: params.newValue ? (params.newValue as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      performedByUserId: params.performedByUserId,
      notes: params.notes || null,
    },
  })
}

/**
 * Log an allergy change in anamnesis
 * @param params - Parameters for logging the change
 * @param tx - Optional transaction client. If provided, uses transaction; otherwise uses prisma directly.
 */
export async function logAllergyChange(
  params: {
    anamnesisAllergyId: number
    action: AuditAction
    previousValue?: AllergySnapshot
    newValue?: AllergySnapshot
    performedByUserId: number
    notes?: string
  },
  tx?: PrismaTransaction
): Promise<void> {
  const client: PrismaClientLike = tx || prisma
  await client.anamnesisAllergyAudit.create({
    data: {
      anamnesisAllergyId: params.anamnesisAllergyId,
      action: params.action,
      previousValue: params.previousValue ? (params.previousValue as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValue: params.newValue ? (params.newValue as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      performedByUserId: params.performedByUserId,
      notes: params.notes || null,
    },
  })
}

/**
 * Get medication change history for a specific medication in anamnesis
 */
export async function getMedicationHistory(anamnesisMedicationId: number) {
  return prisma.anamnesisMedicationAudit.findMany({
    where: { anamnesisMedicationId },
    include: {
      performedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
    },
    orderBy: { performedAt: "desc" },
  })
}

/**
 * Get allergy change history for a specific allergy in anamnesis
 */
export async function getAllergyHistory(anamnesisAllergyId: number) {
  return prisma.anamnesisAllergyAudit.findMany({
    where: { anamnesisAllergyId },
    include: {
      performedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
    },
    orderBy: { performedAt: "desc" },
  })
}

/**
 * Get all medication changes for an anamnesis
 */
export async function getAnamnesisMedicationHistory(anamnesisId: number) {
  return prisma.anamnesisMedicationAudit.findMany({
    where: {
      anamnesisMedication: {
        anamnesisId,
      },
    },
    include: {
      performedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
      anamnesisMedication: {
        include: {
          medication: {
            select: {
              idPatientMedication: true,
              label: true,
              medicationCatalog: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { performedAt: "desc" },
  })
}

/**
 * Get all allergy changes for an anamnesis
 */
export async function getAnamnesisAllergyHistory(anamnesisId: number) {
  return prisma.anamnesisAllergyAudit.findMany({
    where: {
      anamnesisAllergy: {
        anamnesisId,
      },
    },
    include: {
      performedBy: {
        select: {
          idUsuario: true,
          nombreApellido: true,
        },
      },
      anamnesisAllergy: {
        include: {
          allergy: {
            select: {
              idPatientAllergy: true,
              label: true,
              allergyCatalog: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { performedAt: "desc" },
  })
}

