// src/app/api/adjuntos/cleanup/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { cloudinary } from "@/lib/cloudinary"
import { requireRole } from "@/app/api/pacientes/_rbac"

function jsonError(status: number, code: string, error: string, details?: unknown) {
  return NextResponse.json({ ok: false, code, error, ...(details ? { details } : {}) }, { status })
}

function jsonOk<T>(data: T, status = 200) {
  const res = NextResponse.json({ ok: true, data }, { status })
  res.headers.set("Cache-Control", "no-store")
  return res
}

const Body = z.object({
  publicIds: z.array(z.string().min(1)).min(1),
})

// POST - Delete orphaned files from Cloudinary
export async function POST(req: NextRequest) {
  const gate = await requireRole(["ADMIN", "ODONT", "RECEP"])
  if (!gate.ok) return jsonError(403, "RBAC_FORBIDDEN", "No autorizado")

  try {
    const raw = await req.json()
    const parsed = Body.safeParse(raw)
    if (!parsed.success) {
      return jsonError(400, "VALIDATION_ERROR", "Body inválido", parsed.error.issues)
    }

    const { publicIds } = parsed.data

    // Delete files from Cloudinary
    const results = await Promise.allSettled(
      publicIds.map(async (publicId) => {
        try {
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "auto",
          })
          return {
            publicId,
            success: result.result === "ok",
            result: result.result,
          }
        } catch (error) {
          console.error(`[Cleanup] Error deleting ${publicId}:`, error)
          return {
            publicId,
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
          }
        }
      }),
    )

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length
    const failed = results.length - successful

    return jsonOk({
      total: publicIds.length,
      successful,
      failed,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { publicId: "", success: false, error: "Promise rejected" })),
    })
  } catch (error) {
    console.error("[API] Error in cleanup:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al limpiar archivos"
    return jsonError(500, "CLEANUP_ERROR", errorMessage)
  }
}

