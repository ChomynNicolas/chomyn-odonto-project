// src/lib/kpis/format.ts
/**
 * Utilidades de formato específicas para KPIs
 */

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDelta(delta: number, deltaPercent: number): string {
  const sign = delta >= 0 ? "+" : ""
  return `${sign}${delta} (${sign}${deltaPercent.toFixed(1)}%)`
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export function formatCurrency(cents: number): string {
  const amount = cents / 100
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatEdadGrupo(edadMin: number, edadMax: number | null): string {
  if (edadMax === null) return `${edadMin}+`
  return `${edadMin}-${edadMax}`
}
