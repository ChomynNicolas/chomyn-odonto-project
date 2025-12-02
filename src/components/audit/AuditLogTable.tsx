// src/components/audit/AuditLogTable.tsx
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Eye, ChevronUp, ChevronDown, FilterX, ExternalLink, Filter } from "lucide-react"
import type { AuditLogEntry, AuditLogResponse, AuditLogFilters } from "@/lib/types/audit"
import { ACTION_LABELS, ACTION_COLORS } from "@/lib/types/audit"
import { formatAuditDateCompact } from "@/lib/utils/audit-format"
import { getEntityUrl, getEntityLabel } from "@/lib/utils/audit-entity-urls"
import Link from "next/link"

interface AuditLogTableProps {
  data: AuditLogResponse | null
  isLoading: boolean
  onRowClick: (entry: AuditLogEntry) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (field: string) => void
  /** Callback para limpiar filtros desde el empty state */
  onClearFilters?: () => void
  /** Callback para aplicar filtros rápidos desde la tabla */
  onQuickFilter?: (filters: Partial<AuditLogFilters>) => void
}

export function AuditLogTable({
  data,
  isLoading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  onClearFilters,
  onQuickFilter,
}: AuditLogTableProps) {
  const getActionLabel = (action: string) => {
    return ACTION_LABELS[action] || action
  }

  const getActionColor = (action: string) => {
    const actionType = action.split("_")[1] || action
    return ACTION_COLORS[actionType] || "text-gray-600 dark:text-gray-400"
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return null
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" aria-hidden="true" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
    )
  }

  const handleRowKeyDown = (e: React.KeyboardEvent, entry: AuditLogEntry) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onRowClick(entry)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando registros de auditoría">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
        <span className="sr-only">Cargando registros de auditoría...</span>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center gap-4"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">
          No se encontraron registros de auditoría con los filtros aplicados.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters} aria-label="Limpiar filtros">
            <FilterX className="h-4 w-4 mr-2" aria-hidden="true" />
            Limpiar filtros
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("createdAt")}
                aria-label={`Ordenar por fecha ${sortBy === "createdAt" ? (sortOrder === "asc" ? "ascendente" : "descendente") : ""}`}
                aria-sort={sortBy === "createdAt" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
              >
                Fecha y Hora
                {getSortIcon("createdAt")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("actor")}
                aria-label={`Ordenar por usuario ${sortBy === "actor" ? (sortOrder === "asc" ? "ascendente" : "descendente") : ""}`}
                aria-sort={sortBy === "actor" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
              >
                Usuario
                {getSortIcon("actor")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("action")}
                aria-label={`Ordenar por acción ${sortBy === "action" ? (sortOrder === "asc" ? "ascendente" : "descendente") : ""}`}
                aria-sort={sortBy === "action" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
              >
                Acción
                {getSortIcon("action")}
              </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("entity")}
                aria-label={`Ordenar por recurso ${sortBy === "entity" ? (sortOrder === "asc" ? "ascendente" : "descendente") : ""}`}
                aria-sort={sortBy === "entity" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
              >
                Recurso
                {getSortIcon("entity")}
              </Button>
            </TableHead>
            <TableHead className="w-[80px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((entry) => {
            const entityUrl = getEntityUrl(entry.entity, entry.entityId)
            const entityLabel = getEntityLabel(entry.entity)
            
            return (
              <TableRow
                key={entry.id}
                className="cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50"
                onClick={() => onRowClick(entry)}
                onKeyDown={(e) => handleRowKeyDown(e, entry)}
                tabIndex={0}
                role="button"
                aria-label={`Ver detalles del evento de auditoría ${entry.id}`}
              >
                <TableCell className="font-mono text-xs">
                  <time dateTime={entry.createdAt} title={entry.createdAt}>
                    {formatAuditDateCompact(entry.createdAt)}
                  </time>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium">{entry.actor.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.actor.role}
                      </span>
                    </div>
                    {onQuickFilter && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onQuickFilter({ actorId: entry.actor.id })
                              }}
                              aria-label={`Filtrar por usuario ${entry.actor.nombre}`}
                            >
                              <Filter className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filtrar por este usuario</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getActionColor(entry.action)}>
                      {getActionLabel(entry.action)}
                    </Badge>
                    {onQuickFilter && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onQuickFilter({ action: entry.action })
                              }}
                              aria-label={`Filtrar por acción ${getActionLabel(entry.action)}`}
                            >
                              <Filter className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filtrar por esta acción</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary">{entityLabel}</Badge>
                      {entityUrl ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={entityUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                aria-label={`Ir a ${entityLabel} ${entry.entityId}`}
                              >
                                <span className="font-mono">#{entry.entityId}</span>
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver {entityLabel.toLowerCase()} #{entry.entityId}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          #{entry.entityId}
                        </span>
                      )}
                      {onQuickFilter && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onQuickFilter({ entity: entry.entity })
                                  }}
                                  aria-label={`Filtrar por entidad ${entityLabel}`}
                                >
                                  <Filter className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Filtrar por esta entidad</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onQuickFilter({ entityId: entry.entityId })
                                  }}
                                  aria-label={`Filtrar por ID ${entry.entityId}`}
                                >
                                  <Filter className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Filtrar por este ID</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
                    {entry.metadata?.summary && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground truncate max-w-[250px] block">
                              {String(entry.metadata.summary)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{String(entry.metadata.summary)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRowClick(entry)
                    }}
                    aria-label={`Ver detalles del evento ${entry.id}`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
