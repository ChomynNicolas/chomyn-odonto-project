// src/app/api/allergies/route.ts
/**
 * GET /api/allergies - Lista allergy catalogs con filtros
 * POST /api/allergies - Crea un nuevo allergy catalog
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../_lib/auth"
import { AllergyCatalogListQuerySchema, AllergyCatalogCreateBodySchema } from "./_schemas"
import { listAllergyCatalogs, createAllergyCatalog } from "./_service"
import { safeAuditWrite } from "@/lib/audit/log"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["ADMIN", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const parsed = AllergyCatalogListQuerySchema.safeParse(query)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await listAllergyCatalogs(parsed.data)

    // Optional: Log de visualización (solo ADMIN)
    if (auth.session?.user?.id && auth.role === "ADMIN") {
      await safeAuditWrite({
        actorId: parseInt(auth.session.user.id),
        action: AuditAction.ALLERGY_CATALOG_LIST_VIEW,
        entity: AuditEntity.AllergyCatalog,
        entityId: 0,
        metadata: {
          filters: parsed.data,
          count: result.data.length,
        },
        headers: req.headers,
        path: req.nextUrl.pathname,
      })
    }

    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/allergies error:", code || errorMessage)
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
    const parsed = AllergyCatalogCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (!auth.session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED", message: "User ID missing from session" },
        { status: 401 }
      )
    }

    const actorId = parseInt(auth.session.user.id as string)
    const allergyCatalog = await createAllergyCatalog(
      parsed.data,
      actorId,
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: allergyCatalog }, { status: 201 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    // Manejar errores de validación conocidos
    if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    if (errorMessage.includes("no encontrado") || errorMessage.includes("no existe")) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND", message: errorMessage }, { status: 404 })
    }

    console.error("POST /api/allergies error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

