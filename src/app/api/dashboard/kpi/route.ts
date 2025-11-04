// src/app/api/dashboard/kpi/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { getKpiQuerySchema } from "./_schemas"
import { buildDashboardKpi } from "./_service"
import { requireSessionWithRoles } from "../../_lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  const url = new URL(req.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const parsed = getKpiQuerySchema.safeParse(query)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const role = ((auth.session.user as any)?.role as "RECEP" | "ODONT" | "ADMIN") ?? "RECEP"
    const result = await buildDashboardKpi(parsed.data, role)

    // Cache ligera de 60s para aliviar DB en dashboard
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    })
  } catch (e: any) {
    console.error("GET /api/dashboard/kpi error:", e?.code || e?.message)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
