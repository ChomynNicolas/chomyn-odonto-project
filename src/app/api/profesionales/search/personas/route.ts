// src/app/api/profesionales/search/personas/route.ts
/**
 * GET /api/profesionales/search/personas - Búsqueda de personas para wizard
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { PersonaSearchQuerySchema } from "../../_schemas"
import { searchPersonas } from "../../_search.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Solo ADMIN puede buscar personas para crear profesionales
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = PersonaSearchQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const results = await searchPersonas(parsed.data)

    return NextResponse.json({ ok: true, data: results }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/profesionales/search/personas error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

