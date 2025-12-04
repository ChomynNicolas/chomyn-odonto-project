// src/lib/kpis/date-formatters.ts
// Date formatting utilities for KPIs with Spanish locale
import { formatInTimeZone } from "date-fns-tz"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const TZ = "America/Asuncion"

/**
 * Formatea una fecha en español con formato "d 'de' MMMM"
 */
export function formatDateSpanish(date: Date): string {
  return formatInTimeZone(date, TZ, "d 'de' MMMM", { locale: es })
}

/**
 * Formatea una fecha en español con formato "d 'de' MMMM 'de' yyyy"
 */
export function formatDateSpanishWithYear(date: Date): string {
  return formatInTimeZone(date, TZ, "d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Formatea una fecha en español con formato "EEEE, d 'de' MMMM"
 */
export function formatDateSpanishFull(date: Date): string {
  return formatInTimeZone(date, TZ, "EEEE, d 'de' MMMM", { locale: es })
}

/**
 * Formatea una hora en español
 */
export function formatTimeSpanish(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "HH:mm", { locale: es })
}

/**
 * Formatea un rango de fechas en español
 */
export function formatDateRangeSpanish(start: Date, end: Date): string {
  const startFormatted = formatDateSpanish(start)
  const endFormatted = formatDateSpanishWithYear(end)
  return `${startFormatted} - ${endFormatted}`
}
