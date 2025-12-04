// src/app/api/treatment-plan-catalog/route.ts
/**
 * GET /api/treatment-plan-catalog - Lista treatment plan catalogs con filtros
 * POST /api/treatment-plan-catalog - Crea un nuevo treatment plan catalog
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../_lib/auth"
import { TreatmentPlanCatalogListQuerySchema, TreatmentPlanCatalogCreateBodySchema } from "./_schemas"
import { listTreatmentPlanCatalogs, createTreatmentPlanCatalog } from "./_service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT", "RECEP"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = TreatmentPlanCatalogListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listTreatmentPlanCatalogs(parsed.data)

    // Optional: Log de visualización (solo ADMIN)
    // Note: We skip audit log for list view to avoid clutter

    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/treatment-plan-catalog error:", code || errorMessage)
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
    const parsed = TreatmentPlanCatalogCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (!auth.session?.user?.id) {
      return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
    }
    const actorId = parseInt(auth.session.user.id as string)
    const catalog = await createTreatmentPlanCatalog(
      parsed.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: catalog }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/treatment-plan-catalog error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

