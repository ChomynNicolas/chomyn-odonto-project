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
    metadata: args.metadata as unknown as Record<string, unknown>,
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
    metadata: args.metadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Audit metadata for attachment view/download
 */
export interface AttachmentViewAuditMetadata {
  pacienteId?: number | null
  publicId: string
  originalFilename?: string | null
  format?: string | null
  resourceType?: string | null
  accessMode?: string | null
  hasTransformations?: boolean
  transformations?: string
  path?: string
}

/**
 * Logs audit entry for attachment view (preview/image proxy)
 */
export async function auditAttachmentView(args: {
  actorId: number
  entityId: number
  entityType: "adjunto" | "consentimiento"
  metadata: AttachmentViewAuditMetadata
  headers?: Headers
  path?: string
}) {
  const action = args.entityType === "adjunto" 
    ? AuditAction.ADJUNTO_VIEW 
    : AuditAction.CONSENTIMIENTO_VIEW
  const entity = args.entityType === "adjunto" 
    ? AuditEntity.Adjunto 
    : AuditEntity.Consentimiento

  await safeAuditWrite({
    actorId: args.actorId,
    action,
    entity,
    entityId: args.entityId,
    metadata: args.metadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

/**
 * Logs audit entry for attachment download
 */
export async function auditAttachmentDownload(args: {
  actorId: number
  entityId: number
  entityType: "adjunto" | "consentimiento"
  metadata: AttachmentViewAuditMetadata
  headers?: Headers
  path?: string
}) {
  const action = args.entityType === "adjunto" 
    ? AuditAction.ADJUNTO_DOWNLOAD 
    : AuditAction.CONSENTIMIENTO_DOWNLOAD
  const entity = args.entityType === "adjunto" 
    ? AuditEntity.Adjunto 
    : AuditEntity.Consentimiento

  await safeAuditWrite({
    actorId: args.actorId,
    action,
    entity,
    entityId: args.entityId,
    metadata: args.metadata as unknown as Record<string, unknown>,
    headers: args.headers,
    path: args.path,
  })
}

