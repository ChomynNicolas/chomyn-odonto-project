// src/app/api/personas/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { searchPersonas } from "./_service.search"

function jsonError(status: number, code: string, error: string) {
  return NextResponse.json({ ok: false, code, error }, { status })
}

export async function GET(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    const params = {
      q: req.nextUrl.searchParams.get("q") ?? "",
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    }
    const result = await searchPersonas(params)

    const res = NextResponse.json({ ok: true, data: result }, { status: 200 })
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (e: any) {
    if (e?.name === "ZodError") {
      return jsonError(400, "VALIDATION_ERROR", e.issues?.[0]?.message ?? "Parámetros inválidos")
    }
    return jsonError(500, "INTERNAL_ERROR", e?.message ?? "Error al buscar personas")
  }
}
