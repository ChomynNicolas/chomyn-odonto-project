import type { NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { ok, errors, safeLog } from "@/app/api/pacientes/_http"
import { ConsentimientoRevokeSchema } from "../_schemas"
import { obtenerConsentimiento, revocarConsentimiento, ConsentimientoError } from "../_service"

export async function GET(req: NextRequest, ctx: { params: { id: string; consentimientoId: string } }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const consentimientoId = Number(ctx.params.consentimientoId)
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
  } catch (e: any) {
    safeLog("error", "Error getting consent", { requestId, error: e?.message })
    return errors.internal(e?.message ?? "Error al obtener consentimiento")
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string; consentimientoId: string } }) {
  const gate = await requireRole(["ADMIN", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const consentimientoId = Number(ctx.params.consentimientoId)
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
  } catch (e: any) {
    safeLog("error", "Error revoking consent", { requestId, error: e?.message })

    if (e?.name === "ZodError") {
      return errors.validation(e.issues?.[0]?.message ?? "Datos inválidos")
    }

    if (e instanceof ConsentimientoError) {
      if (e.status === 404) return errors.notFound(e.message)
      return errors.apiError?.(e.status, e.code, e.message, e.extra) ?? errors.internal(e.message)
    }

    return errors.internal(e?.message ?? "Error al revocar consentimiento")
  }
}
