// src/app/api/anamnesis/allergies/catalog/route.ts
// Allergy catalog endpoint for anamnesis form

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/anamnesis/allergies/catalog
 * 
 * Returns paginated list of allergy catalog items for autocomplete/search.
 * 
 * Query params:
 * - search: Search term (optional)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * @returns { data: AllergyCatalogItem[], total: number, limit: number, offset: number }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.allergyCatalog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: "asc" },
      }),
      prisma.allergyCatalog.count({ where }),
    ])

    return NextResponse.json({
      data: items.map((item) => ({
        idAllergyCatalog: item.idAllergyCatalog,
        name: item.name,
        description: item.description,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching allergy catalog:", error)
    return NextResponse.json(
      { error: "Error al cargar catálogo de alergias" },
      { status: 500 }
    )
  }
}

