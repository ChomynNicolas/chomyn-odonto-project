"use client"

import { Info } from "lucide-react"
import { getPreviousPeriod } from "@/lib/kpis/date-range"
import { getPeriodDates, type PeriodPreset } from "@/lib/kpis/period-utils"
import { formatDateRangeSpanish } from "@/lib/kpis/date-formatters"

export function PeriodInfo({ period }: { period: PeriodPreset }) {
  const { start, end } = getPeriodDates(period)
  const previous = getPreviousPeriod(start, end)

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
      <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Período de comparación:</p>
        <p>
          <span className="font-semibold">Actual:</span> {formatDateRangeSpanish(start, end)}
        </p>
        <p>
          <span className="font-semibold">Anterior:</span> {formatDateRangeSpanish(previous.start, previous.end)}
        </p>
        <p className="mt-2 text-xs opacity-75">
          Los porcentajes muestran la variación respecto al período anterior. Si el período anterior tenía 0 y el actual tiene valor, se muestra +100%.
        </p>
      </div>
    </div>
  )
}

