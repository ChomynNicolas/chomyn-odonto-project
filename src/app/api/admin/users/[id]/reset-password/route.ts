// src/app/api/admin/users/[id]/reset-password/route.ts
/**
 * POST /api/admin/users/[id]/reset-password - Resetea la contraseña de un usuario
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../../_lib/auth"
import { PasswordResetBodySchema } from "../../_schemas"
import { resetUserPassword } from "../../_service"

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
    const userId = parseInt(id)

    if (isNaN(userId)) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = PasswordResetBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const actorId = parseInt(auth.session.user.id)
    const result = await resetUserPassword(userId, parsed.data, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/admin/users/[id]/reset-password error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

