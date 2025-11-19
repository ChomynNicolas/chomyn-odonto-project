// src/app/api/anamnesis-config/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { AnamnesisConfigIdSchema, AnamnesisConfigUpdateBodySchema } from "../_schemas"
import { getAnamnesisConfigById, updateAnamnesisConfig } from "../_service"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: ADMIN only
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id: idStr } = await params
  const parsed = AnamnesisConfigIdSchema.safeParse({ id: idStr })

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await getAnamnesisConfigById(parsed.data.id)
    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    
    if (errorMessage.includes("no encontrada")) {
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 404 })
    }
    
    console.error("GET /api/anamnesis-config/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // RBAC: ADMIN only
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const { id: idStr } = await params
  const idParsed = AnamnesisConfigIdSchema.safeParse({ id: idStr })

  if (!idParsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: idParsed.error.flatten() }, { status: 400 })
  }

  const bodyJson = await req.json().catch(() => null)
  const bodyParsed = AnamnesisConfigUpdateBodySchema.safeParse(bodyJson)

  if (!bodyParsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: bodyParsed.error.flatten() }, { status: 400 })
  }

  try {
    const userId = auth.session.user.id
    if (!userId) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 })
    }

    const result = await updateAnamnesisConfig(
      idParsed.data.id,
      bodyParsed.data,
      Number(userId),
      req.headers,
      req.nextUrl.pathname
    )

    return NextResponse.json({ ok: true, data: result }, { status: 200 })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    
    if (errorMessage.includes("no encontrada")) {
      return NextResponse.json({ ok: false, error: errorMessage }, { status: 404 })
    }
    
    console.error("PUT /api/anamnesis-config/[id] error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

