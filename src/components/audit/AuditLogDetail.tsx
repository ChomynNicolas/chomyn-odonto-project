// src/components/audit/AuditLogDetail.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import {
  Copy,
  ExternalLink,
  Calendar,
  User,
  Activity,
  FileText,
  Globe,
  Code,
  Info,
  GitCompare,
} from "lucide-react"
import { toast } from "sonner"
import type { AuditLogEntry } from "@/lib/types/audit"
import { ACTION_LABELS, ACTION_COLORS } from "@/lib/types/audit"
import { formatAuditDateFull, formatAuditDateISO } from "@/lib/utils/audit-format"
import { getEntityUrl, getEntityLabel } from "@/lib/utils/audit-entity-urls"
import { AuditDiffViewer } from "./AuditDiffViewer"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuditLogDetailProps {
  entry: AuditLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetail({ entry, open, onOpenChange }: AuditLogDetailProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab("overview")
      // Reset scroll position
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (viewport) {
          viewport.scrollTop = 0
        }
      }
    }
  }, [open])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [open, onOpenChange])

  if (!entry) return null

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

  const entityUrl = getEntityUrl(entry.entity, entry.entityId)
  const entityLabel = getEntityLabel(entry.entity)

  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action
  }

  const getActionColor = (action: string) => {
    const actionType = action.split("_")[1] || action
    return ACTION_COLORS[actionType] || "text-gray-600 dark:text-gray-400"
  }

  const hasChanges = entry.metadata && (
    entry.metadata.summary ||
    entry.metadata.changes ||
    entry.metadata.diff ||
    entry.metadata.entriesCount !== undefined
  )

  const hasContext = entry.metadata && (
    entry.metadata.path ||
    entry.metadata.userAgent ||
    entry.metadata.timestamp
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!max-w-7xl !w-[98vw] !h-[98vh] sm:!h-[96vh]",
          "!flex !flex-col !p-0 !gap-0",
          "!overflow-hidden",
          "[&>div]:!grid-cols-none [&>div]:!grid-rows-none"
        )}
        style={{ 
          maxHeight: '98vh', 
          height: '98vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          gap: 0
        }}
        aria-labelledby="audit-detail-title"
        aria-describedby="audit-detail-description"
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          onOpenChange(false)
        }}
      >
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle id="audit-detail-title" className="text-lg font-semibold">
                Detalle del Evento de Auditoría
              </DialogTitle>
              <DialogDescription id="audit-detail-description" className="mt-1">
                Registro #{entry.id} • {formatAuditDateFull(entry.createdAt)}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(entry, null, 2), "Registro completo")}
              className="shrink-0"
              aria-label="Copiar registro completo al portapapeles"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs Container */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {/* Fixed Tabs Navigation */}
          <div className="border-b shrink-0 bg-card">
            <TabsList className="w-full justify-start rounded-none border-0 h-auto p-0 bg-transparent">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                aria-label="Vista general"
              >
                <Info className="h-4 w-4 mr-2" aria-hidden="true" />
                Vista General
              </TabsTrigger>
              {hasChanges && (
                <TabsTrigger
                  value="changes"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  aria-label="Cambios realizados"
                >
                  <GitCompare className="h-4 w-4 mr-2" aria-hidden="true" />
                  Cambios
                </TabsTrigger>
              )}
              {hasContext && (
                <TabsTrigger
                  value="context"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  aria-label="Información de contexto"
                >
                  <Globe className="h-4 w-4 mr-2" aria-hidden="true" />
                  Contexto
                </TabsTrigger>
              )}
              {entry.metadata && (
                <TabsTrigger
                  value="metadata"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                  aria-label="Metadata completa"
                >
                  <Code className="h-4 w-4 mr-2" aria-hidden="true" />
                  Metadata
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Scrollable Content Area - Overview Tab */}
          <TabsContent value="overview" className="flex-1 min-h-0 mt-0 data-[state=active]:flex !flex flex-col">
            <ScrollArea className="flex-1 h-full min-h-0" ref={scrollAreaRef}>
              <div className="px-6 py-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <h3 className="text-sm font-semibold">Información General</h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Fecha y Hora */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Fecha y Hora
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <time
                              dateTime={entry.createdAt}
                              className="text-sm font-mono text-foreground"
                              title={formatAuditDateISO(entry.createdAt)}
                            >
                              {formatAuditDateFull(entry.createdAt)}
                            </time>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyToClipboard(entry.createdAt, "Fecha")}
                              aria-label="Copiar fecha al portapapeles"
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        {/* Usuario */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Usuario
                            </label>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{entry.actor.nombre}</span>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {entry.actor.role}
                              </Badge>
                            </div>
                            {entry.actor.email && (
                              <p className="text-xs text-muted-foreground truncate" title={entry.actor.email}>
                                {entry.actor.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Acción */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Acción
                            </label>
                          </div>
                          <Badge variant="outline" className={cn("text-sm font-medium", getActionColor(entry.action))}>
                            {getActionLabel(entry.action)}
                          </Badge>
                        </div>

                        {/* Recurso */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Recurso
                            </label>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-sm font-medium">
                              {entityLabel}
                            </Badge>
                            {entityUrl ? (
                              <Link
                                href={entityUrl}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                aria-label={`Ir a ${entityLabel} ${entry.entityId}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="font-mono">#{entry.entityId}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            ) : (
                              <span className="text-xs font-mono text-muted-foreground">#{entry.entityId}</span>
                            )}
                          </div>
                        </div>

                        {/* ID del Recurso */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            ID del Recurso
                          </label>
                          <div className="flex items-center gap-2">
                            {entityUrl ? (
                              <Link
                                href={entityUrl}
                                className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:underline font-medium"
                                aria-label={`Ir a ${entityLabel} ${entry.entityId}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span>{entry.entityId}</span>
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            ) : (
                              <span className="text-sm font-mono">{entry.entityId}</span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => copyToClipboard(String(entry.entityId), "ID")}
                              aria-label="Copiar ID al portapapeles"
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>

                        {/* Dirección IP */}
                        {entry.ip && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Dirección IP
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono">
                                {entry.ip === "::1" || entry.ip === "127.0.0.1" || entry.ip.startsWith("127.")
                                  ? "localhost"
                                  : entry.ip}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => copyToClipboard(entry.ip!, "IP")}
                                aria-label="Copiar IP al portapapeles"
                              >
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                            </div>
                            {(entry.ip === "::1" || entry.ip === "127.0.0.1" || entry.ip === "localhost") && (
                              <p className="text-xs text-muted-foreground italic">
                                Dirección local (desarrollo/pruebas)
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Changes Tab */}
          {hasChanges && (
            <TabsContent value="changes" className="flex-1 min-h-0 mt-0 data-[state=active]:flex !flex flex-col">
              <ScrollArea className="flex-1 h-full min-h-0">
                <div className="px-6 py-6">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <GitCompare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <h3 className="text-sm font-semibold">Cambios Realizados</h3>
                          </div>
                          <div className="w-full">
                            <AuditDiffViewer metadata={entry.metadata!} />
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {/* Context Tab */}
          {hasContext && (
            <TabsContent value="context" className="flex-1 min-h-0 mt-0 data-[state=active]:flex !flex flex-col">
              <ScrollArea className="flex-1 h-full min-h-0">
                <div className="px-6 py-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <h3 className="text-sm font-semibold">Información de Contexto</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {entry.metadata!.path && (
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Ruta
                              </label>
                              <div className="flex items-start gap-2">
                                <code className="flex-1 text-xs font-mono bg-muted/50 px-3 py-2 rounded break-all min-h-[2.5rem]">
                                  {String(entry.metadata!.path)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => copyToClipboard(String(entry.metadata!.path), "Ruta")}
                                  aria-label="Copiar ruta al portapapeles"
                                >
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {entry.metadata!.userAgent && (
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                User Agent
                              </label>
                              <div className="flex items-start gap-2">
                                <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded break-all min-h-[2.5rem]">
                                  {String(entry.metadata!.userAgent)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0"
                                  onClick={() => copyToClipboard(String(entry.metadata!.userAgent), "User Agent")}
                                  aria-label="Copiar user agent al portapapeles"
                                >
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          )}
                          {entry.metadata!.timestamp && (
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Timestamp
                              </label>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-muted/50 px-3 py-2 rounded">
                                  {String(entry.metadata!.timestamp)}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => copyToClipboard(String(entry.metadata!.timestamp), "Timestamp")}
                                  aria-label="Copiar timestamp al portapapeles"
                                >
                                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          )}

          {/* Metadata Tab - Dedicated full space */}
          {entry.metadata && (
            <TabsContent value="metadata" className="flex-1 min-h-0 mt-0 data-[state=active]:flex !flex flex-col">
              <div className="flex flex-col h-full min-h-0 flex-1">
                <div className="px-6 py-4 border-b shrink-0 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">Metadata Completa</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(JSON.stringify(entry.metadata, null, 2), "Metadata")
                      }
                      className="text-xs"
                      aria-label="Copiar metadata JSON al portapapeles"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                      Copiar JSON
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-6">
                    <div className="rounded-md border bg-muted/30 p-4">
                      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words max-w-full overflow-x-auto">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
