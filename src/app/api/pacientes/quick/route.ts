// src/app/api/pacientes/quick/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { pacienteQuickCreateSchema, idempotencyHeaderSchema } from "./_schemas"
import { quickCreatePaciente, QuickCreateError } from "./_service.quick"

function jsonError(status: number, code: string, error: string, details?: unknown) {
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
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: unknown }
      return jsonError(400, "VALIDATION_ERROR", "Datos inválidos", zodError.issues)
    }
    if (e instanceof QuickCreateError) return jsonError(e.status, e.code, e.message)
    const code = (e as { code?: string })?.code
    if (code === "P2002")
      return jsonError(409, "UNIQUE_CONFLICT", "Ya existe un paciente con ese documento o contacto")
    const errorMessage = e instanceof Error ? e.message : String(e)
    return jsonError(500, "INTERNAL_ERROR", errorMessage ?? "Error al crear paciente")
  }
}
