// src/components/audit/AuditLogDetail.tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import type { AuditLogEntry } from "@/lib/types/audit"
import { ACTION_LABELS, ENTITY_LABELS, ACTION_COLORS } from "@/lib/types/audit"
import { format } from "date-fns"
import { AuditDiffViewer } from "./AuditDiffViewer"

interface AuditLogDetailProps {
  entry: AuditLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetail({ entry, open, onOpenChange }: AuditLogDetailProps) {
  if (!entry) return null

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss")
    } catch {
      return dateString
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action
  }

  const getEntityLabel = (entity: string) => {
    return ENTITY_LABELS[entity] || entity
  }

  const getActionColor = (action: string) => {
    const actionType = action.split("_")[1] || action
    return ACTION_COLORS[actionType] || "text-gray-600 dark:text-gray-400"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalle del Evento de Auditoría</DialogTitle>
          <DialogDescription>
            Información completa del registro de auditoría #{entry.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Información General */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Información General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Fecha y Hora</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono">{formatDate(entry.createdAt)}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(entry.createdAt, "Fecha")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Usuario</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm">{entry.actor.nombre}</p>
                    <Badge variant="secondary" className="text-xs">
                      {entry.actor.role}
                    </Badge>
                  </div>
                  {entry.actor.email && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.actor.email}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Acción</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getActionColor(entry.action)}>
                      {getActionLabel(entry.action)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Recurso</label>
                  <div className="mt-1">
                    <Badge variant="secondary">{getEntityLabel(entry.entity)}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ID del Recurso</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-mono">{entry.entityId}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(String(entry.entityId), "ID")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {entry.ip && (
                  <div>
                    <label className="text-xs text-muted-foreground">Dirección IP</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm font-mono">{entry.ip}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(entry.ip!, "IP")}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Cambios Realizados */}
            {entry.metadata && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Cambios Realizados</h3>
                <AuditDiffViewer metadata={entry.metadata} />
              </div>
            )}

            <Separator />

            {/* Metadata Completa */}
            {entry.metadata && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Metadata Completa</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(entry.metadata, null, 2), "Metadata")
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </Button>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Información de contexto */}
            {entry.metadata && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Información de Contexto</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {entry.metadata.path && (
                      <div>
                        <label className="text-xs text-muted-foreground">Ruta</label>
                        <p className="font-mono text-xs mt-1">{String(entry.metadata.path)}</p>
                      </div>
                    )}
                    {entry.metadata.userAgent && (
                      <div>
                        <label className="text-xs text-muted-foreground">User Agent</label>
                        <p className="text-xs mt-1 break-all">{String(entry.metadata.userAgent)}</p>
                      </div>
                    )}
                    {entry.metadata.timestamp && (
                      <div>
                        <label className="text-xs text-muted-foreground">Timestamp</label>
                        <p className="font-mono text-xs mt-1">{String(entry.metadata.timestamp)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

