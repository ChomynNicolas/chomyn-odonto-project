// src/lib/audit/log.ts
import { prisma } from "@/lib/prisma"
import { AuditAction, AuditEntity } from "@/lib/audit/actions"
import type { Prisma } from "@prisma/client"

/**
 * Extrae IP, user-agent y referer desde Headers (opcional)
 * Mejora la detección de IP para manejar localhost y diferentes formatos
 * No exportes helpers sync si tu archivo tiene "use server" global.
 */
function extractRequestContext(h?: Headers) {
  try {
    if (!h) return {}
    
    // Extraer IP con múltiples estrategias
    let ip: string | undefined = undefined
    
    // 1. Intentar desde x-forwarded-for (primera IP de la lista si hay proxy)
    const xForwardedFor = h.get("x-forwarded-for")
    if (xForwardedFor) {
      const firstIp = xForwardedFor.split(",")[0]?.trim()
      if (firstIp && firstIp !== "::1" && firstIp !== "127.0.0.1") {
        ip = firstIp
      }
    }
    
    // 2. Intentar desde x-real-ip
    if (!ip) {
      const xRealIp = h.get("x-real-ip")
      if (xRealIp && xRealIp !== "::1" && xRealIp !== "127.0.0.1") {
        ip = xRealIp
      }
    }
    
    // 3. Si aún no hay IP válida, intentar desde cf-connecting-ip (Cloudflare)
    if (!ip) {
      const cfIp = h.get("cf-connecting-ip")
      if (cfIp && cfIp !== "::1" && cfIp !== "127.0.0.1") {
        ip = cfIp
      }
    }
    
    // 4. Si es localhost, guardar como "localhost" en lugar de ::1 o 127.0.0.1
    // Solo si realmente no hay otra IP disponible
    if (!ip) {
      const localhostIp = xForwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip")
      if (localhostIp === "::1" || localhostIp === "127.0.0.1") {
        ip = "localhost"
      }
    }

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

/**
 * Registra auditoría para creación de odontograma
 */
export async function auditOdontogramCreate(args: {
  actorId: number
  snapshotId: number
  pacienteId: number
  consultaId?: number | null
  entriesCount: number
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ODONTOGRAM_CREATE,
    entity: AuditEntity.OdontogramSnapshot,
    entityId: args.snapshotId,
    metadata: {
      pacienteId: args.pacienteId,
      consultaId: args.consultaId ?? null,
      entriesCount: args.entriesCount,
      ...(args.metadata ?? {}),
    },
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Registra auditoría para actualización de odontograma
 */
export async function auditOdontogramUpdate(args: {
  actorId: number
  snapshotId: number
  pacienteId: number
  consultaId?: number | null
  diff: {
    added: number
    removed: number
    modified: number
  }
  diffSummary: string
  headers?: Headers
  path?: string
  metadata?: Record<string, unknown>
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ODONTOGRAM_UPDATE,
    entity: AuditEntity.OdontogramSnapshot,
    entityId: args.snapshotId,
    metadata: {
      pacienteId: args.pacienteId,
      consultaId: args.consultaId ?? null,
      changes: {
        added: args.diff.added,
        removed: args.diff.removed,
        modified: args.diff.modified,
      },
      summary: args.diffSummary,
      ...(args.metadata ?? {}),
    },
    headers: args.headers,
    path: args.path,
  })
}