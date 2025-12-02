// src/app/api/pacientes/[id]/agenda/active-plans/route.ts
// GET endpoint that returns active treatment plans with next sessions for appointment creation

import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { getActivePlansContext } from "./_service"
import type { ActivePlanContext } from "@/types/agenda"

/**
 * GET /api/pacientes/[id]/agenda/active-plans
 * Returns active treatment plans with next sessions and recommended appointment details
 * Used when creating new appointments to auto-fill fields based on active plans
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return errors.forbidden("No autenticado")
    }

    const { id: idParam } = await ctx.params
    const pacienteId = Number.parseInt(idParam, 10)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const context = await getActivePlansContext(pacienteId)
    return ok<ActivePlanContext>(context)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/pacientes/[id]/agenda/active-plans]", e)
    return errors.internal(errorMessage ?? "Error al obtener planes activos")
  }
}

