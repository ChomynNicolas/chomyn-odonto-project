// src/app/api/allergies/[id]/toggle-active/route.ts
/**
 * POST /api/allergies/[id]/toggle-active - Alterna el estado activo/inactivo
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { AllergyCatalogIdSchema } from "../../_schemas"
import { toggleAllergyCatalogActive } from "../../_service"

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
    const parsed = AllergyCatalogIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const userId = auth.session.user.id
    if (typeof userId !== "string") {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID de usuario inválido" }, { status: 400 })
    }
    const actorId = parseInt(userId)
    const allergyCatalog = await toggleAllergyCatalogActive(
      parsed.data.id,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: allergyCatalog }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/allergies/[id]/toggle-active error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

