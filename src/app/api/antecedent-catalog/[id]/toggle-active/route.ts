// src/app/api/antecedent-catalog/[id]/toggle-active/route.ts
/**
 * POST /api/antecedent-catalog/[id]/toggle-active - Alterna el estado activo/inactivo
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { AntecedentCatalogIdSchema } from "../../_schemas"
import { toggleAntecedentCatalogActive } from "../../_service"

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
    const parsed = AntecedentCatalogIdSchema.safeParse({ id })

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const actorId = parseInt(auth.session.user.id)
    const antecedentCatalog = await toggleAntecedentCatalogActive(
      parsed.data.id,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: antecedentCatalog }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/antecedent-catalog/[id]/toggle-active error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

