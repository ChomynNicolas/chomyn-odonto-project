// src/app/api/profesionales/search/usuarios/route.ts
/**
 * GET /api/profesionales/search/usuarios - Búsqueda de usuarios ODONT para wizard
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../../_lib/auth"
import { UsuarioSearchQuerySchema } from "../../_schemas"
import { searchUsuariosODONT } from "../../_search.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Solo ADMIN puede buscar usuarios ODONT para crear profesionales
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = UsuarioSearchQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const results = await searchUsuariosODONT(parsed.data)

    return NextResponse.json({ ok: true, data: results }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/profesionales/search/usuarios error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

