import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { paramsSchema } from "./_schemas"
import { getCitaDetail } from "./_service"

export const revalidate = 0
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const parsed = paramsSchema.safeParse(await context.params)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten?.() }, { status: 400 })
  }

  try {
    const rol = (auth.session.user as any)?.rolNombre ?? (auth.session.user as any)?.rol ?? "RECEP"
    const dto = await getCitaDetail(parsed.data.id, rol)

    if (!dto) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
    }

    const res = NextResponse.json({ ok: true, data: dto }, { status: 200 })
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (e: any) {
    console.error("GET /api/agenda/citas/[id] error:", e?.message)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
