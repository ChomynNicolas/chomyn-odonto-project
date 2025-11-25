// Enhanced completion indicator with color-coded status

"use client"

import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SectionCompletionIndicatorProps {
  isComplete: boolean
  isPartial?: boolean
}

export function SectionCompletionIndicator({ isComplete, isPartial = false }: SectionCompletionIndicatorProps) {
  if (isComplete) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completo
      </Badge>
    )
  }

  if (isPartial) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Parcial
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Circle className="h-3.5 w-3.5" />
      Pendiente
    </Badge>
  )
}
