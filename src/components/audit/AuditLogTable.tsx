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
import { Eye, ChevronUp, ChevronDown, FilterX } from "lucide-react"
import type { AuditLogEntry, AuditLogResponse } from "@/lib/types/audit"
import { ACTION_LABELS, ENTITY_LABELS, ACTION_COLORS } from "@/lib/types/audit"
import { format } from "date-fns"

interface AuditLogTableProps {
  data: AuditLogResponse | null
  isLoading: boolean
  onRowClick: (entry: AuditLogEntry) => void
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort?: (field: string) => void
  /** Callback para limpiar filtros desde el empty state */
  onClearFilters?: () => void
}

export function AuditLogTable({
  data,
  isLoading,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  onClearFilters,
}: AuditLogTableProps) {
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss")
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-8 text-center gap-4">
        <p className="text-sm text-muted-foreground">
          No se encontraron registros de auditoría con los filtros aplicados.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <FilterX className="h-4 w-4 mr-2" />
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
              >
                Fecha y Hora
                {sortBy === "createdAt" && (
                  sortOrder === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )
                )}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("actor")}
              >
                Usuario
                {sortBy === "actor" && (
                  sortOrder === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )
                )}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("action")}
              >
                Acción
                {sortBy === "action" && (
                  sortOrder === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )
                )}
              </Button>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => onSort?.("entity")}
              >
                Recurso
                {sortBy === "entity" && (
                  sortOrder === "asc" ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )
                )}
              </Button>
            </TableHead>
            <TableHead className="w-[80px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((entry) => (
            <TableRow
              key={entry.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(entry)}
            >
              <TableCell className="font-mono text-xs">
                {formatDate(entry.createdAt)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{entry.actor.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.actor.role}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getActionColor(entry.action)}>
                  {getActionLabel(entry.action)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary">{getEntityLabel(entry.entity)}</Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      #{entry.entityId}
                    </span>
                  </div>
                  {entry.metadata?.summary && (
                    <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                      {String(entry.metadata.summary)}
                    </span>
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
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

