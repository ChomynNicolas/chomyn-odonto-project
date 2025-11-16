// src/components/consulta-clinica/modules/PlanesTratamientoModule.tsx
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ClipboardList, ExternalLink, CheckCircle2, Clock, XCircle, AlertCircle, Pause, Info } from "lucide-react"
import type { ConsultaClinicaDTO, TreatmentStepDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { TreatmentStepStatus } from "@prisma/client"
import { formatDate } from "@/lib/utils/patient-helpers"
import { useRouter } from "next/navigation"

interface PlanesTratamientoModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  onUpdate: () => void
  isFinalized?: boolean
}

/**
 * Módulo de Plan de Tratamiento
 * 
 * Muestra el plan de tratamiento activo del paciente con todos sus pasos.
 * ⚠️ READ-ONLY: Los planes de tratamiento no se pueden editar desde la consulta.
 * Use la página de gestión de planes para crear o modificar planes.
 */
export function PlanesTratamientoModule({ consulta, canEdit, isFinalized }: PlanesTratamientoModuleProps) {
  const router = useRouter()
  const plan = consulta.planTratamiento

  // Función para obtener el badge de estado del step
  const getStatusBadge = (status: TreatmentStepStatus) => {
    switch (status) {
      case TreatmentStepStatus.PENDING:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case TreatmentStepStatus.SCHEDULED:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            <Clock className="h-3 w-3 mr-1" />
            Programado
          </Badge>
        )
      case TreatmentStepStatus.IN_PROGRESS:
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
            <AlertCircle className="h-3 w-3 mr-1" />
            En Progreso
          </Badge>
        )
      case TreatmentStepStatus.COMPLETED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completado
          </Badge>
        )
      case TreatmentStepStatus.CANCELLED:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        )
      case TreatmentStepStatus.DEFERRED:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400">
            <Pause className="h-3 w-3 mr-1" />
            Diferido
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Función para obtener el nombre del procedimiento
  const getProcedureName = (step: TreatmentStepDTO): string => {
    if (step.procedimientoCatalogo) {
      return `${step.procedimientoCatalogo.code} - ${step.procedimientoCatalogo.nombre}`
    }
    if (step.serviceType) {
      return step.serviceType
    }
    return "Procedimiento sin especificar"
  }

  // Función para obtener la descripción del diente
  const getToothDescription = (step: TreatmentStepDTO): string | null => {
    if (!step.toothNumber) return null
    const surface = step.toothSurface ? ` (${step.toothSurface})` : ""
    return `Diente ${step.toothNumber}${surface}`
  }

  // Función para formatear el costo
  const formatCost = (cents: number | null): string => {
    if (!cents) return "N/A"
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
    }).format(cents)
  }

  // Función para formatear la duración
  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return "N/A"
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  // Función para obtener la prioridad como texto
  const getPriorityText = (priority: number | null): string => {
    if (!priority) return "N/A"
    if (priority === 1) return "Muy Alta"
    if (priority === 2) return "Alta"
    if (priority === 3) return "Media"
    if (priority === 4) return "Baja"
    if (priority === 5) return "Muy Baja"
    return `Prioridad ${priority}`
  }

  // Pasos ordenados por estado (completados al final)
  const sortedSteps = useMemo(() => {
    if (!plan?.steps) return []
    return [...plan.steps].sort((a, b) => {
      // Primero por orden
      if (a.order !== b.order) return a.order - b.order
      // Luego por estado (completados al final)
      if (a.status === TreatmentStepStatus.COMPLETED && b.status !== TreatmentStepStatus.COMPLETED) return 1
      if (a.status !== TreatmentStepStatus.COMPLETED && b.status === TreatmentStepStatus.COMPLETED) return -1
      return 0
    })
  }, [plan?.steps])

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Plan de Tratamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">No hay plan de tratamiento activo para este paciente.</p>
            {canEdit && consulta.pacienteId && (
              <Button
                variant="outline"
                onClick={() => router.push(`/pacientes/${consulta.pacienteId}/planes`)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Planes de Tratamiento
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Plan de Tratamiento
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {plan.titulo}
              {plan.descripcion && ` • ${plan.descripcion}`}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>Creado: {formatDate(plan.createdAt)}</span>
              <span>•</span>
              <span>Actualizado: {formatDate(plan.updatedAt)}</span>
              <span>•</span>
              <span>Creado por: {plan.createdBy.nombre}</span>
            </div>
          </div>
          {canEdit && consulta.pacienteId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/pacientes/${consulta.pacienteId}/planes`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Gestionar Planes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Vista de solo lectura:</strong> Los planes de tratamiento se gestionan desde la página de planes del paciente.
            {isFinalized && " Esta consulta está finalizada."}
          </AlertDescription>
        </Alert>
        <div className="space-y-4">
          {sortedSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay pasos definidos en este plan.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedSteps.map((step) => (
                <div
                  key={step.id}
                  className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-muted-foreground">#{step.order}</span>
                        <h4 className="font-semibold">{getProcedureName(step)}</h4>
                        {getStatusBadge(step.status)}
                      </div>
                      {getToothDescription(step) && (
                        <p className="text-sm text-muted-foreground">{getToothDescription(step)}</p>
                      )}
                      {step.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{step.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <div>
                      <span className="font-medium">Duración:</span> {formatDuration(step.estimatedDurationMin)}
                    </div>
                    <div>
                      <span className="font-medium">Costo:</span> {formatCost(step.estimatedCostCents)}
                    </div>
                    <div>
                      <span className="font-medium">Prioridad:</span> {getPriorityText(step.priority)}
                    </div>
                    <div>
                      <span className="font-medium">Actualizado:</span> {formatDate(step.updatedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

