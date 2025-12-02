// src/app/api/profesionales/[id]/availability/route.ts
/**
 * PATCH /api/profesionales/[id]/availability - Actualiza solo la disponibilidad de un profesional
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { DisponibilidadUpdateBodySchema } from "../../_schemas"
import { updateAvailability } from "../../_service"
import { validateProfesionalAccess } from "../../_security"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ADMIN y ODONT pueden actualizar disponibilidad (ODONT solo su propia)
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = DisponibilidadUpdateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Validar acceso según rol
    const userIdStr = auth.session.user.id
    if (typeof userIdStr !== "string") {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "ID de usuario no disponible" }, { status: 500 })
    }
    const actorId = parseInt(userIdStr)
    if (isNaN(actorId)) {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: "ID de usuario inválido" }, { status: 500 })
    }
    const accessCheck = await validateProfesionalAccess(id, actorId, auth.role)
    if (!accessCheck.ok) {
      return NextResponse.json({ ok: false, error: accessCheck.error }, { status: 403 })
    }


    const profesional = await updateAvailability(id, parsed.data, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true, data: profesional }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("PATCH /api/profesionales/[id]/availability error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

