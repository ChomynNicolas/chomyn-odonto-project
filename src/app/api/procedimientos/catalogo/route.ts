// src/app/api/procedimientos/catalogo/route.ts
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { ok, errors } from "@/app/api/_http"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/procedimientos/catalogo?activo=true
 * Obtiene el catálogo de procedimientos clínicos
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return errors.forbidden("No autenticado")
    const rol = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"

    // RBAC: ADMIN y ODONT pueden ver el catálogo
    // RECEP también puede leer el catálogo (solo lectura, no puede crear/editar procedimientos)
    if (rol !== "ADMIN" && rol !== "ODONT" && rol !== "RECEP") {
      return errors.forbidden("No autorizado")
    }

    // Leer query param activo
    const { searchParams } = new URL(req.url)
    const activoParam = searchParams.get("activo")
    const activo = activoParam === null || activoParam === "true"

    // Consultar catálogo
    const procedimientos = await prisma.procedimientoCatalogo.findMany({
      where: activo ? { activo: true } : undefined,
      select: {
        idProcedimiento: true,
        code: true,
        nombre: true,
        descripcion: true,
        defaultPriceCents: true,
        aplicaDiente: true,
        aplicaSuperficie: true,
      },
      orderBy: { code: "asc" },
    })

    // Mapear a DTO
    const dto = procedimientos.map((p) => ({
      id: p.idProcedimiento,
      code: p.code,
      nombre: p.nombre,
      descripcion: p.descripcion,
      defaultPriceCents: p.defaultPriceCents,
      aplicaDiente: p.aplicaDiente,
      aplicaSuperficie: p.aplicaSuperficie,
    }))

    return ok(dto)
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[GET /api/procedimientos/catalogo]", e)
    return errors.internal(errorMessage ?? "Error al obtener catálogo de procedimientos")
  }
}

