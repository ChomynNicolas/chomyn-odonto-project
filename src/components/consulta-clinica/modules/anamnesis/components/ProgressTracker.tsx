// New component for tracking form completion progress

"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle } from "lucide-react"

interface ProgressTrackerProps {
  sections: Array<{
    id: string
    label: string
    isComplete: boolean
  }>
  onSectionClick?: (sectionId: string) => void
}

export function ProgressTracker({ sections, onSectionClick }: ProgressTrackerProps) {
  const completionPercentage = useMemo(() => {
    const completed = sections.filter((s) => s.isComplete).length
    return Math.round((completed / sections.length) * 100)
  }, [sections])

  return (
    <div className="sticky top-4 z-10 rounded-xl border bg-card/95 backdrop-blur-sm p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progreso del Formulario</span>
            <span className="text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <nav className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionClick?.(section.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50 text-left"
            >
              {section.isComplete ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={section.isComplete ? "text-foreground" : "text-muted-foreground"}>{section.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
