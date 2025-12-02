// Individual session display component

'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Circle } from 'lucide-react'
import type { SessionStatus } from '@/lib/utils/treatment-plans'

interface SessionItemProps {
  sessionNumber: number
  status: SessionStatus
  isCurrent: boolean
  totalSessions: number
}

export function SessionItem({ sessionNumber, status, isCurrent, totalSessions }: SessionItemProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completada
          </Badge>
        )
      case 'IN_PROGRESS':
        return (
          <Badge variant="secondary" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            En Progreso
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-xs">
            <Circle className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
    }
  }

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Sesión {sessionNumber} de {totalSessions}</span>
        {isCurrent && (
          <Badge variant="outline" className="text-xs">
            Actual
          </Badge>
        )}
      </div>
      {getStatusBadge()}
    </div>
  )
}

