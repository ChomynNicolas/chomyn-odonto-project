import type { NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { ok, errors, safeLog } from "@/app/api/pacientes/_http"
import { ConsentimientoCreateSchema, ConsentimientoListQuerySchema, type ConsentimientoListQuery } from "./_schemas"
import { crearConsentimiento, listarConsentimientos, ConsentimientoError } from "./_service"

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const params = await ctx.params
    const pacienteId = Number(params.id)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const { searchParams } = new URL(req.url)
    const query: ConsentimientoListQuery = ConsentimientoListQuerySchema.parse({
      tipo: searchParams.get("tipo") ?? undefined,
      vigente: searchParams.get("vigente") ?? undefined,
      responsableId: searchParams.get("responsableId") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    })

    safeLog("info", "Listing consents", { requestId, pacienteId, userId: gate.userId })

    const consentimientos = await listarConsentimientos({ pacienteId, query })

    safeLog("info", "Consents listed successfully", {
      requestId,
      pacienteId,
      count: consentimientos.length,
    })

    return ok(consentimientos)
  } catch (e: any) {
    safeLog("error", "Error listing consents", { requestId, error: e?.message })

    if (e?.name === "ZodError") {
      return errors.validation("Parámetros inválidos")
    }

    if (e instanceof ConsentimientoError) {
      if (e.status === 404) return errors.notFound(e.message)
      return errors.apiError?.(e.status, e.code, e.message, e.extra) ?? errors.internal(e.message)
    }

    return errors.internal(e?.message ?? "Error al listar consentimientos")
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  const requestId = crypto.randomUUID()

  try {
    const params = await ctx.params
    const pacienteId = Number(params.id)
    if (!Number.isFinite(pacienteId)) {
      return errors.validation("ID de paciente inválido")
    }

    const body = ConsentimientoCreateSchema.parse(await req.json())

    safeLog("info", "Creating consent", { requestId, pacienteId, userId: gate.userId })

    const consentimiento = await crearConsentimiento({
      pacienteId,
      body,
      userId: gate.userId!,
    })

    safeLog("info", "Consent created successfully", {
      requestId,
      pacienteId,
      consentimientoId: consentimiento.idConsentimiento,
    })

    return ok(consentimiento, undefined, 201)
  } catch (e: any) {
    safeLog("error", "Error creating consent", { requestId, error: e?.message })

    if (e?.name === "ZodError") {
      return errors.validation(e.issues?.[0]?.message ?? "Datos inválidos")
    }

    if (e instanceof ConsentimientoError) {
      if (e.status === 404) return errors.notFound(e.message)
      if (e.status === 403) return errors.forbidden(e.message)
      return errors.apiError?.(e.status, e.code, e.message, e.extra) ?? errors.internal(e.message)
    }

    if (e?.code === "P2002") {
      return errors.conflict("Ya existe un consentimiento con esos datos")
    }

    return errors.internal(e?.message ?? "Error al crear consentimiento")
  }
}
