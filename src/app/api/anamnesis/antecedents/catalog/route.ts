// src/app/api/anamnesis/antecedents/catalog/route.ts
// Returns the antecedent catalog for autocomplete/selection

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma, AntecedentCategory } from "@prisma/client"

/**
 * GET /api/anamnesis/antecedents/catalog
 * 
 * Returns available antecedent catalog items, optionally filtered by category.
 * 
 * Query params:
 * - category: Filter by AntecedentCategory
 * - search: Search by name (case-insensitive)
 * - activeOnly: Only return active items (default: true)
 * 
 * @returns { data: AntecedentCatalogResponse }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const activeOnly = searchParams.get("activeOnly") !== "false"

    // Build where clause
    const where: Prisma.AntecedentCatalogWhereInput = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (category) {
      where.category = category as AntecedentCategory
    }
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      }
    }

    const [items, total] = await Promise.all([
      prisma.antecedentCatalog.findMany({
        where,
        orderBy: [
          { category: "asc" },
          { name: "asc" },
        ],
      }),
      prisma.antecedentCatalog.count({ where }),
    ])

    const response = {
      items: items.map((item) => ({
        idAntecedentCatalog: item.idAntecedentCatalog,
        code: item.code,
        name: item.name,
        category: item.category,
        description: item.description,
        isActive: item.isActive,
      })),
      total,
    }

    return NextResponse.json({ data: response }, { status: 200 })
  } catch (error) {
    console.error("Error fetching antecedent catalog:", error)
    return NextResponse.json(
      { error: "Error al cargar catálogo de antecedentes" },
      { status: 500 }
    )
  }
}

