import { type NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { listPacientes, parsePacientesListQuery } from "./_service.list"
import { createPaciente } from "./_service.create"
import { errors, ok, checkRateLimit } from "./_http";
import { requireRole } from "./_rbac";
import { PacienteCreateBodySchema } from "./_schemas";
import { PacienteAlreadyExistsError, isPacienteDomainError } from "./_errors";
import { Prisma } from "@prisma/client";

// In-memory idempotency cache (in production, use Redis)
type PacienteCreated = Awaited<ReturnType<typeof createPaciente>>
type CacheItem = { data: PacienteCreated; timestamp: number }
const idempotencyCache = new Map<string, CacheItem>()
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

    // Map sort format from "createdAt_desc" to "createdAt desc" for compatibility
    const sortParam = searchParams.get("sort") ?? "createdAt_desc"
    const sortMap: Record<string, "createdAt asc" | "createdAt desc" | "nombre asc" | "nombre desc"> = {
      "createdAt_asc": "createdAt asc",
      "createdAt_desc": "createdAt desc",
      "nombre_asc": "nombre asc",
      "nombre_desc": "nombre desc",
    }
    const sort = sortMap[sortParam] ?? "createdAt desc"

    // Map estaActivo to soloActivos for compatibility
    const estaActivo = searchParams.get("estaActivo")
    if (estaActivo === "true" || estaActivo === "false") {
      searchParams.set("soloActivos", estaActivo === "true" ? "true" : "false")
    }

    // Override sort if it was mapped
    if (sortParam !== sort) {
      searchParams.set("sort", sort)
    }

    // Parse and validate query parameters
    // This will throw ZodError if validation fails
    const filters = parsePacientesListQuery(searchParams)

    const result = await listPacientes(filters)

    return NextResponse.json(result)
  } catch (error) {
    // Handle Zod validation errors with proper 400 response
    if (error instanceof ZodError) {
      console.error("[API] Validation error listing pacientes:", error.issues)
      return errors.validation(
        "Parámetros de consulta inválidos",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      )
    }

    // Handle other errors as 500
    console.error("[API] Error listing pacientes:", error)
    return errors.internal("Error al listar pacientes", process.env.NODE_ENV !== "production" ? String(error) : undefined)
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ Rate-limit sencillo por IP y ruta (ajusta valores si querés)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
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

    // Manejo de errores de dominio (duplicados)
    if (error instanceof PacienteAlreadyExistsError) {
      return errors.conflict(
        error.message,
        "PACIENTE_ALREADY_EXISTS",
      )
    }

    // Manejo de errores de dominio genéricos
    if (isPacienteDomainError(error)) {
      return errors.apiError(
        error.statusCode,
        error.code,
        error.message,
        error.details,
      )
    }

    // Manejo de errores de Prisma (unique constraint como fallback)
    // Esto puede ocurrir en casos de race condition (dos requests simultáneos)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint violation
        const target = (error.meta?.target as string[]) || []
        if (target.some((t) => t.includes("numero") || t.includes("documento"))) {
          return errors.conflict(
            "Ya existe un paciente con este documento. Por favor, verifique los datos.",
            "DUPLICATE_DOCUMENT",
          )
        }
      }
    }

    // Manejo genérico de errores de unique constraint (legacy)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return errors.conflict("Ya existe un paciente con este documento")
    }

    // Error interno del servidor
    if (process.env.NODE_ENV !== "production") {
      return errors.internal("Error al crear paciente", String(error))
    }
    return errors.internal("Error al crear paciente")
  }
}
