// src/app/api/personas/[id]/route.ts
/**
 * GET /api/personas/[id] - Obtiene una persona por ID
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // ADMIN, RECEP y ODONT pueden ver personas
  const auth = await requireSessionWithRoles(req, ["ADMIN", "RECEP", "ODONT"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const params = await context.params
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "ID inválido" }, { status: 400 })
    }

    const persona = await prisma.persona.findUnique({
      where: { idPersona: id },
      select: {
        idPersona: true,
        nombres: true,
        apellidos: true,
        segundoApellido: true,
        documento: {
          select: {
            tipo: true,
            numero: true,
          },
        },
        contactos: {
          where: {
            activo: true,
            esPrincipal: true,
          },
          select: {
            tipo: true,
            valorRaw: true,
          },
          take: 1,
        },
      },
    })

    if (!persona) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 })
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          idPersona: persona.idPersona,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          segundoApellido: persona.segundoApellido,
          documento: persona.documento
            ? {
                tipo: persona.documento.tipo,
                numero: persona.documento.numero,
              }
            : null,
          email: persona.contactos.find((c) => c.tipo === "EMAIL")?.valorRaw || null,
          telefono: persona.contactos.find((c) => c.tipo === "PHONE")?.valorRaw || null,
        },
      },
      { status: 200 }
    )
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("GET /api/personas/[id] error:", code || errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}

