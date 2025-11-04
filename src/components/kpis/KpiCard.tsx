// src/components/kpis/KpiCard.tsx
"use client"

import { KpiComparison } from "@/app/api/dashboard/kpi/_dto"
import { formatNumber, formatPercent } from "@/lib/kpis/format"
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react"


interface KpiCardProps {
  label: string
  value: number | string
  comparison?: KpiComparison
  unit?: string
  format?: "number" | "percent" | "currency" | "time"
  decimals?: number
  helpText?: string
  variant?: "default" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
}

export function KpiCard({
  label,
  value,
  comparison,
  unit,
  format = "number",
  decimals = 0,
  helpText,
  variant = "default",
  size = "md",
}: KpiCardProps) {
  // Formatear valor principal
  const formattedValue = typeof value === "string" ? value : formatValue(value, format, decimals)

  // Determinar color de variación
  const deltaColor = comparison
    ? comparison.delta > 0
      ? "text-green-600 dark:text-green-400"
      : comparison.delta < 0
        ? "text-red-600 dark:text-red-400"
        : "text-gray-600 dark:text-gray-400"
    : ""

  // Tamaños
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }

  const valueSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  }

  // Variantes de color
  const variantClasses = {
    default: "border-gray-200 dark:border-gray-800",
    success: "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950",
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950",
    danger: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
  }

  return (
    <div
      className={`
        flex flex-col gap-3 rounded-xl border bg-white shadow-sm
        ${sizeClasses[size]} ${variantClasses[variant]}
      `}
    >
      {/* Header: Label + Help */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</h3>
        {helpText && (
          <button
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Cómo se calcula"
            title={helpText}
          >
            <HelpCircle className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Valor principal */}
      <div className="flex items-baseline gap-2">
        <span
          className={`font-semibold tabular-nums ${valueSizeClasses[size]}`}
          aria-label={`${label}: ${formattedValue}${unit ? ` ${unit}` : ""}`}
        >
          {formattedValue}
        </span>
        {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>

      {/* Comparación con período anterior */}
      {comparison && (
        <div className={`flex items-center gap-2 text-sm font-medium ${deltaColor}`}>
          {comparison.delta > 0 ? (
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          ) : comparison.delta < 0 ? (
            <TrendingDown className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Minus className="h-4 w-4" aria-hidden="true" />
          )}
          <span aria-label={`Variación: ${comparison.delta >= 0 ? "+" : ""}${comparison.deltaPercent.toFixed(1)}%`}>
            {comparison.delta >= 0 ? "+" : ""}
            {comparison.deltaPercent.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs período anterior</span>
        </div>
      )}
    </div>
  )
}

function formatValue(value: number, format: string, decimals: number): string {
  switch (format) {
    case "percent":
      return formatPercent(value, decimals)
    case "currency":
      return new Intl.NumberFormat("es-PY", {
        style: "currency",
        currency: "PYG",
        maximumFractionDigits: 0,
      }).format(value)
    case "time":
      return `${Math.round(value)} min`
    default:
      return formatNumber(value, decimals)
  }
}
