// src/lib/audit/log.ts
import { prisma } from "@/lib/prisma"
import { AuditAction } from "@/lib/audit/actions"

/**
 * Extrae IP, user-agent y referer desde Headers (opcional)
 * No exportes helpers sync si tu archivo tiene "use server" global.
 */
function extractRequestContext(h?: Headers) {
  try {
    if (!h) return {}
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      undefined

    const userAgent = h.get("user-agent") || undefined
    const referer = h.get("referer") || undefined

    return {
      ip,
      meta: {
        userAgent,
        referer,
      },
    }
  } catch {
    return {}
  }
}

/**
 * Escribe un registro de auditoría.
 * NOTA: No guardes PHI. Sólo metadatos.
 */
export async function writeAudit(opts: {
  actorId: number
  action: string
  entity: string
  entityId: number
  metadata?: Record<string, unknown>
  headers?: Headers
  path?: string
}) {
  const { actorId, action, entity, entityId, metadata, headers, path } = opts

  const ctx = extractRequestContext(headers)

  // Construye metadatos seguros (sin PHI)
  const safeMeta = {
    ...(ctx.meta ?? {}),
    ...(metadata ?? {}),
    path: path ?? undefined,
    timestamp: new Date().toISOString(),
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      ip: ctx.ip,
      metadata: safeMeta as any,
    },
  })
}

/**
 * Wrapper seguro: nunca rompe la UX si falla la auditoría.
 */
export async function safeAuditWrite(opts: Parameters<typeof writeAudit>[0]) {
  try {
    await writeAudit(opts)
  } catch (e) {
    // Log interno del servidor (NO incluir PHI)
    console.error("[audit] write failed:", (e as Error).message)
  }
}

/** Acciones específicas (azúcares) */
export async function auditPatientPrint(args: {
  actorId: number
  entityId: number
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.PATIENT_PRINT,
    entity: "Patient",
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}

export async function auditPatientPdfExport(args: {
  actorId: number
  entityId: number
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.PATIENT_PDF_EXPORT,
    entity: "Patient",
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}
