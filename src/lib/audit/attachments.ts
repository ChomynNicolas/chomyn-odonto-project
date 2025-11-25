// src/lib/audit/attachments.ts
import { safeAuditWrite } from "./log"
import { AuditAction, AuditEntity } from "./actions"
import type { AdjuntoTipo, AccessMode } from "@prisma/client"

/**
 * Audit metadata for attachment creation
 */
export interface AttachmentCreateAuditMetadata {
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: AdjuntoTipo
  format?: string | null
  bytes: number
  originalFilename?: string | null
  publicId: string
  accessMode: AccessMode
  descripcion?: string | null
  source: "patient" | "consultation" | "procedure" | "general"
  path?: string
}

/**
 * Audit metadata for attachment deletion
 */
export interface AttachmentDeleteAuditMetadata {
  pacienteId: number
  consultaId?: number | null
  procedimientoId?: number | null
  tipo: AdjuntoTipo
  format?: string | null
  bytes: number
  originalFilename?: string | null
  publicId: string
  deletedAt: string
  source: "patient" | "consultation" | "procedure" | "general"
  path?: string
}

/**
 * Logs audit entry for attachment creation
 */
export async function auditAttachmentCreate(args: {
  actorId: number
  entityId: number
  metadata: AttachmentCreateAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ADJUNTO_CREATE,
    entity: AuditEntity.Adjunto,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for attachment deletion
 */
export async function auditAttachmentDelete(args: {
  actorId: number
  entityId: number
  metadata: AttachmentDeleteAuditMetadata
  headers?: Headers
  path?: string
}) {
  await safeAuditWrite({
    actorId: args.actorId,
    action: AuditAction.ADJUNTO_DELETE,
    entity: AuditEntity.Adjunto,
    entityId: args.entityId,
    metadata: args.metadata,
    headers: args.headers,
    path: args.path,
  })
}

