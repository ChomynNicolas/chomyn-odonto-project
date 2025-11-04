// src/lib/kpis/date-range.ts
/**
 * Utilidades para cálculo de rangos de fechas en TZ de negocio
 */
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, differenceInDays } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { BUSINESS_TZ } from "@/lib/date-utils"
import type { DateRangePreset } from "@/app/api/kpis/clinico/_schemas"

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Obtiene el rango de fechas según preset, en TZ de negocio
 */
export function getDateRangeFromPreset(preset: DateRangePreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = toZonedTime(new Date(), BUSINESS_TZ)

  switch (preset) {
    case "today": {
      const start = startOfDay(now)
      const end = endOfDay(now)
      return {
        start: fromZonedTime(start, BUSINESS_TZ),
        end: fromZonedTime(end, BUSINESS_TZ),
      }
    }
    case "last7days": {
      const end = endOfDay(now)
      const start = startOfDay(subDays(now, 6))
      return {
        start: fromZonedTime(start, BUSINESS_TZ),
        end: fromZonedTime(end, BUSINESS_TZ),
      }
    }
    case "last30days": {
      const end = endOfDay(now)
      const start = startOfDay(subDays(now, 29))
      return {
        start: fromZonedTime(start, BUSINESS_TZ),
        end: fromZonedTime(end, BUSINESS_TZ),
      }
    }
    case "last90days": {
      const end = endOfDay(now)
      const start = startOfDay(subDays(now, 89))
      return {
        start: fromZonedTime(start, BUSINESS_TZ),
        end: fromZonedTime(end, BUSINESS_TZ),
      }
    }
    case "currentMonth": {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return {
        start: fromZonedTime(startOfDay(start), BUSINESS_TZ),
        end: fromZonedTime(endOfDay(end), BUSINESS_TZ),
      }
    }
    case "custom": {
      if (!customStart || !customEnd) {
        throw new Error("Custom date range requires start and end dates")
      }
      const zonedStart = toZonedTime(customStart, BUSINESS_TZ)
      const zonedEnd = toZonedTime(customEnd, BUSINESS_TZ)
      return {
        start: fromZonedTime(startOfDay(zonedStart), BUSINESS_TZ),
        end: fromZonedTime(endOfDay(zonedEnd), BUSINESS_TZ),
      }
    }
  }
}

/**
 * Calcula el período anterior con la misma duración
 */
export function getPreviousPeriod(start: Date, end: Date): DateRange {
  const days = differenceInDays(end, start) + 1
  const prevEnd = subDays(start, 1)
  const prevStart = subDays(prevEnd, days - 1)

  const zonedStart = toZonedTime(prevStart, BUSINESS_TZ)
  const zonedEnd = toZonedTime(prevEnd, BUSINESS_TZ)

  return {
    start: fromZonedTime(startOfDay(zonedStart), BUSINESS_TZ),
    end: fromZonedTime(endOfDay(zonedEnd), BUSINESS_TZ),
  }
}

/**
 * Calcula la comparación entre dos valores
 */
export function calculateComparison(current: number, previous: number) {
  const delta = current - previous
  const deltaPercent = previous === 0 ? (current > 0 ? 100 : 0) : (delta / previous) * 100

  return {
    current,
    previous,
    delta,
    deltaPercent: Math.round(deltaPercent * 10) / 10, // 1 decimal
  }
}
