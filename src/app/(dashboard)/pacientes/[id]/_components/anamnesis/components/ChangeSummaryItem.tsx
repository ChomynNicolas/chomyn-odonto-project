// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/ChangeSummaryItem.tsx
// Component for displaying a single field change with old vs new value diff

"use client"

import { Badge } from "@/components/ui/badge"
import { ArrowRight, Plus, Minus, Edit2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChangeSeverity = "critical" | "medium" | "low"
export type ChangeType = "added" | "removed" | "modified"

export interface FieldChange {
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  changeType: ChangeType
  severity: ChangeSeverity
  section: string
}

interface ChangeSummaryItemProps {
  change: FieldChange
  compact?: boolean
}

const SEVERITY_STYLES: Record<ChangeSeverity, { badge: string; border: string; bg: string }> = {
  critical: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    border: "border-red-200 dark:border-red-800",
    bg: "bg-red-50/50 dark:bg-red-950/20",
  },
  medium: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  low: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
  },
}

const CHANGE_TYPE_ICONS: Record<ChangeType, { icon: typeof Plus; label: string }> = {
  added: { icon: Plus, label: "Agregado" },
  removed: { icon: Minus, label: "Eliminado" },
  modified: { icon: Edit2, label: "Modificado" },
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return value || "—"
  if (Array.isArray(value)) {
    if (value.length === 0) return "Ninguno"
    return `${value.length} elemento${value.length > 1 ? "s" : ""}`
  }
  if (typeof value === "object") {
    // Handle objects with label property
    if ("label" in value && value.label) return String(value.label)
    if ("name" in value && value.name) return String(value.name)
    return JSON.stringify(value)
  }
  return String(value)
}

function getSeverityLabel(severity: ChangeSeverity): string {
  switch (severity) {
    case "critical":
      return "Crítico"
    case "medium":
      return "Medio"
    case "low":
      return "Bajo"
    default:
      return "Desconocido"
  }
}

export function ChangeSummaryItem({ change, compact = false }: ChangeSummaryItemProps) {
  const styles = SEVERITY_STYLES[change.severity]
  const { icon: ChangeIcon, label: changeLabel } = CHANGE_TYPE_ICONS[change.changeType]

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between py-2 px-3 rounded-lg border",
          styles.border,
          styles.bg
        )}
      >
        <div className="flex items-center gap-2">
          <ChangeIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{change.fieldLabel}</span>
        </div>
        <Badge variant="secondary" className={cn("text-xs", styles.badge)}>
          {getSeverityLabel(change.severity)}
        </Badge>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        styles.border,
        styles.bg
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChangeIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{change.fieldLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {changeLabel}
          </Badge>
          <Badge variant="secondary" className={cn("text-xs", styles.badge)}>
            {getSeverityLabel(change.severity)}
          </Badge>
        </div>
      </div>

      {/* Value Comparison */}
      <div className="flex items-center gap-3 text-sm">
        {/* Old Value */}
        <div
          className={cn(
            "flex-1 p-2 rounded-md",
            change.changeType === "added"
              ? "bg-muted/30 text-muted-foreground"
              : "bg-red-100/50 dark:bg-red-900/30"
          )}
        >
          <span className="text-xs text-muted-foreground block mb-1">Valor anterior</span>
          <span
            className={cn(
              "block",
              change.changeType === "removed" && "line-through text-red-600 dark:text-red-400"
            )}
          >
            {formatValue(change.oldValue)}
          </span>
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* New Value */}
        <div
          className={cn(
            "flex-1 p-2 rounded-md",
            change.changeType === "removed"
              ? "bg-muted/30 text-muted-foreground"
              : "bg-green-100/50 dark:bg-green-900/30"
          )}
        >
          <span className="text-xs text-muted-foreground block mb-1">Valor nuevo</span>
          <span
            className={cn(
              "block font-medium",
              change.changeType === "added" && "text-green-600 dark:text-green-400"
            )}
          >
            {formatValue(change.newValue)}
          </span>
        </div>
      </div>

      {/* Section indicator */}
      <div className="text-xs text-muted-foreground">
        Sección: {change.section}
      </div>
    </div>
  )
}

