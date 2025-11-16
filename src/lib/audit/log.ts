// src/lib/audit/log.ts
import { prisma } from "@/lib/prisma"
import { AuditAction } from "@/lib/audit/actions"
import type { Prisma } from "@prisma/client"

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
  ip?: string                // <-- NUEVO: permitir override de IP explícita
}) {
  const { actorId, action, entity, entityId, metadata, headers, path, ip } = opts
  const ctx = extractRequestContext(headers)
  const ipFinal = ip ?? ctx.ip

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
      ip: ipFinal,              // <-- guarda IP si viene
      metadata: safeMeta as Prisma.InputJsonValue,
    },
  })
}

export async function safeAuditWrite(opts: Parameters<typeof writeAudit>[0]) {
  try {
    await writeAudit(opts)
  } catch (e) {
    console.error("[audit] write failed:", (e as Error).message)
  }
}

/** Wrapper compatible con executeCitaTransition */
export async function logAudit(opts: {
  actorUserId: number
  entity: string
  entityId: number
  action: string
  payload?: Record<string, unknown>
  ip?: string
  userAgent?: string
  path?: string
}) {
  await safeAuditWrite({
    actorId: opts.actorUserId,
    action: opts.action,
    entity: opts.entity,
    entityId: opts.entityId,
    ip: opts.ip,
    metadata: {
      ...(opts.payload ?? {}),
      userAgent: opts.userAgent,
      path: opts.path,
    },
  })
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
