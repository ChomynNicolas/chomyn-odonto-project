// src/components/reportes/ExportScopeBadge.tsx
"use client"

/**
 * Export Scope Badge Component
 * Shows what will be exported (full dataset vs current page).
 */

import { Info } from "lucide-react"
import type { ExportScope } from "@/lib/utils/report-export"

interface ExportScopeBadgeProps {
  scope: ExportScope
  recordCount?: number
  totalRecords?: number
  className?: string
}

export function ExportScopeBadge({ scope, recordCount, totalRecords, className }: ExportScopeBadgeProps) {
  const isFullDataset = scope === "fullDataset"
  const label = isFullDataset ? "Todos los registros" : "Página actual"
  const tooltip = isFullDataset
    ? `Se exportarán todos los registros filtrados${totalRecords ? ` (${totalRecords} registros)` : ""}`
    : `Se exportará solo la página actual${recordCount ? ` (${recordCount} registros)` : ""}`

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ${className || ""}`}
      title={tooltip}
    >
      <Info className="h-3 w-3" />
      <span>{label}</span>
      {isFullDataset && totalRecords && (
        <span className="text-blue-600 dark:text-blue-400">({totalRecords})</span>
      )}
      {!isFullDataset && recordCount && (
        <span className="text-blue-600 dark:text-blue-400">({recordCount})</span>
      )}
    </div>
  )
}

