// src/app/api/pacientes/[id]/plan-tratamiento/_repo.ts
import { prisma as db } from "@/lib/prisma"
import type { DienteSuperficie, TreatmentStepStatus, TreatmentPlanStatus } from "@prisma/client"

export async function repoGetActivePlan(pacienteId: number) {
  return db.treatmentPlan.findFirst({
    where: {
      pacienteId,
      status: "ACTIVE",
    },
    include: {
      creadoPor: {
        select: {
          idUsuario: true,
          usuario: true,
          nombreApellido: true,
          profesional: {
            select: {
              persona: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      },
      steps: {
        include: {
          procedimientoCatalogo: {
            select: {
              idProcedimiento: true,
              code: true,
              nombre: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  })
}

export async function repoCreatePlan(data: {
  pacienteId: number
  titulo: string
  descripcion?: string | null
  createdByUserId: number
  steps: Array<{
    order: number
    procedureId?: number | null
    serviceType?: string | null
    toothNumber?: number | null
    toothSurface?: DienteSuperficie | null
    estimatedDurationMin?: number | null
    estimatedCostCents?: number | null
    priority?: number | null
    notes?: string | null
    requiresMultipleSessions?: boolean
    totalSessions?: number | null
    currentSession?: number | null
  }>
}) {
  return db.$transaction(async (tx) => {
    // Create new plan with ACTIVE status
    // Note: Validation for existing active plan should be done in service layer
    const plan = await tx.treatmentPlan.create({
      data: {
        pacienteId: data.pacienteId,
        titulo: data.titulo,
        descripcion: data.descripcion ?? null,
        status: "ACTIVE",
        createdByUserId: data.createdByUserId,
      },
    })

    // Create steps
    await tx.treatmentStep.createMany({
      data: data.steps.map((step) => ({
        treatmentPlanId: plan.idTreatmentPlan,
        order: step.order,
        procedureId: step.procedureId ?? null,
        serviceType: step.serviceType ?? null,
        toothNumber: step.toothNumber ?? null,
        toothSurface: step.toothSurface ?? null,
        estimatedDurationMin: step.estimatedDurationMin ?? null,
        estimatedCostCents: step.estimatedCostCents ?? null,
        priority: step.priority ?? null,
        notes: step.notes ?? null,
        requiresMultipleSessions: step.requiresMultipleSessions ?? false,
        totalSessions: step.totalSessions ?? null,
        currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
        status: "PENDING" as TreatmentStepStatus,
      })),
    })

    // Return plan with steps
    return tx.treatmentPlan.findUnique({
      where: { idTreatmentPlan: plan.idTreatmentPlan },
      include: {
        creadoPor: {
          select: {
            idUsuario: true,
            usuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
        steps: {
          include: {
            procedimientoCatalogo: {
              select: {
                idProcedimiento: true,
                code: true,
                nombre: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })
  })
}

export async function repoUpdatePlan(
  planId: number,
  data: {
    titulo?: string
    descripcion?: string | null
    steps?: Array<{
      id?: number
      order: number
      procedureId?: number | null
      serviceType?: string | null
      toothNumber?: number | null
      toothSurface?: DienteSuperficie | null
      estimatedDurationMin?: number | null
      estimatedCostCents?: number | null
      priority?: number | null
      notes?: string | null
      requiresMultipleSessions?: boolean
      totalSessions?: number | null
      currentSession?: number | null
    }>
  }
) {
  return db.$transaction(async (tx) => {
    // Update plan metadata
    const updateData: {
      titulo?: string
      descripcion?: string | null
    } = {}
    if (data.titulo !== undefined) updateData.titulo = data.titulo
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion

    if (Object.keys(updateData).length > 0) {
      await tx.treatmentPlan.update({
        where: { idTreatmentPlan: planId },
        data: updateData,
      })
    }

    // Update steps if provided
    if (data.steps !== undefined) {
      // Get existing step IDs
      const existingSteps = await tx.treatmentStep.findMany({
        where: { treatmentPlanId: planId },
        select: { idTreatmentStep: true },
      })
      const existingStepIds = new Set(existingSteps.map((s) => s.idTreatmentStep))

      // Determine which steps to update, create, or delete
      const stepIdsInUpdate = new Set(
        data.steps.filter((s) => s.id !== undefined).map((s) => s.id!)
      )
      const stepsToDelete = existingSteps.filter((s) => !stepIdsInUpdate.has(s.idTreatmentStep))

      // Delete removed steps
      if (stepsToDelete.length > 0) {
        await tx.treatmentStep.deleteMany({
          where: {
            idTreatmentStep: { in: stepsToDelete.map((s) => s.idTreatmentStep) },
          },
        })
      }

      // Update or create steps
      for (const step of data.steps) {
        if (step.id && existingStepIds.has(step.id)) {
          // Update existing step
          await tx.treatmentStep.update({
            where: { idTreatmentStep: step.id },
            data: {
              order: step.order,
              procedureId: step.procedureId ?? null,
              serviceType: step.serviceType ?? null,
              toothNumber: step.toothNumber ?? null,
              toothSurface: step.toothSurface ?? null,
              estimatedDurationMin: step.estimatedDurationMin ?? null,
              estimatedCostCents: step.estimatedCostCents ?? null,
              priority: step.priority ?? null,
              notes: step.notes ?? null,
              requiresMultipleSessions: step.requiresMultipleSessions ?? false,
              totalSessions: step.totalSessions ?? null,
              currentSession: step.currentSession ?? null,
            },
          })
        } else {
          // Create new step
          await tx.treatmentStep.create({
            data: {
              treatmentPlanId: planId,
              order: step.order,
              procedureId: step.procedureId ?? null,
              serviceType: step.serviceType ?? null,
              toothNumber: step.toothNumber ?? null,
              toothSurface: step.toothSurface ?? null,
              estimatedDurationMin: step.estimatedDurationMin ?? null,
              estimatedCostCents: step.estimatedCostCents ?? null,
              priority: step.priority ?? null,
              notes: step.notes ?? null,
              requiresMultipleSessions: step.requiresMultipleSessions ?? false,
              totalSessions: step.totalSessions ?? null,
              currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
              status: "PENDING" as TreatmentStepStatus,
            },
          })
        }
      }
    }

    // Return updated plan with steps
    return tx.treatmentPlan.findUnique({
      where: { idTreatmentPlan: planId },
      include: {
        creadoPor: {
          select: {
            idUsuario: true,
            usuario: true,
            nombreApellido: true,
            profesional: {
              select: {
                persona: {
                  select: {
                    nombres: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
        steps: {
          include: {
            procedimientoCatalogo: {
              select: {
                idProcedimiento: true,
                code: true,
                nombre: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })
  })
}

export async function repoUpdateStepStatus(stepId: number, status: TreatmentStepStatus) {
  return db.treatmentStep.update({
    where: { idTreatmentStep: stepId },
    data: { status },
  })
}

export async function repoGetPlan(planId: number) {
  return db.treatmentPlan.findUnique({
    where: { idTreatmentPlan: planId },
    include: {
      creadoPor: {
        select: {
          idUsuario: true,
          usuario: true,
          nombreApellido: true,
          profesional: {
            select: {
              persona: {
                select: {
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      },
      steps: {
        include: {
          procedimientoCatalogo: {
            select: {
              idProcedimiento: true,
              code: true,
              nombre: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  })
}

export async function repoGetStepWithPlan(stepId: number) {
  return db.treatmentStep.findUnique({
    where: { idTreatmentStep: stepId },
    include: {
      plan: {
        select: {
          idTreatmentPlan: true,
          pacienteId: true,
          status: true,
        },
      },
      procedimientoCatalogo: {
        select: {
          idProcedimiento: true,
          code: true,
          nombre: true,
        },
      },
    },
  })
}

/**
 * Updates the status of a treatment plan
 */
export async function repoUpdatePlanStatus(
  planId: number,
  status: TreatmentPlanStatus
) {
  return db.treatmentPlan.update({
    where: { idTreatmentPlan: planId },
    data: { status },
  })
}

/**
 * Checks if a patient has an active treatment plan
 */
export async function repoHasActivePlan(pacienteId: number): Promise<boolean> {
  const activePlan = await db.treatmentPlan.findFirst({
    where: {
      pacienteId,
      status: "ACTIVE",
    },
    select: {
      idTreatmentPlan: true,
    },
  })
  return activePlan !== null
}

