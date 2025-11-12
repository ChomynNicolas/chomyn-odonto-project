/**
 * Endpoint para registrar exportaciones en auditoría
 */

import { NextResponse, type NextRequest } from "next/server"
import { requireSessionWithRoles } from "@/app/api/_lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const exportAuditSchema = z.object({
  userId: z.number().int().positive(),
  action: z.string().min(1).max(255),
  resource: z.string().min(1).max(255),
  recordCount: z.number().int().min(0),
  privacyMode: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireSessionWithRoles(req, ["RECEP", "ODONT", "ADMIN"])
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await req.json()
    const parsed = exportAuditSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", details: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, action, resource, recordCount, privacyMode } = parsed.data

    // Registrar en AuditLog
    await prisma.auditLog.create({
      data: {
        userId,
        action: "EXPORT",
        entityType: "KPI_EXPORT",
        entityId: null,
        changes: {
          action,
          resource,
          recordCount,
          privacyMode: privacyMode ?? false,
          timestamp: new Date().toISOString(),
        },
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
        userAgent: req.headers.get("user-agent") || "unknown",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("POST /api/audit/export error:", errorMessage)
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 })
  }
}
