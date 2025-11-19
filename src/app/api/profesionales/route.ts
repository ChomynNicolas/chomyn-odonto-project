// src/app/api/profesionales/route.ts
/**
 * GET /api/profesionales - Lista profesionales con filtros
 * POST /api/profesionales - Crea un nuevo profesional
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../_lib/auth"
import { ProfesionalListQuerySchema, ProfesionalCreateBodySchema } from "./_schemas"
import { listProfesionales, createProfesional } from "./_service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // ADMIN y RECEP pueden ver la lista (RECEP solo lectura)
  const auth = await requireSessionWithRoles(req, ["ADMIN", "RECEP"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = ProfesionalListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listProfesionales(parsed.data)

    return NextResponse.json(
      { ok: true, ...result },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=300" },
      }
    )
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/profesionales error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Solo ADMIN puede crear profesionales
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = ProfesionalCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const actorId = parseInt(auth.session.user.id)
    const profesional = await createProfesional(parsed.data, actorId, req.headers, req.nextUrl.pathname)

    return NextResponse.json({ ok: true, data: profesional }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (
      errorMessage.includes("ya existe") ||
      errorMessage.includes("ya está vinculado") ||
      errorMessage.includes("ya está en uso")
    ) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    if (errorMessage.includes("rol ODONT") || errorMessage.includes("debe tener rol")) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: errorMessage }, { status: 400 })
    }

    console.error("POST /api/profesionales error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

