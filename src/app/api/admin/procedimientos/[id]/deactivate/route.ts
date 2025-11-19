// src/app/api/admin/procedimientos/[id]/deactivate/route.ts
/**
 * POST /api/admin/procedimientos/[id]/deactivate - Desactiva un procedimiento
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../../_lib/auth"
import { ProcedimientoIdSchema } from "../../_schemas"
import { deactivateProcedimiento } from "../../_service"

export const dynamic = "force-dynamic"

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await context.params
    const parsed = ProcedimientoIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const actorId = parseInt(auth.session.user.id)
    const procedimiento = await deactivateProcedimiento(
      parsed.data.id,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: procedimiento }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes("ya está desactivado")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    console.error("POST /api/admin/procedimientos/[id]/deactivate error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

