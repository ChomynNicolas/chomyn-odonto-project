// src/components/reportes/ReportKpiCards.tsx
"use client"

/**
 * Report KPI Cards Component
 * Displays KPIs in a responsive grid layout.
 */

import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"
import type { ReportKpi } from "@/types/reportes"

interface ReportKpiCardsProps {
  kpis: ReportKpi[]
  isLoading?: boolean
}

/**
 * Format a numeric value based on format type.
 */
function formatValue(value: number | string, format?: string, decimals = 0): string {
  if (typeof value === "string") return value

  switch (format) {
    case "percent":
      return `${value.toFixed(decimals)}%`
    case "currency":
      // Format as PYG (Paraguayan Guarani)
      // NOTA: El valor ya está en guaraníes (PYG), no dividir por 100
      return new Intl.NumberFormat("es-PY", {
        style: "currency",
        currency: "PYG",
        maximumFractionDigits: 0,
      }).format(value)
    case "time":
      return `${Math.round(value)} min`
    default:
      return new Intl.NumberFormat("es-PY", {
        maximumFractionDigits: decimals,
      }).format(value)
  }
}

export function ReportKpiCards({ kpis, isLoading }: ReportKpiCardsProps) {
  if (isLoading) {
    return <KpiCardsSkeleton count={kpis.length || 5} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 print:grid-cols-5 print:gap-2">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  )
}

/**
 * Individual KPI card.
 */
function KpiCard({ kpi }: { kpi: ReportKpi }) {
  const formattedValue = formatValue(kpi.value, kpi.format, kpi.decimals)

  // Determine color based on comparison delta
  const deltaColor = kpi.comparison
    ? kpi.comparison.delta > 0
      ? "text-green-600 dark:text-green-400"
      : kpi.comparison.delta < 0
        ? "text-red-600 dark:text-red-400"
        : "text-gray-600 dark:text-gray-400"
    : ""

  // Variant styles
  const variantStyles = {
    default: "border-gray-200 dark:border-gray-800",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50",
    danger: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50",
  }

  const variant = kpi.variant ?? "default"

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-white p-4 shadow-sm print:shadow-none print:border print:p-2 dark:bg-gray-950 ${variantStyles[variant]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 print:text-xs">
          {kpi.label}
        </h3>
        {kpi.helpText && (
          <button
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 print:hidden"
            title={kpi.helpText}
            aria-label={`Ayuda: ${kpi.helpText}`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100 print:text-lg">
          {formattedValue}
        </span>
        {kpi.unit && (
          <span className="text-sm text-gray-500 dark:text-gray-400">{kpi.unit}</span>
        )}
      </div>

      {/* Comparison */}
      {kpi.comparison && (
        <div className={`flex items-center gap-1 text-xs font-medium print:hidden ${deltaColor}`}>
          {kpi.comparison.delta > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : kpi.comparison.delta < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span>
            {kpi.comparison.delta >= 0 ? "+" : ""}
            {kpi.comparison.deltaPercent.toFixed(1)}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">vs anterior</span>
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton loader for KPI cards.
 */
function KpiCardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  )
}

