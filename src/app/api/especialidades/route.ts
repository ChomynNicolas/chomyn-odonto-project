// src/app/api/especialidades/route.ts
/**
 * GET /api/especialidades - Lista especialidades activas
 */

import { type NextRequest, NextResponse } from "next/server"
import { listEspecialidades } from "./_service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const especialidades = await listEspecialidades()
    return NextResponse.json({ ok: true, data: especialidades }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/especialidades error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

