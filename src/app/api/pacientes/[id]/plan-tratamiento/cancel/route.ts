// src/app/api/pacientes/[id]/plan-tratamiento/cancel/route.ts
import type { NextRequest } from "next/server"
import { ok, errors } from "@/app/api/_http"
import { cancelPlan } from "../_service"
import { requireRole } from "../../../_rbac"
import { auditPlanStatusChange } from "../_audit"

/**
 * PUT /api/pacientes/[id]/plan-tratamiento/cancel
 * Cancela un plan de tratamiento
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

    // Get active plan to get the plan ID and old status
    const { getActivePlan } = await import("../_service")
    const activePlan = await getActivePlan(pacienteId)
    if (!activePlan) {
      return errors.notFound("No hay un plan de tratamiento activo para este paciente")
    }

    const userId = gate.userId!
    const oldStatus = activePlan.status
    const plan = await cancelPlan(activePlan.id)

    // Audit: Plan status change
    await auditPlanStatusChange(plan.id, userId, {
      pacienteId,
      oldStatus,
      newStatus: plan.status,
      action: "CANCEL",
      citaId: null,
    }, req)

    return ok(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/pacientes/[id]/plan-tratamiento/cancel]", e)

    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (errorMessage.includes("inválido") || errorMessage.includes("transición")) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al cancelar plan de tratamiento")
  }
}

