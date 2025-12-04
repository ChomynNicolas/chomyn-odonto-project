// src/lib/kpis/period-utils.ts
// Utility functions for period calculations (server-safe)
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns"

export type PeriodPreset = "today" | "last7days" | "last30days" | "currentMonth" | "lastMonth" | "last3Months"

export function getPeriodDates(period: PeriodPreset): { start: Date; end: Date } {
  const now = new Date()
  const today = startOfDay(now)

  switch (period) {
    case "today":
      return {
        start: today,
        end: endOfDay(now),
      }
    case "last7days":
      return {
        start: startOfDay(subDays(now, 6)),
        end: endOfDay(now),
      }
    case "last30days":
      return {
        start: startOfDay(subDays(now, 29)),
        end: endOfDay(now),
      }
    case "currentMonth":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
    case "lastMonth":
      const lastMonth = subMonths(now, 1)
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }
    case "last3Months":
      return {
        start: startOfMonth(subMonths(now, 2)),
        end: endOfMonth(now),
      }
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      }
  }
}

