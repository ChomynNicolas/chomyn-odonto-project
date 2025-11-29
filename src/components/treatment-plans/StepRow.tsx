// Expandable step row component for treatment plans

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { SessionsList } from './SessionsList'
import { SessionProgressBadge } from './SessionProgressBadge'
import type { TreatmentPlanStep } from '@/types/treatment-plans'

interface StepRowProps {
  step: TreatmentPlanStep
}

export function StepRow({ step }: StepRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isMultiSession = step.requiresMultipleSessions && step.totalSessions && step.totalSessions >= 2

  const getStatusBadge = () => {
    switch (step.status) {
      case 'COMPLETED':
        return (
          <Badge variant="default" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completado
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
      case 'SCHEDULED':
        return (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <Clock className="h-3 w-3 mr-1" />
            Programado
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelado
          </Badge>
        )
      case 'DEFERRED':
        return (
          <Badge variant="outline" className="text-xs">
            Diferido
          </Badge>
        )
      default:
        return <Badge variant="outline" className="text-xs">{step.status}</Badge>
    }
  }

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-4 py-3 px-4 hover:bg-muted/50 transition-colors">
        <div className="font-medium text-sm w-8">{step.order}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium">{step.procedure}</p>
            {getStatusBadge()}
            {isMultiSession && (
              <SessionProgressBadge step={step} />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {step.toothNumber && (
              <span>
                Diente {step.toothNumber}
                {step.surface && ` (${step.surface})`}
              </span>
            )}
            {step.executedCount > 0 && (
              <span>{step.executedCount} vez{step.executedCount > 1 ? 'ces' : ''} ejecutado</span>
            )}
            {step.notes && (
              <span className="italic truncate max-w-md">{step.notes}</span>
            )}
          </div>
        </div>

        <div className="text-right text-sm">
          {step.estimatedCostCents ? (
            <span className="font-medium">
              Gs. {(step.estimatedCostCents / 100).toLocaleString('es-PY')}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>

        {isMultiSession && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
            aria-label={isExpanded ? 'Ocultar sesiones' : 'Mostrar sesiones'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      
      {isMultiSession && isExpanded && (
        <div className="px-4 pb-3 border-t bg-muted/20">
          <SessionsList step={step} />
        </div>
      )}
    </div>
  )
}

