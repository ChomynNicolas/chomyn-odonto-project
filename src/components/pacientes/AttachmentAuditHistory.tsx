"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Upload,
  Trash2,
  Eye,
  Download,
  User,
  Clock,
  Globe,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
} from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"

interface AuditLogEntry {
  id: number
  action: string
  entity: string
  entityId: number
  performedAt: string
  ip: string | null
  metadata: Record<string, unknown> | null
  actor: {
    id: number
    name: string
    role: string
  }
}

interface AuditHistoryResponse {
  ok: boolean
  data: {
    logs: AuditLogEntry[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
    attachmentId: string
    attachmentType: "adjunto" | "consentimiento"
  }
}

interface AttachmentAuditHistoryProps {
  attachmentId: string
  open: boolean
  onClose: () => void
}

// Action to icon mapping
const actionIcons: Record<string, typeof Upload> = {
  ADJUNTO_CREATE: Upload,
  ADJUNTO_DELETE: Trash2,
  ADJUNTO_VIEW: Eye,
  ADJUNTO_DOWNLOAD: Download,
  CONSENTIMIENTO_CREATE: Upload,
  CONSENTIMIENTO_REVOKE: Trash2,
  CONSENTIMIENTO_UPDATE: RefreshCw,
  CONSENTIMIENTO_VIEW: Eye,
  CONSENTIMIENTO_DOWNLOAD: Download,
}

// Action to label mapping (Spanish)
const actionLabels: Record<string, string> = {
  ADJUNTO_CREATE: "Creación",
  ADJUNTO_DELETE: "Eliminación",
  ADJUNTO_VIEW: "Visualización",
  ADJUNTO_DOWNLOAD: "Descarga",
  CONSENTIMIENTO_CREATE: "Creación",
  CONSENTIMIENTO_REVOKE: "Revocación",
  CONSENTIMIENTO_UPDATE: "Actualización",
  CONSENTIMIENTO_VIEW: "Visualización",
  CONSENTIMIENTO_DOWNLOAD: "Descarga",
}

// Action to badge variant mapping
const actionVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ADJUNTO_CREATE: "default",
  ADJUNTO_DELETE: "destructive",
  ADJUNTO_VIEW: "secondary",
  ADJUNTO_DOWNLOAD: "outline",
  CONSENTIMIENTO_CREATE: "default",
  CONSENTIMIENTO_REVOKE: "destructive",
  CONSENTIMIENTO_UPDATE: "secondary",
  CONSENTIMIENTO_VIEW: "secondary",
  CONSENTIMIENTO_DOWNLOAD: "outline",
}

// Role to Spanish label mapping
const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  ODONT: "Odontólogo",
  RECEP: "Recepcionista",
}

async function fetchAuditHistory(attachmentId: string): Promise<AuditHistoryResponse> {
  const response = await fetch(`/api/audit/attachments/${attachmentId}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Error al obtener historial" }))
    throw new Error(error.error || "Error al obtener historial de auditoría")
  }

  return response.json()
}

export function AttachmentAuditHistory({
  attachmentId,
  open,
  onClose,
}: AttachmentAuditHistoryProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["attachment-audit", attachmentId],
    queryFn: () => fetchAuditHistory(attachmentId),
    enabled: open, // Only fetch when drawer is open
    staleTime: 30 * 1000, // 30 seconds
  })

  const logs = data?.data?.logs || []

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Auditoría
          </SheetTitle>
          <SheetDescription>
            Registro de todas las acciones realizadas sobre este archivo
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mb-4" />
              <p className="text-sm text-destructive mb-4">
                {error instanceof Error ? error.message : "Error al cargar historial"}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mb-4 opacity-50" />
              <p className="text-sm">No hay registros de auditoría</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {logs.map((log, index) => {
                  const ActionIcon = actionIcons[log.action] || FileText
                  const actionLabel = actionLabels[log.action] || log.action
                  const actionVariant = actionVariants[log.action] || "secondary"

                  return (
                    <div key={log.id}>
                      <div className="flex gap-3">
                        {/* Icon column */}
                        <div className="flex-shrink-0">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center
                            ${log.action.includes("DELETE") || log.action.includes("REVOKE") 
                              ? "bg-destructive/10 text-destructive" 
                              : log.action.includes("CREATE") 
                                ? "bg-green-500/10 text-green-600"
                                : "bg-muted text-muted-foreground"
                            }
                          `}>
                            <ActionIcon className="h-4 w-4" />
                          </div>
                        </div>

                        {/* Content column */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={actionVariant} className="text-xs">
                              {actionLabel}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(log.performedAt, true)}
                            </span>
                          </div>

                          {/* Actor info */}
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{log.actor.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {roleLabels[log.actor.role] || log.actor.role}
                            </Badge>
                          </div>

                          {/* IP address if available */}
                          {log.ip && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              <span>{log.ip}</span>
                            </div>
                          )}

                          {/* Metadata details if available */}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="text-xs text-muted-foreground mt-2">
                              <summary className="cursor-pointer hover:text-foreground">
                                Ver detalles
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>

                      {/* Separator between items */}
                      {index < logs.length - 1 && (
                        <Separator className="mt-4" />
                      )}
                    </div>
                  )
                })}

                {/* Pagination info */}
                {data?.data?.pagination && data.data.pagination.total > data.data.pagination.limit && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    Mostrando {logs.length} de {data.data.pagination.total} registros
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

