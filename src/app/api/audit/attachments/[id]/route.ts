// src/app/api/audit/attachments/[id]/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { AuditEntity } from "@/lib/audit/actions"

/**
 * Parse attachment ID from format "adjunto-{id}" or "consentimiento-{id}" or just "{id}"
 */
function parseAttachmentId(id: string): { type: "adjunto" | "consentimiento"; numericId: number } | null {
  // Handle format "adjunto-{id}"
  if (id.startsWith("adjunto-")) {
    const numericId = Number.parseInt(id.replace("adjunto-", ""))
    if (!isNaN(numericId)) {
      return { type: "adjunto", numericId }
    }
  }
  
  // Handle format "consentimiento-{id}"
  if (id.startsWith("consentimiento-")) {
    const numericId = Number.parseInt(id.replace("consentimiento-", ""))
    if (!isNaN(numericId)) {
      return { type: "consentimiento", numericId }
    }
  }
  
  // Handle plain numeric ID
  const numericId = Number.parseInt(id)
  if (!isNaN(numericId)) {
    // Assume it's an adjunto by default (backward compatibility)
    return { type: "adjunto", numericId }
  }
  
  return null
}

/**
 * GET /api/audit/attachments/[id]
 * Fetch audit history for a specific attachment
 * 
 * ID format: "adjunto-{id}", "consentimiento-{id}", or just "{id}"
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin role for viewing audit logs
    const userRole = session.user.role as "ADMIN" | "ODONT" | "RECEP"
    if (userRole !== "ADMIN" && userRole !== "ODONT") {
      return NextResponse.json({ error: "Forbidden - insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const parsed = parseAttachmentId(id)

    if (!parsed) {
      return NextResponse.json({ error: "Invalid attachment ID format" }, { status: 400 })
    }

    // Determine the entity type for the audit query
    const entity = parsed.type === "adjunto" 
      ? AuditEntity.Adjunto 
      : AuditEntity.Consentimiento

    // Parse query parameters for pagination
    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // Fetch audit logs for this attachment
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entity,
          entityId: parsed.numericId,
        },
        include: {
          actor: {
            select: {
              idUsuario: true,
              nombreApellido: true,
              rol: {
                select: {
                  nombreRol: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({
        where: {
          entity,
          entityId: parsed.numericId,
        },
      }),
    ])

    // Map audit logs to a clean response format
    const mappedLogs = auditLogs.map((log) => ({
      id: log.idAuditLog,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      performedAt: log.createdAt.toISOString(),
      ip: log.ip,
      metadata: log.metadata,
      actor: {
        id: log.actor.idUsuario,
        name: log.actor.nombreApellido,
        role: log.actor.rol.nombreRol,
      },
    }))

    return NextResponse.json({
      ok: true,
      data: {
        logs: mappedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        attachmentId: id,
        attachmentType: parsed.type,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching attachment audit logs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

