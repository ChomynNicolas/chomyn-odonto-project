// src/components/audit/AuditDiffViewer.tsx
"use client"

import React from "react"
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
import { cn } from "@/lib/utils"

interface AuditDiffViewerProps {
  metadata: AuditMetadata
}

type ModifiedChange = {
  field: string
  oldValue: unknown
  newValue: unknown
  fieldLabel?: string
  isCritical?: boolean
}

type OdontogramEntry = {
  toothNumber: number
  surface: string | null
  condition: string
  notes: string | null
}

type OdontogramModifiedEntry = {
  toothNumber: number
  surface: string | null
  oldCondition: string
  newCondition: string
  oldNotes: string | null
  newNotes: string | null
}

type DiffDetails = {
  added?: OdontogramEntry[]
  removed?: OdontogramEntry[]
  modified?: OdontogramModifiedEntry[]
}

// Para el diff "normal" de campos
type FieldDiff = {
  modified?: ModifiedChange[]
}

const isDiffDetails = (value: unknown): value is DiffDetails => {
  if (typeof value !== "object" || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    (Array.isArray(obj.added) || obj.added === undefined) &&
    (Array.isArray(obj.removed) || obj.removed === undefined) &&
    (Array.isArray(obj.modified) || obj.modified === undefined)
  )
}

