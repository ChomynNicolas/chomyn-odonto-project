import { type NextRequest, NextResponse } from "next/server"
import { listPacientes, createPaciente } from "./_repo"
import { PacienteCreateDTOSchema } from "@/lib/api/pacientes.types"

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
    // Check idempotency key
    const idempotencyKey = request.headers.get("Idempotency-Key")

    if (idempotencyKey) {
      cleanExpiredIdempotencyKeys()
      const cached = idempotencyCache.get(idempotencyKey)
      if (cached) {
        return NextResponse.json(cached.response, {
          headers: { "Idempotency-Key": idempotencyKey },
        })
      }
    }

    const body = await request.json()
    const validation = PacienteCreateDTOSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          fieldErrors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }

    const data = validation.data

    // Convert date string to Date if provided
    const createData = {
      ...data,
      fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : undefined,
    }

    const result = await createPaciente(createData)

    // Cache response if idempotency key provided
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        response: result,
        timestamp: Date.now(),
      })
    }

    return NextResponse.json(result, {
      status: 201,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    })
  } catch (error) {
    console.error("[API] Error creating paciente:", error)

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: "Error al crear paciente", details: String(error) }, { status: 500 })
    }

    return NextResponse.json({ error: "Error al crear paciente" }, { status: 500 })
  }
}
