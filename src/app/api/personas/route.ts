// src/app/api/personas/route.ts
import { NextResponse } from "next/server"
import { PersonaSearchQuerySchema } from "@/lib/schema/personas"
import { searchPersonas } from "./_service.search"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q") ?? ""
    const limit = Number(searchParams.get("limit") ?? "10")

    // Validación Zod server-side
    const parsed = PersonaSearchQuerySchema.safeParse({ q, limit })
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 })
    }

    const { items, hasMore } = await searchPersonas(parsed.data)
    return NextResponse.json({ ok: true, data: { items, hasMore } })
  } catch (error) {
    console.error("[API] Error searching personas:", error)
    return NextResponse.json({ ok: false, error: "Error al buscar personas" }, { status: 500 })
  }
}
