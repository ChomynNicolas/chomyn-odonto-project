import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { startOfDay, endOfDay, isToday as isTodayFns } from "date-fns"

export const BUSINESS_TZ = "America/Asuncion"

export function getStartOfDayInTZ(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date
  const zonedDate = toZonedTime(d, BUSINESS_TZ)
  const startOfDayZoned = startOfDay(zonedDate)
  return fromZonedTime(startOfDayZoned, BUSINESS_TZ)
}

export function getEndOfDayInTZ(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date
  const zonedDate = toZonedTime(d, BUSINESS_TZ)
  const endOfDayZoned = endOfDay(zonedDate)
  return fromZonedTime(endOfDayZoned, BUSINESS_TZ)
}

export function isTodayInTZ(date: Date | string): boolean {
  const d = typeof date === "string" ? new Date(date) : date
  const zonedDate = toZonedTime(d, BUSINESS_TZ)
  const now = toZonedTime(new Date(), BUSINESS_TZ)
  return isTodayFns(zonedDate) && isTodayFns(now)
}

export function formatDateInTZ(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: BUSINESS_TZ,
    ...options,
  }).format(d)
}
