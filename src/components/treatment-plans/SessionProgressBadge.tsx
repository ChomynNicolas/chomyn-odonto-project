// Reusable session progress badge component

'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2 } from 'lucide-react'
import type { TreatmentPlanStep } from '@/types/treatment-plans'
import { formatSessionLabel, calculateSessionProgress } from '@/lib/utils/treatment-plans'

interface SessionProgressBadgeProps {
  step: TreatmentPlanStep
  className?: string
}

export function SessionProgressBadge({ step, className }: SessionProgressBadgeProps) {
  const sessionProgress = calculateSessionProgress(step)
  const label = formatSessionLabel(step)

  if (!sessionProgress || !label) {
    return null
  }

  const { isCompleted, completedSessions, totalSessions } = sessionProgress

  const variant = isCompleted
    ? 'default' // Green
    : completedSessions > 0
      ? 'secondary' // Blue
      : 'outline' // Gray

  return (
    <Badge variant={variant} className={className}>
      {isCompleted ? (
        <CheckCircle2 className="h-3 w-3 mr-1" />
      ) : (
        <Clock className="h-3 w-3 mr-1" />
      )}
      {label}
    </Badge>
  )
}

