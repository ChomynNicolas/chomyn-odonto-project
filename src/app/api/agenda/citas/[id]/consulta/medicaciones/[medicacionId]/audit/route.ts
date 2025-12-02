// src/app/api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]/audit/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { z } from "zod"
import { CONSULTA_RBAC } from "../../../_rbac"
import { getMedicationHistory } from "../../_audit.service"

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
  medicacionId: z.coerce.number().int().positive(),
})

/**
 * GET /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]/audit
 * Returns audit history for a specific medication
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; medicacionId: string }> }) {
  try {
    const parsed = paramsSchema.safeParse(await ctx.params)
    if (!parsed.success) return errors.validation("Parámetros inválidos")
    const { medicacionId } = parsed.data

    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    if (!CONSULTA_RBAC.canViewClinicalData(rol)) {
      return errors.forbidden("Solo ODONT y ADMIN pueden ver el historial de medicaciones")
    }

    const history = await getMedicationHistory(medicacionId)
    if (!history) {
      return errors.notFound("Medicación no encontrada")
    }

    return ok(history)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/agenda/citas/[id]/consulta/medicaciones/[medicacionId]/audit]", e)
    return errors.internal(errorMessage ?? "Error al obtener historial de medicación")
  }
}

