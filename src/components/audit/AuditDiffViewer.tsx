// src/components/audit/AuditDiffViewer.tsx
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
import type { AuditMetadata } from "@/lib/types/audit"

interface AuditDiffViewerProps {
  metadata: AuditMetadata
}

export function AuditDiffViewer({ metadata }: AuditDiffViewerProps) {
  // Si hay un resumen, mostrarlo primero
  if (metadata.summary) {
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm">{metadata.summary}</p>
      </div>
    )
  }

  // Si hay información de cambios (added, removed, modified)
  if (metadata.changes) {
    const { added = 0, removed = 0, modified = 0 } = metadata.changes

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {added > 0 && (
            <Badge variant="outline" className="text-green-600 dark:text-green-400">
              +{added} agregado(s)
            </Badge>
          )}
          {removed > 0 && (
            <Badge variant="outline" className="text-red-600 dark:text-red-400">
              -{removed} removido(s)
            </Badge>
          )}
          {modified > 0 && (
            <Badge variant="outline" className="text-blue-600 dark:text-blue-400">
              ~{modified} modificado(s)
            </Badge>
          )}
        </div>

        {/* Mostrar diff detallado si está disponible */}
        {metadata.diff && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor Anterior</TableHead>
                  <TableHead>Valor Nuevo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metadata.diff.modified?.map((change, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{change.field}</TableCell>
                    <TableCell>
                      <span className="text-red-600 dark:text-red-400 line-through">
                        {String(change.oldValue ?? "—")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {String(change.newValue ?? "—")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {(!metadata.diff.modified || metadata.diff.modified.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No hay cambios detallados disponibles
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    )
  }

  // Si hay entriesCount (para creaciones)
  if (metadata.entriesCount !== undefined) {
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm">
          Se crearon <strong>{metadata.entriesCount}</strong> entrada(s)
        </p>
      </div>
    )
  }

  // Fallback: mostrar metadata como JSON
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground">
        No hay información de cambios disponible. Ver metadata completa para más detalles.
      </p>
    </div>
  )
}

