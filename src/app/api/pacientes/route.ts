// src/app/api/pacientes/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { pacienteCreateBodySchema } from "./_schemas";
import { createPaciente } from "./_service.create";
import { requireRole } from "./_rbac";
import { auth } from "@/auth";
import { parsePacientesListQuery, listPacientes } from "./_service.list";
import { errors, okCreatedWithIdempotency } from "../_http";



export async function GET(request: NextRequest) {
  // 1) RBAC lectura
  const authz = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!authz.ok) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 })
  }

  try {
    // 2) Parseo de query con Zod centralizado
    const query = parsePacientesListQuery(request.nextUrl.searchParams)

    // 3) Lógica delegada al service → repo (sin N+1)
    const { items, nextCursor, hasMore, totalCount } = await listPacientes(query)

    // 4) Respuesta y headers de paginado
    const res = NextResponse.json({ items, nextCursor, hasMore, totalCount }, { status: 200 })
    res.headers.set("X-Total-Count", String(totalCount))
    res.headers.set("Cache-Control", "no-store")
    return res
  } catch (e: any) {
    // 5) Errores previstos: Zod → 400
    if (e?.name === "ZodError") {
      return NextResponse.json(
        { ok: false, error: "Parámetros inválidos", details: e.issues },
        { status: 400 }
      )
    }
    // (opcional) Prisma P2025 (no encontrado) o validaciones de negocio → 400/404
    if (typeof e?.code === "string" && e.code.startsWith("P")) {
      return NextResponse.json(
        { ok: false, error: "Error de base de datos", code: e.code },
        { status: 400 }
      )
    }
    // 6) Fallback
    return NextResponse.json({ ok: false, error: "Error inesperado" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "RECEP", "ODONT"])
  if (!gate.ok) return errors.forbidden()

  try {
    const raw = await req.json()
    const body = pacienteCreateBodySchema.parse(raw)

    const session = await auth()
    const actorUserId = Number((session?.user as any)?.id) || undefined

    const result = await createPaciente(body, actorUserId)
    // Sobre estándar + eco opcional de X-Idempotency-Key
    return okCreatedWithIdempotency(req, result)
  } catch (e: any) {
    if (e?.code === "P2002") return errors.conflict("Documento o contacto ya existe")
    if (e?.name === "ZodError") return errors.validation(e.issues?.[0]?.message ?? "Datos inválidos")
    return errors.internal(e?.message ?? "Error interno al crear paciente")
  }
}