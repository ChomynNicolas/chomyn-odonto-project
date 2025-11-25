// src/app/api/pacientes/[id]/plan-tratamiento/[stepId]/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { UpdateStepStatusSchema } from "../_schemas"
import { updateStepStatus } from "../_service"
import { requireRole } from "../../_rbac"

/**
 * PATCH /api/pacientes/[id]/plan-tratamiento/[stepId]
 * Actualiza el estado de un paso específico del plan
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const gate = await requireRole(["ADMIN", "ODONT"])
    if (!gate.ok) return errors.forbidden(gate.error)

    const { id: idParam, stepId: stepIdParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    const stepId = Number.parseInt(stepIdParam, 10)
    
    if (!Number.isFinite(pacienteId) || !Number.isFinite(stepId)) {
      return errors.validation("ID inválido")
    }

    const body = await req.json()
    const validationResult = UpdateStepStatusSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    await updateStepStatus(stepId, validationResult.data.status)
    return ok({ success: true })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PATCH /api/pacientes/[id]/plan-tratamiento/[stepId]]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (errorMessage.includes("inválido")) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al actualizar estado del paso")
  }
}

