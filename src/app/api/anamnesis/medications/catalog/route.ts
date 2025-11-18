// src/app/api/anamnesis/medications/catalog/route.ts
// Medication catalog endpoint for anamnesis form

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/anamnesis/medications/catalog
 * 
 * Returns paginated list of medication catalog items for autocomplete/search.
 * 
 * Query params:
 * - search: Search term (optional)
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 * 
 * @returns { data: MedicationCatalogItem[], total: number, limit: number, offset: number }
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
      prisma.medicationCatalog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { name: "asc" },
      }),
      prisma.medicationCatalog.count({ where }),
    ])

    return NextResponse.json({
      data: items.map((item) => ({
        idMedicationCatalog: item.idMedicationCatalog,
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
    console.error("Error fetching medication catalog:", error)
    return NextResponse.json(
      { error: "Error al cargar catálogo de medicaciones" },
      { status: 500 }
    )
  }
}

