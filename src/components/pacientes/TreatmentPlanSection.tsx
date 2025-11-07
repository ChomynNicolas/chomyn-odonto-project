"use client"

import type { TreatmentPlan, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, XCircle, Clock } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface TreatmentPlanSectionProps {
  treatmentPlans: TreatmentPlan[]
  userRole: UserRole
  onMarkProgress?: (stepId: string) => void
}

export function TreatmentPlanSection({ treatmentPlans, userRole, onMarkProgress }: TreatmentPlanSectionProps) {
  const permissions = getPermissions(userRole)

  // Find active plan
  const activePlan = treatmentPlans.find((plan) => plan.status === "ACTIVE")

  if (!activePlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan de Tratamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay plan de tratamiento activo</p>
        </CardContent>
      </Card>
    )
  }

  const completedSteps = activePlan.steps.filter((s) => s.status === "COMPLETED").length
  const totalSteps = activePlan.steps.length
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  const getStepIcon = (status: TreatmentPlan["steps"][0]["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "IN_PROGRESS":
        return <Clock className="h-5 w-5 text-blue-600" />
      case "CANCELLED":
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepStatusBadge = (status: TreatmentPlan["steps"][0]["status"]) => {
    const statusConfig = {
      PENDING: { label: "Pendiente", variant: "secondary" as const },
      IN_PROGRESS: { label: "En Curso", variant: "default" as const },
      COMPLETED: { label: "Completado", variant: "outline" as const },
      CANCELLED: { label: "Cancelado", variant: "destructive" as const },
    }
    return statusConfig[status] || statusConfig.PENDING
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{activePlan.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {completedSteps} de {totalSteps} pasos completados
            </p>
          </div>
          {activePlan.estimatedCost && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Costo Estimado</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat("es-PY", {
                  style: "currency",
                  currency: "PYG",
                }).format(activePlan.estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progressPercentage} className="h-2" />

        <div className="space-y-3">
          {activePlan.steps
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <div key={step.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="mt-0.5">{getStepIcon(step.status)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {step.order}. {step.procedure.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Código: {step.procedure.code}
                        {step.tooth && ` • Diente: ${step.tooth}`}
                        {step.surface && ` • Superficie: ${step.surface}`}
                      </p>
                      {step.notes && <p className="mt-1 text-xs text-muted-foreground">{step.notes}</p>}
                    </div>
                    <Badge {...getStepStatusBadge(step.status)} />
                  </div>
                  {step.estimatedCost && (
                    <p className="text-sm font-medium">
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: "PYG",
                      }).format(step.estimatedCost)}
                    </p>
                  )}
                  {permissions.canEditClinicalData && step.status === "PENDING" && (
                    <Button size="sm" variant="outline" onClick={() => onMarkProgress?.(step.id)} className="mt-2">
                      Marcar en Progreso
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
