// src/app/api/profesionales/by-user/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma as db } from "@/lib/prisma"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { z } from "zod"

const paramsSchema = z.object({
  userId: z.string().regex(/^\d+$/).transform((v) => Number(v)),
})

export async function GET(req: NextRequest, ctx: { params: Promise<{ userId: string }> }) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 })
  }

  try {
    const { userId } = paramsSchema.parse(await ctx.params)

    // Security: Only allow users to get their own profesionalId
    // Or allow ADMIN to get any user's profesionalId
    const currentUserId = gate.userId
    if (!currentUserId) {
      return NextResponse.json({ ok: false, error: "Usuario no identificado" }, { status: 401 })
    }

    // Validate that the requested userId matches the current user (unless ADMIN)
    if (gate.role !== "ADMIN" && currentUserId !== userId) {
      return NextResponse.json({ ok: false, error: "No autorizado para acceder a este recurso" }, { status: 403 })
    }

    // Find profesional by userId
    const profesional = await db.profesional.findUnique({
      where: { userId },
      select: { idProfesional: true, estaActivo: true },
    })

    if (!profesional) {
      // User is not a professional, return 404
      return NextResponse.json({ ok: false, error: "Usuario no es profesional" }, { status: 404 })
    }

    if (!profesional.estaActivo) {
      return NextResponse.json({ ok: false, error: "Profesional inactivo" }, { status: 403 })
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          idProfesional: profesional.idProfesional,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 })
    }
    console.error("[GET /api/profesionales/by-user/[userId]] Error:", error)
    return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 })
  }
}

