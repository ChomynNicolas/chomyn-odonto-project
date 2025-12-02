// src/app/api/admin/procedimientos/route.ts
/**
 * GET /api/admin/procedimientos - Lista procedimientos con filtros
 * POST /api/admin/procedimientos - Crea un nuevo procedimiento
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { ProcedimientoListQuerySchema, ProcedimientoCreateSchema } from "./_schemas"
import { listProcedimientos, createProcedimiento } from "./_service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = ProcedimientoListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listProcedimientos(parsed.data)

    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/admin/procedimientos error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = ProcedimientoCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (!auth.session.user.id) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED", message: "Usuario no válido" }, { status: 401 })
    }
    const actorId = parseInt(auth.session.user.id, 10)
    const procedimiento = await createProcedimiento(
      parsed.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: procedimiento }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/admin/procedimientos error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

