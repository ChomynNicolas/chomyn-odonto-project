// List of sessions within a step

'use client'

import { SessionItem } from './SessionItem'
import type { TreatmentPlanStep } from '@/types/treatment-plans'
import { generateSessionList } from '@/lib/utils/treatment-plans'

interface SessionsListProps {
  step: TreatmentPlanStep
}

export function SessionsList({ step }: SessionsListProps) {
  const sessions = generateSessionList(step)

  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="mt-2 border rounded-md bg-muted/30">
      {sessions.map((session) => (
        <SessionItem
          key={session.sessionNumber}
          sessionNumber={session.sessionNumber}
          status={session.status}
          isCurrent={session.isCurrent}
          totalSessions={step.totalSessions!}
        />
      ))}
    </div>
  )
}

