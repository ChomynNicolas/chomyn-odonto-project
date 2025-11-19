// src/app/api/personas/create/route.ts
/**
 * POST /api/personas/create - Crea una nueva Persona (sin Paciente)
 */

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionWithRoles } from "../../_lib/auth"
import { PersonaCreateBodySchema } from "../_schemas.create"
import { createPersona } from "../_service.create"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  // Solo ADMIN puede crear personas para profesionales
  const auth = await requireSessionWithRoles(req, ["ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = PersonaCreateBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const persona = await createPersona(parsed.data)

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
        },
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)

    if (errorMessage.includes("Ya existe")) {
      return NextResponse.json({ ok: false, error: "CONFLICT", message: errorMessage }, { status: 409 })
    }

    console.error("POST /api/personas/create error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR", message: errorMessage }, { status: 500 })
  }
}

