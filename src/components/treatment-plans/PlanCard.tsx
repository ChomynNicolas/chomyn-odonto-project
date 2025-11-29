// Card component for displaying a treatment plan

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PlanProgressIndicator } from './PlanProgressIndicator'
import { StepRow } from './StepRow'
import type { TreatmentPlan } from '@/types/treatment-plans'

interface PlanCardProps {
  plan: TreatmentPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  return (
    <Card className={plan.isActive ? '' : 'opacity-75'}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base">{plan.titulo}</CardTitle>
            {plan.descripcion && (
              <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Creado por {plan.createdBy} el {new Date(plan.createdAt).toLocaleDateString('es-PY')}
            </p>
          </div>
          <Badge variant={plan.isActive ? 'default' : 'secondary'}>
            {plan.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        </div>

        <div className="mt-4">
          <PlanProgressIndicator progress={plan.progress} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-0 border rounded-lg overflow-hidden">
          {plan.steps.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay pasos definidos en este plan
            </div>
          ) : (
            plan.steps.map((step) => (
              <StepRow key={step.id} step={step} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

