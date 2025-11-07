// src/app/api/personas/_service.search.ts
import { prisma as db } from "@/lib/prisma"
import { PersonaSearchQuerySchema, type PersonaListItemDTO } from "@/lib/schema/personas"
import { toPersonaListItemDTO } from "./_dto"

export type PersonasSearchResult = { items: PersonaListItemDTO[]; hasMore: boolean }

function isDocQuery(q: string): boolean {
  const raw = q.replace(/\s+/g, "")
  if (/^\d+(?:-?\d+)?$/.test(raw)) return true
  const digits = (raw.match(/\d/g) || []).length
  return digits / Math.max(raw.length, 1) >= 0.7
}

export async function searchPersonas(params: unknown): Promise<PersonasSearchResult> {
  const { q, limit } = PersonaSearchQuerySchema.parse(params)
  const take = Math.min(limit, 50) + 1 // +1 para hasMore

  const docMode = isDocQuery(q)
  let rows: any[] = []

  if (docMode) {
    // Prioriza búsqueda por documento/ruc (matches exactos o startsWith)
    rows = await db.persona.findMany({
  where: {
    // si tu modelo tiene estaActivo en Persona, filtra acá:
    // estaActivo: true,
    OR: [
      { nombres: { contains: q, mode: "insensitive" } },
      { apellidos: { contains: q, mode: "insensitive" } },
      ...(tokens.length >= 2
        ? [{
            AND: [
              { nombres: { contains: tokens[0], mode: "insensitive" } },
              { apellidos: { contains: tokens.slice(1).join(" "), mode: "insensitive" } },
            ],
          }]
        : []),
    ],
  },
  include: {
    documento: { select: { tipo: true, numero: true, ruc: true } },
    contactos: {
      where: { activo: true },
      select: { tipo: true, valorNorm: true, valorRaw: true, activo: true, esPrincipal: true },
    },
  },
  orderBy: [{ nombres: "asc" }, { apellidos: "asc" }, { idPersona: "desc" }],
  take,
})
  } else {
    // Texto: nombres/apellidos (case-insensitive)
    const tokens = q.split(/\s+/).filter(Boolean)
    rows = await db.persona.findMany({
      where: {
        OR: [
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          ...(tokens.length >= 2
            ? [
                {
                  AND: [
                    { nombres: { contains: tokens[0], mode: "insensitive" } },
                    { apellidos: { contains: tokens.slice(1).join(" "), mode: "insensitive" } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: {
        documento: { select: { tipo: true, numero: true, ruc: true } },
        contactos: {
          where: { activo: true },
          select: { tipo: true, valorNorm: true, valorRaw: true, activo: true, esPrincipal: true },
        },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }, { idPersona: "desc" }],
      take,
    })
  }

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  return { items: slice.map(toPersonaListItemDTO), hasMore }
}
