// src/app/api/profesionales/[id]/toggle-activo/route.ts
/**
 * PATCH /api/profesionales/[id]/toggle-activo - Activa o desactiva un profesional
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { ToggleActivoBodySchema } from "../../_schemas"
import { toggleActivo } from "../../_service"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Solo ADMIN puede activar/desactivar profesionales
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
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
    const parsed = ToggleActivoBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const actorId = parseInt(auth.session.user.id)
    const profesional = await toggleActivo(id, parsed.data, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true, data: profesional }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("PATCH /api/profesionales/[id]/toggle-activo error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

