// Enhanced progress indicator with session information

'use client'

import { Progress } from '@/components/ui/progress'
import type { TreatmentPlanProgress } from '@/types/treatment-plans'

interface PlanProgressIndicatorProps {
  progress: TreatmentPlanProgress
  showSessionInfo?: boolean
}

export function PlanProgressIndicator({ progress, showSessionInfo = true }: PlanProgressIndicatorProps) {
  const stepProgressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progreso</span>
        <span className="font-medium">
          {progress.completed}/{progress.total} pasos completados
        </span>
      </div>
      <Progress value={stepProgressPercent} />
      {showSessionInfo && progress.totalSessions && progress.totalSessions > 0 && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Sesiones: </span>
          <span>
            {progress.completedSessions || 0}/{progress.totalSessions} sesiones completadas
          </span>
        </div>
      )}
    </div>
  )
}