export function AuditDiffViewer({ metadata }: AuditDiffViewerProps): React.ReactElement {
  const getNumber = (value: unknown): number => {
    if (typeof value === "number") return value
    if (typeof value === "string") {
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const getBoolean = (value: unknown): boolean => {
    if (typeof value === "boolean") return value
    if (typeof value === "string") return value.toLowerCase() === "true"
    if (typeof value === "number") return value !== 0
    return false
  }

  // --------- Normalizar contadores ----------
  const entriesAdded: number = getNumber(metadata.entriesAdded)
  const entriesRemoved: number = getNumber(metadata.entriesRemoved)
  const entriesModified: number = getNumber(metadata.entriesModified)
  const hasEntriesInfo: boolean = entriesAdded > 0 || entriesRemoved > 0 || entriesModified > 0

  // --------- Normalizar changes ----------
  let added: number = entriesAdded
  let removed: number = entriesRemoved
  let modified: number = entriesModified

  const changes = metadata.changes as Record<string, unknown> | undefined
  if (changes && typeof changes === "object") {
    const rawAdded = changes["added"]
    const rawRemoved = changes["removed"]
    const rawModified = changes["modified"]

    if (typeof rawAdded === "number") added = rawAdded
    if (typeof rawRemoved === "number") removed = rawRemoved
    if (typeof rawModified === "number") modified = rawModified
  }

  const hasAnyChanges: boolean = added > 0 || removed > 0 || modified > 0 || hasEntriesInfo

  // --------- Normalizar diff de campos ----------
  const diff = (metadata.diff ?? {}) as FieldDiff
  const modifiedFields: ModifiedChange[] = Array.isArray(diff.modified) ? diff.modified : []
  const hasFieldDiff = modifiedFields.length > 0

  // ⭐ CAMBIO: booleano derivado de diffDetails para no usar unknown en JSX
  const hasDiffDetails: boolean = Boolean(metadata.diffDetails)

  // --------- Caso simple: solo summary ----------
  if (metadata.summary && !hasEntriesInfo && !hasFieldDiff && !hasDiffDetails) {
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm leading-relaxed">{String(metadata.summary)}</p>
      </div>
    )
  }

  // --------- Vista completa ----------
  // ⭐ CAMBIO: usar hasDiffDetails (boolean) en vez de metadata.diffDetails (unknown)
  if (hasAnyChanges || hasEntriesInfo || hasFieldDiff || hasDiffDetails) {
    const hasSummary: boolean = metadata.summary !== undefined && metadata.summary !== null
    const summaryText: string = hasSummary ? String(metadata.summary) : ""

    return (
      <div className="space-y-4">
        {/* Resumen si existe */}
        {hasSummary && (
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm font-medium leading-relaxed">{summaryText}</p>
          </div>
        )}

        {/* Summary badges */}
        {hasAnyChanges && (
          <div className="flex flex-wrap items-center gap-2">
            {added > 0 && (
              <Badge
                variant="outline"
                className="text-green-600 dark:text-green-400 border-green-600/20"
              >
                +{added} agregado{added !== 1 ? "s" : ""}
              </Badge>
            )}
            {removed > 0 && (
              <Badge
                variant="outline"
                className="text-red-600 dark:text-red-400 border-red-600/20"
              >
                -{removed} removido{removed !== 1 ? "s" : ""}
              </Badge>
            )}
            {modified > 0 && (
              <Badge
                variant="outline"
                className="text-blue-600 dark:text-blue-400 border-blue-600/20"
              >
                ~{modified} modificado{modified !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}

        {/* Información detallada del diff (odontograma) */}
        {(() => {
          if (!metadata.diffDetails || !isDiffDetails(metadata.diffDetails)) return null

          const diffDetails = metadata.diffDetails

          return (
            <div className="space-y-4">
              {/* Entradas Agregadas */}
              {diffDetails.added &&
                diffDetails.added.length > 0 && (
                  <div className="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-4">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3">
                      Entradas Agregadas ({diffDetails.added.length})
                    </h4>
                    <div className="space-y-2">
                      {diffDetails.added.map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-sm bg-white dark:bg-gray-900 p-2 rounded border"
                        >
                          <div className="font-medium">Diente #{entry.toothNumber}</div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {entry.surface && <div>Superficie: {entry.surface}</div>}
                            <div>Condición: {entry.condition}</div>
                            {entry.notes && <div className="italic">Notas: {entry.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Entradas Removidas */}
              {diffDetails.removed &&
                diffDetails.removed.length > 0 && (
                  <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3">
                      Entradas Removidas ({diffDetails.removed.length})
                    </h4>
                    <div className="space-y-2">
                      {diffDetails.removed.map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-sm bg-white dark:bg-gray-900 p-2 rounded border"
                        >
                          <div className="font-medium line-through">Diente #{entry.toothNumber}</div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {entry.surface && <div>Superficie: {entry.surface}</div>}
                            <div>Condición: {entry.condition}</div>
                            {entry.notes && <div className="italic">Notas: {entry.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Entradas Modificadas */}
              {diffDetails.modified &&
                diffDetails.modified.length > 0 && (
                  <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
                      Entradas Modificadas ({diffDetails.modified.length})
                    </h4>
                    <div className="space-y-2">
                      {diffDetails.modified.map((entry, idx) => (
                        <div
                          key={idx}
                          className="text-sm bg-white dark:bg-gray-900 p-2 rounded border"
                        >
                          <div className="font-medium">Diente #{entry.toothNumber}</div>
                          <div className="text-xs text-muted-foreground space-y-1 mt-1">
                            {entry.surface && <div>Superficie: {entry.surface}</div>}
                            <div className="flex items-center gap-2">
                              <span className="text-red-600 dark:text-red-400 line-through">
                                {entry.oldCondition}
                              </span>
                              <span>→</span>
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {entry.newCondition}
                              </span>
                            </div>
                            {(entry.oldNotes || entry.newNotes) && (
                              <div className="space-y-0.5">
                                {entry.oldNotes && (
                                  <div className="text-red-600 dark:text-red-400 line-through">
                                    Notas anteriores: {entry.oldNotes}
                                  </div>
                                )}
                                {entry.newNotes && (
                                  <div className="text-green-600 dark:text-green-400 font-medium">
                                    Notas nuevas: {entry.newNotes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )
        })()}

        {/* Resumen de entradas solo por conteo */}
        {hasEntriesInfo &&
          !hasDiffDetails && // ⭐ CAMBIO: usar hasDiffDetails (boolean)
          (entriesAdded > 0 || entriesRemoved > 0 || entriesModified > 0) && ( // ⭐ CAMBIO: nada de entriesX unknown
            <div className="rounded-md border bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground mb-2">Resumen de Cambios</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {entriesAdded > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-green-700 dark:text-green-400">
                      Entradas Agregadas
                    </div>
                    <div className="text-muted-foreground">
                      {entriesAdded} entrada{entriesAdded !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                {entriesRemoved > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-red-700 dark:text-red-400">
                      Entradas Removidas
                    </div>
                    <div className="text-muted-foreground">
                      {entriesRemoved} entrada{entriesRemoved !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
                {entriesModified > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-blue-700 dark:text-blue-400">
                      Entradas Modificadas
                    </div>
                    <div className="text-muted-foreground">
                      {entriesModified} entrada{entriesModified !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </div>
              {(metadata.previousSnapshotId !== undefined ||
                getBoolean(metadata.patientLevelUpdate)) && (
                <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                  {metadata.previousSnapshotId !== undefined && (
                    <div>Snapshot anterior: #{getNumber(metadata.previousSnapshotId)}</div>
                  )}
                  {getBoolean(metadata.patientLevelUpdate) && (
                    <div>Actualización a nivel de paciente</div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Tabla de diff de campos */}
        {hasFieldDiff && (
          <div className="rounded-md border overflow-hidden w-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50 z-10">
                  <TableRow>
                    <TableHead className="w-[200px] min-w-[150px] max-w-[250px]">Campo</TableHead>
                    <TableHead className="min-w-[200px]">Valor Anterior</TableHead>
                    <TableHead className="min-w-[200px]">Valor Nuevo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modifiedFields.map((change, idx) => {
                    const fieldLabel = change.fieldLabel || change.field
                    const isCritical = change.isCritical || false

                    const formatValue = (value: unknown): string => {
                      if (value === null || value === undefined) return "—"
                      if (typeof value === "object") {
                        try {
                          return JSON.stringify(value, null, 2)
                        } catch {
                          return String(value)
                        }
                      }
                      return String(value)
                    }

                    const oldValueStr = formatValue(change.oldValue)
                    const newValueStr = formatValue(change.newValue)

                    return (
                      <TableRow key={idx} className={cn(isCritical && "bg-destructive/5")}>
                        <TableCell className="font-medium align-top">
                          <div className="flex items-center gap-2">
                            <span className="break-words">{fieldLabel}</span>
                            {isCritical && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                Crítico
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="max-w-full">
                            <pre className="text-xs font-mono text-red-600 dark:text-red-400 line-through whitespace-pre-wrap break-words overflow-x-auto">
                              {oldValueStr}
                            </pre>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="max-w-full">
                            <pre className="text-xs font-mono text-green-600 dark:text-green-400 font-medium whitespace-pre-wrap break-words overflow-x-auto">
                              {newValueStr}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Fallback sin diffs detallados */}
        {!hasFieldDiff && !hasEntriesInfo && (
          <div className="rounded-md border bg-muted/30 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No hay cambios detallados disponibles. Los cambios se registraron como conteos
              generales.
            </p>
            {metadata.summary && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Resumen: {String(metadata.summary)}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // --------- Caso: solo entriesCount (creación) ----------
  if (metadata.entriesCount !== undefined) {
    const entriesCount = getNumber(metadata.entriesCount)
    return (
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm leading-relaxed">
          Se crearon <strong>{entriesCount}</strong> entrada
          {entriesCount !== 1 ? "s" : ""}
        </p>
      </div>
    )
  }

  // --------- Fallback ----------
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        No hay información de cambios disponible. Ver metadata completa para más detalles.
      </p>
    </div>
  )
}
