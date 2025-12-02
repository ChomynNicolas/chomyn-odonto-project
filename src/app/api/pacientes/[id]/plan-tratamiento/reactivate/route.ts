// src/app/api/pacientes/[id]/plan-tratamiento/reactivate/route.ts
import type { NextRequest } from "next/server"
import { ok, errors } from "@/app/api/_http"
import { reactivatePlan } from "../_service"
import { requireRole } from "../../../_rbac"
import { TreatmentPlanStatus } from "@prisma/client"
import { auditPlanStatusChange } from "../_audit"

/**
 * PUT /api/pacientes/[id]/plan-tratamiento/reactivate
 * Reactiva un plan de tratamiento que está COMPLETED o CANCELLED
 */
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireRole(["ADMIN", "ODONT"])
    if (!gate.ok) return errors.forbidden(gate.error)

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    // Get the plan to reactivate (can be completed or cancelled)
    // First check if there's an active plan - if so, error
    const { getActivePlan } = await import("../_service")
    const activePlan = await getActivePlan(pacienteId)
    if (activePlan) {
      return errors.validation(
        "El paciente ya tiene un plan de tratamiento activo. Debe completar o cancelar el plan existente antes de reactivar otro."
      )
    }

    // Find a completed or cancelled plan for this patient
    const { prisma } = await import("@/lib/prisma")
    const planToReactivate = await prisma.treatmentPlan.findFirst({
      where: {
        pacienteId,
        status: {
          in: [TreatmentPlanStatus.COMPLETED, TreatmentPlanStatus.CANCELLED],
        },
      },
      orderBy: {
        updatedAt: "desc", // Get the most recently updated one
      },
    })

    if (!planToReactivate) {
      return errors.notFound(
        "No se encontró un plan de tratamiento completado o cancelado para reactivar"
      )
    }

    const userId = gate.userId!
    const oldStatus = planToReactivate.status
    const plan = await reactivatePlan(planToReactivate.idTreatmentPlan)

    // Audit: Plan status change
    await auditPlanStatusChange(plan.id, userId, {
      pacienteId,
      oldStatus,
      newStatus: plan.status,
      action: "REACTIVATE",
      citaId: null,
    }, req)

    return ok(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/pacientes/[id]/plan-tratamiento/reactivate]", e)

    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (
      errorMessage.includes("inválido") ||
      errorMessage.includes("transición") ||
      errorMessage.includes("ya tiene")
    ) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al reactivar plan de tratamiento")
  }
}

