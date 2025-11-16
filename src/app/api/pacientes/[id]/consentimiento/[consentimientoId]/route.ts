import type { NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { ok, errors, safeLog } from "@/app/api/pacientes/_http"
import { ConsentimientoRevokeSchema } from "../_schemas"
import { obtenerConsentimiento, revocarConsentimiento, ConsentimientoError } from "../_service"

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; consentimientoId: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const params = await ctx.params
    const consentimientoId = Number(params.consentimientoId)
    if (!Number.isFinite(consentimientoId)) {
      return errors.validation("ID de consentimiento inválido")
    }

    safeLog("info", "Getting consent", { requestId, consentimientoId, userId: gate.userId })

    const consentimiento = await obtenerConsentimiento(consentimientoId)

    if (!consentimiento) {
      safeLog("warn", "Consent not found", { requestId, consentimientoId })
      return errors.notFound("Consentimiento no encontrado")
    }

    return ok(consentimiento)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    safeLog("error", "Error getting consent", { requestId, error: errorMessage })
    return errors.internal(errorMessage ?? "Error al obtener consentimiento")
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; consentimientoId: string }> }) {
  const gate = await requireRole(["ADMIN", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const params = await ctx.params
    const consentimientoId = Number(params.consentimientoId)
    if (!Number.isFinite(consentimientoId)) {
      return errors.validation("ID de consentimiento inválido")
    }

    const body = ConsentimientoRevokeSchema.parse(await req.json())

    safeLog("info", "Revoking consent", { requestId, consentimientoId, userId: gate.userId })

    await revocarConsentimiento({
      idConsentimiento: consentimientoId,
      reason: body.reason,
      userId: gate.userId!,
    })

    safeLog("info", "Consent revoked successfully", { requestId, consentimientoId })

    return ok({ success: true, message: "Consentimiento revocado correctamente" })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    safeLog("error", "Error revoking consent", { requestId, error: errorMessage })

    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: Array<{ message?: string }> }
      return errors.validation(zodError.issues?.[0]?.message ?? "Datos inválidos")
    }

    if (e instanceof ConsentimientoError) {
      if (e.status === 404) return errors.notFound(e.message)
      return errors.apiError?.(e.status, e.code, e.message, e.extra) ?? errors.internal(e.message)
    }

    return errors.internal(errorMessage ?? "Error al revocar consentimiento")
  }
}
