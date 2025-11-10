// src/app/api/personas/_service.search.ts
import type { Prisma } from "@prisma/client"
import { prisma as db } from "@/lib/prisma"
import { PersonaSearchQuerySchema, type PersonaListItemDTO } from "@/lib/schema/personas"
import { toPersonaListItemDTO } from "./_dto"

export type PersonasSearchResult = { items: PersonaListItemDTO[]; hasMore: boolean }

/** Heurística: si la query es mayormente numérica, la tratamos como búsqueda por documento/teléfono/RUC */
function isDocQuery(q: string): boolean {
  const raw = q.replace(/\s+/g, "")
  if (/^\d+(?:-?\d+)?$/.test(raw)) return true // solo dígitos (permitiendo algún guion)
  const digits = (raw.match(/\d/g) || []).length
  return digits / Math.max(raw.length, 1) >= 0.7
}

const splitTokens = (s: string) => s.trim().split(/\s+/).filter(Boolean)
const onlyDigits = (s: string) => s.replace(/\D+/g, "")

/** where para nombres/apellidos (+ combinación Nombre + Apellidos si hay >= 2 tokens) */
function buildNameWhere(q: string, tokens: string[]): Prisma.PersonaWhereInput {
  return {
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
  }
}

/** where para documento/RUC/teléfono/email (soporta dígitos-only y crudos) */
function buildDocWhere(q: string, qDigits: string): Prisma.PersonaWhereInput {
  const ors: Prisma.PersonaWhereInput[] = []

  // Documento - número
  ors.push({ documento: { numero: { contains: q, mode: "insensitive" } } })
  if (qDigits) ors.push({ documento: { numero: { contains: qDigits } } })

  // Documento - RUC
  ors.push({ documento: { ruc: { contains: q, mode: "insensitive" } } })
  if (qDigits) ors.push({ documento: { ruc: { contains: qDigits } } })

  // Contactos - teléfono normalizado
  if (qDigits) {
    ors.push({
      contactos: {
        some: {
          tipo: "PHONE",
          valorNorm: { contains: qDigits }, // ej: +595981..., 595981..., 0981...
        },
      },
    })
  }

  // Contactos - email (búsqueda simple por contains)
  ors.push({
    contactos: {
      some: {
        tipo: "EMAIL",
        valorNorm: { contains: q, mode: "insensitive" },
      },
    },
  })

  return { OR: ors }
}

export async function searchPersonas(params: unknown): Promise<PersonasSearchResult> {
  const { q, limit } = PersonaSearchQuerySchema.parse(params)
  const take = Math.min(limit, 50) + 1 // +1 para calcular hasMore sin una segunda query

  const tokens = splitTokens(q)        // <-- ahora definido siempre
  const qDigits = onlyDigits(q)
  const docMode = isDocQuery(q)

  // Nota: si Persona tiene `estaActivo`, puedes añadir { estaActivo: true } al AND.
  const where: Prisma.PersonaWhereInput = docMode
    ? buildDocWhere(q, qDigits)
    : buildNameWhere(q, tokens)

  const rows = await db.persona.findMany({
    where,
    include: {
      documento: { select: { tipo: true, numero: true, ruc: true } },
      contactos: {
        where: { activo: true },
        select: { tipo: true, valorNorm: true, valorRaw: true, activo: true, esPrincipal: true },
      },
    },
    orderBy: [
      // docMode y textMode pueden compartir el orden; si quisieras, pon createdAt desc para priorizar lo reciente
      { nombres: "asc" },
      { apellidos: "asc" },
      { idPersona: "desc" },
    ],
    take,
  })

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  return { items: slice.map(toPersonaListItemDTO), hasMore }
}
