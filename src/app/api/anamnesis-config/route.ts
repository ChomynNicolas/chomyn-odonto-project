// src/app/api/anamnesis-config/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "../_lib/auth"
import { AnamnesisConfigListQuerySchema, AnamnesisConfigCreateBodySchema } from "./_schemas"
import { toPageLimit } from "../_lib/pagination"
import { listAnamnesisConfigs, createAnamnesisConfig } from "./_service"

export async function GET(req: NextRequest) {
  // RBAC: ADMIN only
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  // Parse and validate query params
  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const parsed = AnamnesisConfigListQuerySchema.safeParse(query)

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  const { page, limit, skip } = toPageLimit({
    page: parsed.data.page,
    limit: parsed.data.limit,
  })

  try {
    const { data, meta } = await listAnamnesisConfigs(parsed.data, page, limit, skip)
    return NextResponse.json({ ok: true, meta, data }, { status: 200 })
  } catch (e: unknown) {
    const errorCode = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/anamnesis-config error:", errorCode || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // RBAC: ADMIN only
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const bodyJson = await req.json().catch(() => null)
  const parsed = AnamnesisConfigCreateBodySchema.safeParse(bodyJson)
  
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const userId = auth.session.user.id
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
    }

    const result = await createAnamnesisConfig(
      parsed.data,
      Number(userId),
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: result }, { status: 201 })
  } catch (e: unknown) {
    // Handle Prisma errors
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    
    if (code === "P2002") {
      // Unique constraint violation (duplicate key)
      return NextResponse.json({ ok: false, error: "Ya existe una configuración con esa clave" }, { status: 409 })
    }
    
    if (errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 409 })
    }
    
    console.error("POST /api/anamnesis-config error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

