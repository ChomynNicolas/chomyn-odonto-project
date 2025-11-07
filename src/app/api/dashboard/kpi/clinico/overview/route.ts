// src/app/api/kpis/clinico/overview/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { kpiFiltersSchema } from "../_schemas"
import { buildKpiClinicoOverview } from "../_service"

export const dynamic = "force-dynamic"

/**
 * GET /api/kpis/clinico/overview
 * Retorna todos los KPIs clínicos para el overview
 */
export async function GET(req: NextRequest) {
  // Autenticación y autorización
  const authResult = await requireSessionWithRoles(req, ["ADMIN", "ODONT", "RECEP"])
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { session, role } = authResult
  const userId = (session.user as any).id

  try {
    // Parsear query params
    const { searchParams } = new URL(req.url)
    const filtersRaw = {
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      profesionalIds: searchParams.get("profesionalIds")?.split(",").map(Number),
      consultorioIds: searchParams.get("consultorioIds")?.split(",").map(Number),
      tipoCita: searchParams.get("tipoCita")?.split(","),
      estadoCita: searchParams.get("estadoCita")?.split(","),
      procedimientoIds: searchParams.get("procedimientoIds")?.split(",").map(Number),
      diagnosisIds: searchParams.get("diagnosisIds")?.split(",").map(Number),
      genero: searchParams.get("genero")?.split(","),
      edadMin: searchParams.get("edadMin") ? Number(searchParams.get("edadMin")) : undefined,
      edadMax: searchParams.get("edadMax") ? Number(searchParams.get("edadMax")) : undefined,
      pacienteNuevo: searchParams.get("pacienteNuevo") === "true",
      privacyMode: searchParams.get("privacyMode") === "true",
    }

    // Validar con Zod
    const filters = kpiFiltersSchema.parse(filtersRaw)

    // Calcular KPIs
    const kpis = await buildKpiClinicoOverview(filters, role, userId)

    // Cache control
    return NextResponse.json(kpis, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Type": "application/json",
      },
    })
  } catch (error: any) {
    console.error("[KPI Clinico Overview] Error:", error)

    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Parámetros inválidos", details: error.errors }, { status: 400 })
    }

    return NextResponse.json({ error: "Error al calcular KPIs clínicos" }, { status: 500 })
  }
}
