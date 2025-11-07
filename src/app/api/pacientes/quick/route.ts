// src/app/api/pacientes/quick/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { pacienteQuickCreateSchema, idempotencyHeaderSchema } from "./_schemas"
import { quickCreatePaciente, QuickCreateError } from "./_service.quick"

function jsonError(status: number, code: string, error: string, details?: any) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    const headers = Object.fromEntries(req.headers)
    const idemParsed = idempotencyHeaderSchema.safeParse({
      "idempotency-key": headers["idempotency-key"],
    })
    if (!idemParsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Header de idempotencia inválido", idemParsed.error.issues)
    }

    const raw = await req.json()
    const body = pacienteQuickCreateSchema.parse(raw)

    const result = await quickCreatePaciente(body, gate.userId)
    // ⬅️ ahora incluye { idPaciente, idPersona, item }
    return NextResponse.json({ ok: true, data: result }, { status: 201 })
  } catch (e: any) {
    if (e?.name === "ZodError") return jsonError(400, "VALIDATION_ERROR", "Datos inválidos", e.issues)
    if (e instanceof QuickCreateError) return jsonError(e.status, e.code, e.message)
    if (e?.code === "P2002")
      return jsonError(409, "UNIQUE_CONFLICT", "Ya existe un paciente con ese documento o contacto")
    return jsonError(500, "INTERNAL_ERROR", e?.message ?? "Error al crear paciente")
  }
}
