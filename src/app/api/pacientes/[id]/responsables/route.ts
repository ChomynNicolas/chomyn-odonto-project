import { NextResponse, type NextRequest } from "next/server"
import { requireRole } from "@/app/api/pacientes/_rbac"
import { linkResponsablePago, createResponsableWithPersona, getResponsables, LinkResponsableError } from "./_service"
import { IdempotencyHeaderSchema, LinkResponsablePagoSchema, CreateResponsableWithPersonaSchema } from "./_schemas"

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    const params = await ctx.params;
    const pacienteId = Number(params.id)
    if (!Number.isFinite(pacienteId)) return jsonError(400, "VALIDATION_ERROR", "ID de paciente inválido")

    const responsables = await getResponsables(pacienteId)

    const res = NextResponse.json({ ok: true, data: responsables }, { status: 200 })
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (e: unknown) {
    if (e instanceof LinkResponsableError) return jsonError(e.status, e.code, e.message, e.extra)
    const errorMessage = e instanceof Error ? e.message : String(e)
    return jsonError(500, "INTERNAL_ERROR", errorMessage ?? "Error al obtener responsables")
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    // Headers: idempotencia opcional (aceptamos X-Idempotency-Key e Idempotency-Key)
    const headers = Object.fromEntries(req.headers)
    const idem = IdempotencyHeaderSchema.safeParse({
      "x-idempotency-key": headers["x-idempotency-key"],
      "idempotency-key": headers["idempotency-key"],
    })
    if (!idem.success) {
      return jsonError(400, "VALIDATION_ERROR", "Header de idempotencia inválido", idem.error.issues)
    }

    const params = await ctx.params;
    const pacienteId = Number(params.id)
    if (!Number.isFinite(pacienteId)) return jsonError(400, "VALIDATION_ERROR", "ID de paciente inválido")

    const raw = await req.json()
    
    // Intentar parsear como creación con persona nueva primero
    const createWithPersona = CreateResponsableWithPersonaSchema.safeParse(raw)
    if (createWithPersona.success) {
      const result = await createResponsableWithPersona({
        pacienteId,
        data: createWithPersona.data,
        actorUserId: gate.userId,
      })
      const res = NextResponse.json({ ok: true, data: result }, { status: 201 })
      res.headers.set("Cache-Control", "no-store")
      return res
    }

    // Si no, intentar parsear como vinculación con personaId existente
    const body = LinkResponsablePagoSchema.parse(raw)
    const result = await linkResponsablePago({
      pacienteId,
      personaId: body.personaId,
      relacion: body.relacion,
      esPrincipal: body.esPrincipal ?? true,
      actorUserId: gate.userId,
    })

    const res = NextResponse.json({ ok: true, data: result }, { status: 201 })
    res.headers.set("Cache-Control", "no-store")
    // Puedes ecoear la key para debug si deseas:
    // if (idem.success) res.headers.set("X-Idempotency-Key", idem.data["x-idempotency-key"] ?? idem.data["idempotency-key"] ?? "")
    return res
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "ZodError") {
      const zodError = e as { issues?: unknown }
      return jsonError(400, "VALIDATION_ERROR", "Datos inválidos", zodError.issues)
    }
    if (e instanceof LinkResponsableError) return jsonError(e.status, e.code, e.message, e.extra)
    const code = (e as { code?: string })?.code
    if (code === "P2002") return jsonError(409, "UNIQUE_CONFLICT", "Ya existe un vínculo igual")
    const errorMessage = e instanceof Error ? e.message : String(e)
    return jsonError(500, "INTERNAL_ERROR", errorMessage ?? "Error al vincular responsable")
  }
}
