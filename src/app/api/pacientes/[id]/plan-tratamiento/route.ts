// src/app/api/pacientes/[id]/plan-tratamiento/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { CreatePlanSchema, UpdatePlanSchema, UpdateStepStatusSchema } from "./_schemas"
import {
  createTreatmentPlan,
  getActivePlan,
  updateTreatmentPlan,
  updateStepStatus,
} from "./_service"
import { requireRole } from "../../_rbac"

/**
 * GET /api/pacientes/[id]/plan-tratamiento
 * Obtiene el plan de tratamiento activo del paciente
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // Only ODONT/ADMIN can view treatment plans
    if (rol === "RECEP") {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver planes de tratamiento")
    }

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const plan = await getActivePlan(pacienteId)
    return ok(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/pacientes/[id]/plan-tratamiento]", e)
    return errors.internal(errorMessage ?? "Error al obtener plan de tratamiento")
  }
}

/**
 * POST /api/pacientes/[id]/plan-tratamiento
 * Crea un nuevo plan de tratamiento para el paciente
 */
export async function POST(
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

    const body = await req.json()
    const validationResult = CreatePlanSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    const userId = gate.userId!
    const plan = await createTreatmentPlan(pacienteId, validationResult.data, userId)
    return ok(plan, undefined, 201)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[POST /api/pacientes/[id]/plan-tratamiento]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (errorMessage.includes("inválido") || errorMessage.includes("debe")) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al crear plan de tratamiento")
  }
}

/**
 * PUT /api/pacientes/[id]/plan-tratamiento
 * Actualiza el plan de tratamiento activo del paciente
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

    // Get active plan
    const activePlan = await getActivePlan(pacienteId)
    if (!activePlan) {
      return errors.notFound("No hay un plan de tratamiento activo para este paciente")
    }

    const body = await req.json()
    const validationResult = UpdatePlanSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      const errorMessage = firstError?.message || "Datos inválidos"
      return errors.validation(errorMessage)
    }

    const userId = gate.userId!
    const plan = await updateTreatmentPlan(activePlan.id, validationResult.data, userId)
    return ok(plan)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[PUT /api/pacientes/[id]/plan-tratamiento]", e)

    // Handle known errors
    if (errorMessage.includes("no encontrado")) {
      return errors.notFound(errorMessage)
    }
    if (errorMessage.includes("inválido") || errorMessage.includes("debe")) {
      return errors.validation(errorMessage)
    }

    return errors.internal(errorMessage ?? "Error al actualizar plan de tratamiento")
  }
}

