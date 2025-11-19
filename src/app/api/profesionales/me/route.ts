// src/app/api/profesionales/me/route.ts
/**
 * GET /api/profesionales/me - Obtiene el profesional asociado al usuario actual
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { getProfesionalById } from "../_service"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Solo ODONT puede acceder a su propio perfil
  const auth = await requireSessionWithRoles(req, ["ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const actorId = parseInt(auth.session.user.id)

    // Buscar el profesional asociado al usuario actual
    const profesional = await prisma.profesional.findUnique({
      where: { userId: actorId },
      select: { idProfesional: true },
    })

    if (!profesional) {
      return NextResponse.json(
        { ok: false, error: "NOT_FOUND", message: "No se encontró un profesional asociado a tu usuario" },
        { status: 404 }
      )
    }

    const profesionalDetail = await getProfesionalById(profesional.idProfesional)

    if (!profesionalDetail) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, data: profesionalDetail }, { status: 200 })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/profesionales/me error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

