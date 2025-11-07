import { type NextRequest, NextResponse } from "next/server"
import { listPacientes, createPaciente } from "./_repo"

import { errors, ok } from "../_http";
import { requireRole } from "./_rbac";
import { PacienteCreateBodySchema } from "./_schemas";
import { checkRateLimit } from "./_http";

// In-memory idempotency cache (in production, use Redis)
const idempotencyCache = new Map<string, { response: any; timestamp: number }>()
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000 // 24 hours

function cleanExpiredIdempotencyKeys() {
  const now = Date.now()
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyCache.delete(key)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters = {
      q: searchParams.get("q") ?? undefined,
      createdFrom: searchParams.get("createdFrom") ?? undefined,
      createdTo: searchParams.get("createdTo") ?? undefined,
      estaActivo:
        searchParams.get("estaActivo") === "true"
          ? true
          : searchParams.get("estaActivo") === "false"
            ? false
            : undefined,
      sort: (searchParams.get("sort") as any) ?? "createdAt_desc",
      cursor: searchParams.get("cursor") ?? undefined,
      limit: Number.parseInt(searchParams.get("limit") ?? "20"),
    }

    const result = await listPacientes(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error("[API] Error listing pacientes:", error)
    return NextResponse.json({ error: "Error al listar pacientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Rate-limit sencillo por IP y ruta (ajusta valores si querés)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      
      (request as any).ip ||
      "unknown"
    const rl = checkRateLimit(`POST:/api/pacientes:${ip}`, 50, 60_000) // 50 req/min/IP
    if (!rl.allowed) {
      return errors.rateLimit()
    }

    const gate = await requireRole(["ADMIN", "RECEP"])
    if (!gate.ok) {
      return errors.forbidden(gate.error)
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined
    if (idempotencyKey) {
      cleanExpiredIdempotencyKeys()
      const cached = idempotencyCache.get(idempotencyKey)
      if (cached) {
        console.log("[v0] Returning cached response for idempotency key:", idempotencyKey)
        const res = ok(cached.data, undefined, 201)
        res.headers.set("Idempotency-Key", idempotencyKey)
        return res
      }
    }

    const body = await request.json()
    const validation = PacienteCreateBodySchema.safeParse(body)
    if (!validation.success) {
      return errors.validation("Datos inválidos", validation.error.flatten().fieldErrors)
    }
    const data = validation.data

    console.log("[v0] Creating patient:", data.nombreCompleto)
    const created = await createPaciente(data, gate.userId || 1)

    // cachea por idempotencyKey
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { data: created, timestamp: Date.now() })
    }

    console.log("[v0] Patient created successfully:", created.idPaciente)
    const res = ok(created, undefined, 201)
    if (idempotencyKey) res.headers.set("Idempotency-Key", idempotencyKey)
    return res
  } catch (error) {
    console.error("[v0] Error creating patient:", error)

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return errors.conflict("Ya existe un paciente con este documento")
    }

    if (process.env.NODE_ENV !== "production") {
      return errors.internal("Error al crear paciente", String(error))
    }
    return errors.internal("Error al crear paciente")
  }
}
