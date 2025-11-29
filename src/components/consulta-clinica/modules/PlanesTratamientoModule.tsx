// src/components/consulta-clinica/modules/PlanesTratamientoModule.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ClipboardList,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Pause,
  Info,
  Plus,
  Edit,
  Trash2,
  Save,
} from "lucide-react"
import type { ConsultaClinicaDTO, TreatmentStepDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { TreatmentStepStatus, DienteSuperficie } from "@prisma/client"
import { formatDate } from "@/lib/utils/patient-helpers"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CompletarSesionDialog } from "./planes-tratamiento/CompletarSesionDialog"

interface PlanesTratamientoModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  onUpdate: () => void
  isFinalized?: boolean
}

interface ProcedimientoCatalogoDTO {
  id: number
  code: string
  nombre: string
  descripcion: string | null
  defaultPriceCents: number | null
  aplicaDiente: boolean
  aplicaSuperficie: boolean
}

interface StepFormData {
  id?: number
  order: number
  procedureId: number | null
  serviceType: string
  toothNumber: number | null
  toothSurface: DienteSuperficie | null
  estimatedDurationMin: number | null
  estimatedCostCents: number | null
  priority: number | null
  notes: string
  requiresMultipleSessions: boolean
  totalSessions: number | null
  currentSession: number | null
}

/**
 * Módulo de Plan de Tratamiento
 * 
 * Permite crear y editar planes de tratamiento activos del paciente.
 */
export function PlanesTratamientoModule({
  consulta,
  canEdit,
  isFinalized,
  onUpdate,
}: PlanesTratamientoModuleProps) {
  const router = useRouter()
  const plan = consulta.planTratamiento

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Plan form state
  const [planTitulo, setPlanTitulo] = useState("")
  const [planDescripcion, setPlanDescripcion] = useState("")

  // Steps form state
  const [steps, setSteps] = useState<StepFormData[]>([])
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)

  // Catalog state
  const [catalogOptions, setCatalogOptions] = useState<ProcedimientoCatalogoDTO[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)

  // Loading state
  const [isSaving, setIsSaving] = useState(false)

  // Session completion dialog state
  const [selectedStepForCompletion, setSelectedStepForCompletion] = useState<TreatmentStepDTO | null>(null)
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false)

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

  // Load catalog when dialog opens
  useEffect(() => {
    if (isDialogOpen && catalogOptions.length === 0 && !isLoadingCatalog) {
      loadCatalog()
    }
  }, [isDialogOpen])

  // Initialize form when editing
  useEffect(() => {
    if (isDialogOpen && plan && isEditing) {
      setPlanTitulo(plan.titulo)
      setPlanDescripcion(plan.descripcion || "")
      setSteps(
        plan.steps.map((step) => ({
          id: step.id,
          order: step.order,
          procedureId: step.procedureId,
          serviceType: step.serviceType || "",
          toothNumber: step.toothNumber,
          toothSurface: step.toothSurface,
          estimatedDurationMin: step.estimatedDurationMin,
          estimatedCostCents: step.estimatedCostCents,
          priority: step.priority,
          notes: step.notes || "",
          requiresMultipleSessions: step.requiresMultipleSessions ?? false,
          totalSessions: step.totalSessions ?? null,
          currentSession: step.currentSession ?? null,
        }))
      )
    } else if (isDialogOpen && !isEditing) {
      // Reset form for new plan
      setPlanTitulo("")
      setPlanDescripcion("")
      setSteps([])
    }
  }, [isDialogOpen, plan, isEditing])

  const loadCatalog = async () => {
    try {
      setIsLoadingCatalog(true)
      const res = await fetch("/api/procedimientos/catalogo?activo=true")
      if (!res.ok) throw new Error("Error al cargar catálogo")
      const data = await res.json()
      if (data.ok) {
        setCatalogOptions(data.data)
      }
    } catch (error) {
      console.error("Error loading catalog:", error)
      toast.error("Error al cargar catálogo de procedimientos")
    } finally {
      setIsLoadingCatalog(false)
    }
  }

  const handleOpenCreateDialog = () => {
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = () => {
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setIsEditing(false)
    setEditingStepIndex(null)
  }

  const handleAddStep = () => {
    const newOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order)) + 1 : 1
    setSteps([
      ...steps,
      {
        order: newOrder,
        procedureId: null,
        serviceType: "",
        toothNumber: null,
        toothSurface: null,
        estimatedDurationMin: null,
        estimatedCostCents: null,
        priority: null,
        notes: "",
        requiresMultipleSessions: false,
        totalSessions: null,
        currentSession: 1,
      },
    ])
    setEditingStepIndex(steps.length)
  }

  const handleEditStep = (index: number) => {
    setEditingStepIndex(index)
  }

  const handleDeleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    // Reorder steps
    newSteps.forEach((step, i) => {
      step.order = i + 1
    })
    setSteps(newSteps)
    setEditingStepIndex(null)
  }

  const handleUpdateStep = (index: number, updates: Partial<StepFormData>) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setSteps(newSteps)
  }

  const handleCatalogSelect = (index: number, catalogId: string) => {
    if (!catalogId || catalogId === "__none__") {
      handleUpdateStep(index, {
        procedureId: null,
        serviceType: "",
        toothNumber: null,
        toothSurface: null,
      })
      return
    }

    const id = Number.parseInt(catalogId, 10)
    const catalogItem = catalogOptions.find((item) => item.id === id)
    if (!catalogItem) return

    handleUpdateStep(index, {
      procedureId: id,
      serviceType: catalogItem.nombre,
      // Clear tooth fields if catalog item doesn't support them
      toothNumber: catalogItem.aplicaDiente ? steps[index].toothNumber : null,
      toothSurface: catalogItem.aplicaSuperficie ? steps[index].toothSurface : null,
    })
  }

  const handleSavePlan = async () => {
    // Validation
    if (!planTitulo.trim()) {
      toast.error("El título del plan es obligatorio")
      return
    }

    if (steps.length === 0) {
      toast.error("Debe agregar al menos un paso al plan")
      return
    }

    // Validate steps
    for (const step of steps) {
      if (!step.procedureId && !step.serviceType.trim()) {
        toast.error(`El paso #${step.order} debe tener un procedimiento del catálogo o un nombre manual`)
        return
      }

      // Validate multi-session steps
      if (step.requiresMultipleSessions) {
        if (!step.totalSessions || step.totalSessions < 2) {
          toast.error(`El paso #${step.order} requiere múltiples sesiones pero el número total de sesiones es inválido (mínimo 2)`)
          return
        }
        if (step.totalSessions > 10) {
          toast.error(`El paso #${step.order} no puede tener más de 10 sesiones`)
          return
        }
      }
    }

    try {
      setIsSaving(true)
      const pacienteId = consulta.pacienteId
      if (!pacienteId) {
        toast.error("No se pudo identificar al paciente")
        return
      }

      const body = {
        titulo: planTitulo.trim(),
        descripcion: planDescripcion.trim() || null,
        steps: steps.map((step) => ({
          id: step.id,
          order: step.order,
          procedureId: step.procedureId,
          serviceType: step.serviceType.trim() || null,
          toothNumber: step.toothNumber,
          toothSurface: step.toothSurface,
          estimatedDurationMin: step.estimatedDurationMin,
          estimatedCostCents: step.estimatedCostCents,
          priority: step.priority,
          notes: step.notes.trim() || null,
          requiresMultipleSessions: step.requiresMultipleSessions,
          totalSessions: step.requiresMultipleSessions ? step.totalSessions : null,
          currentSession: step.requiresMultipleSessions ? (step.currentSession ?? 1) : null,
        })),
      }

      const url = isEditing
        ? `/api/pacientes/${pacienteId}/plan-tratamiento`
        : `/api/pacientes/${pacienteId}/plan-tratamiento`
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar plan")
      }

      toast.success(isEditing ? "Plan actualizado correctamente" : "Plan creado correctamente")
      handleCloseDialog()
      onUpdate()
    } catch (error) {
      console.error("Error saving plan:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar plan")
    } finally {
      setIsSaving(false)
    }
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
      <>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Plan de Tratamiento
              </CardTitle>
              {canEdit && !isFinalized && consulta.pacienteId && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleOpenCreateDialog} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Crear Plan de Tratamiento</DialogTitle>
                      <DialogDescription>
                        Cree un nuevo plan de tratamiento para el paciente. Solo puede haber un plan activo a la vez.
                      </DialogDescription>
                    </DialogHeader>
                    {renderPlanForm()}
                  </DialogContent>
                </Dialog>
              )}
            </div>
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
        {selectedStepForCompletion && consulta.pacienteId && (
          <CompletarSesionDialog
            isOpen={isCompletionDialogOpen}
            onOpenChange={setIsCompletionDialogOpen}
            step={selectedStepForCompletion}
            patientId={consulta.pacienteId}
            onSessionCompleted={async () => {
              await onUpdate()
              setSelectedStepForCompletion(null)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
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
          <div className="flex gap-2">
            {canEdit && !isFinalized && consulta.pacienteId && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleOpenEditDialog} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Editar Plan de Tratamiento</DialogTitle>
                    <DialogDescription>
                      Modifique el plan de tratamiento activo del paciente.
                    </DialogDescription>
                  </DialogHeader>
                  {renderPlanForm()}
                </DialogContent>
              </Dialog>
            )}
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
        </div>
      </CardHeader>
      <CardContent>
        {isFinalized && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta consulta está finalizada. No se pueden realizar modificaciones.
            </AlertDescription>
          </Alert>
        )}
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
                        {step.requiresMultipleSessions && step.totalSessions && (
                          <Badge
                            variant="outline"
                            className={
                              step.currentSession === step.totalSessions
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            }
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Sesión {step.currentSession ?? 1}/{step.totalSessions}
                          </Badge>
                        )}
                      </div>
                      {step.requiresMultipleSessions && step.totalSessions && (
                        <div className="space-y-1 mt-2">
                          <Progress
                            value={((step.currentSession ?? 1) / step.totalSessions) * 100}
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground">
                            {step.currentSession ?? 1} de {step.totalSessions} sesiones completadas
                          </p>
                        </div>
                      )}
                      {getToothDescription(step) && (
                        <p className="text-sm text-muted-foreground">{getToothDescription(step)}</p>
                      )}
                      {step.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{step.notes}</p>
                      )}
                    </div>
                  </div>
                  {step.requiresMultipleSessions &&
                    step.status === TreatmentStepStatus.IN_PROGRESS &&
                    step.currentSession &&
                    step.totalSessions &&
                    step.currentSession < step.totalSessions &&
                    canEdit &&
                    !isFinalized && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStepForCompletion(step)
                            setIsCompletionDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Completar Sesión {step.currentSession}
                        </Button>
                      </div>
                    )}
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
    {selectedStepForCompletion && consulta.pacienteId && (
      <CompletarSesionDialog
        isOpen={isCompletionDialogOpen}
        onOpenChange={setIsCompletionDialogOpen}
        step={selectedStepForCompletion}
        patientId={consulta.pacienteId}
        onSessionCompleted={async () => {
          await onUpdate()
          setSelectedStepForCompletion(null)
        }}
      />
    )}
    </>
  )

  function renderPlanForm() {
    return (
      <div className="space-y-6 py-4">
        {/* Plan Title and Description */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planTitulo">
              Título del Plan <span className="text-destructive">*</span>
            </Label>
            <Input
              id="planTitulo"
              value={planTitulo}
              onChange={(e) => setPlanTitulo(e.target.value)}
              placeholder="Ej: Plan de tratamiento inicial"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planDescripcion">Descripción (opcional)</Label>
            <Textarea
              id="planDescripcion"
              value={planDescripcion}
              onChange={(e) => setPlanDescripcion(e.target.value)}
              placeholder="Descripción adicional del plan..."
              rows={3}
              maxLength={1000}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Pasos del Plan</Label>
            <Button type="button" onClick={handleAddStep} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Paso
            </Button>
          </div>

          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay pasos agregados. Haga clic en &quot;Agregar Paso&quot; para comenzar.
            </p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Paso #{step.order}</CardTitle>
                      <div className="flex gap-2">
                        {editingStepIndex === index ? (
                          <Button
                            type="button"
                            onClick={() => setEditingStepIndex(null)}
                            size="sm"
                            variant="outline"
                          >
                            Guardar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => handleEditStep(index)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => handleDeleteStep(index)}
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {editingStepIndex === index ? (
                    <CardContent className="space-y-4">
                      {/* Catalog Selector */}
                      <div className="space-y-2">
                        <Label>
                          Procedimiento del Catálogo <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Select
                          value={step.procedureId?.toString() || "__none__"}
                          onValueChange={(value) => handleCatalogSelect(index, value)}
                          disabled={isLoadingCatalog}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingCatalog ? "Cargando..." : "Seleccionar procedimiento..."} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Entrada manual</SelectItem>
                            {catalogOptions.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                {item.code} - {item.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Service Type */}
                      <div className="space-y-2">
                        <Label htmlFor={`serviceType-${index}`}>
                          Tipo de Procedimiento{" "}
                          {!step.procedureId && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          id={`serviceType-${index}`}
                          value={step.serviceType}
                          onChange={(e) => handleUpdateStep(index, { serviceType: e.target.value })}
                          placeholder="Ej: Obturación, Limpieza, Endodoncia..."
                          maxLength={200}
                          disabled={!!step.procedureId}
                          className={step.procedureId ? "bg-muted" : ""}
                        />
                      </div>

                      {/* Tooth Number */}
                      <div className="space-y-2">
                        <Label htmlFor={`toothNumber-${index}`}>
                          Número de Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Input
                          id={`toothNumber-${index}`}
                          type="number"
                          min="1"
                          max="85"
                          value={step.toothNumber || ""}
                          onChange={(e) =>
                            handleUpdateStep(index, {
                              toothNumber: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="1-32 o 51-85"
                          disabled={
                            step.procedureId
                              ? !catalogOptions.find((item) => item.id === step.procedureId)?.aplicaDiente
                              : false
                          }
                        />
                      </div>

                      {/* Tooth Surface */}
                      {step.procedureId
                        ? catalogOptions.find((item) => item.id === step.procedureId)?.aplicaSuperficie && (
                            <div className="space-y-2">
                              <Label htmlFor={`toothSurface-${index}`}>
                                Superficie del Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                              </Label>
                              <Select
                                value={step.toothSurface || "__none__"}
                                onValueChange={(value) =>
                                  handleUpdateStep(index, {
                                    toothSurface: value === "__none__" ? null : (value as DienteSuperficie),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar superficie..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin superficie</SelectItem>
                                  {Object.values(DienteSuperficie).map((surface) => (
                                    <SelectItem key={surface} value={surface}>
                                      {surface}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        : step.toothNumber && (
                            <div className="space-y-2">
                              <Label htmlFor={`toothSurface-${index}`}>
                                Superficie del Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                              </Label>
                              <Select
                                value={step.toothSurface || "__none__"}
                                onValueChange={(value) =>
                                  handleUpdateStep(index, {
                                    toothSurface: value === "__none__" ? null : (value as DienteSuperficie),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar superficie..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin superficie</SelectItem>
                                  {Object.values(DienteSuperficie).map((surface) => (
                                    <SelectItem key={surface} value={surface}>
                                      {surface}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                      {/* Priority */}
                      <div className="space-y-2">
                        <Label htmlFor={`priority-${index}`}>
                          Prioridad <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Select
                          value={step.priority?.toString() || "__none__"}
                          onValueChange={(value) =>
                            handleUpdateStep(index, {
                              priority: value === "__none__" ? null : Number.parseInt(value, 10),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar prioridad..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin prioridad</SelectItem>
                            <SelectItem value="1">1 - Muy Alta</SelectItem>
                            <SelectItem value="2">2 - Alta</SelectItem>
                            <SelectItem value="3">3 - Media</SelectItem>
                            <SelectItem value="4">4 - Baja</SelectItem>
                            <SelectItem value="5">5 - Muy Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Multiple Sessions Section */}
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`multiSession-${index}`}
                            checked={step.requiresMultipleSessions}
                            onChange={(e) => {
                              const checked = e.target.checked
                              handleUpdateStep(index, {
                                requiresMultipleSessions: checked,
                                totalSessions: checked ? 2 : null,
                                currentSession: checked ? 1 : null,
                              })
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label htmlFor={`multiSession-${index}`} className="font-medium cursor-pointer">
                            Requiere múltiples sesiones
                          </Label>
                        </div>

                        {step.requiresMultipleSessions && (
                          <div className="space-y-2 pl-6">
                            <div className="space-y-2">
                              <Label htmlFor={`totalSessions-${index}`}>
                                Total de Sesiones <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id={`totalSessions-${index}`}
                                type="number"
                                min={2}
                                max={10}
                                value={step.totalSessions || ""}
                                onChange={(e) => {
                                  const value = e.target.value ? Number.parseInt(e.target.value, 10) : null
                                  handleUpdateStep(index, {
                                    totalSessions: value,
                                  })
                                }}
                                placeholder="Ej: 3"
                                required
                              />
                            </div>

                            {step.id && step.totalSessions && step.currentSession && (
                              <p className="text-sm text-muted-foreground">
                                Sesión actual: {step.currentSession} de {step.totalSessions}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Estimated Duration */}
                      <div className="space-y-2">
                        <Label htmlFor={`duration-${index}`}>
                          Duración Estimada (minutos) <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Input
                          id={`duration-${index}`}
                          type="number"
                          min="1"
                          value={step.estimatedDurationMin || ""}
                          onChange={(e) =>
                            handleUpdateStep(index, {
                              estimatedDurationMin: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="Ej: 30"
                        />
                      </div>

                      {/* Estimated Cost */}
                      <div className="space-y-2">
                        <Label htmlFor={`cost-${index}`}>
                          Costo Estimado (centavos) <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Input
                          id={`cost-${index}`}
                          type="number"
                          min="0"
                          value={step.estimatedCostCents || ""}
                          onChange={(e) =>
                            handleUpdateStep(index, {
                              estimatedCostCents: e.target.value ? Number.parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="Ej: 50000"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor={`notes-${index}`}>
                          Notas <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Textarea
                          id={`notes-${index}`}
                          value={step.notes}
                          onChange={(e) => handleUpdateStep(index, { notes: e.target.value })}
                          placeholder="Notas adicionales sobre este paso..."
                          rows={3}
                          maxLength={1000}
                        />
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-medium">
                          {step.procedureId
                            ? catalogOptions.find((item) => item.id === step.procedureId)?.nombre || step.serviceType
                            : step.serviceType || "Procedimiento sin especificar"}
                        </p>
                        {step.toothNumber && (
                          <p className="text-sm text-muted-foreground">
                            Diente {step.toothNumber}
                            {step.toothSurface && ` - Superficie: ${step.toothSurface}`}
                          </p>
                        )}
                        {step.priority && (
                          <p className="text-sm text-muted-foreground">
                            Prioridad: {getPriorityText(step.priority)}
                          </p>
                        )}
                        {step.notes && <p className="text-sm text-muted-foreground">{step.notes}</p>}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSavePlan} disabled={isSaving}>
            {isSaving ? (
              "Guardando..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? "Actualizar Plan" : "Crear Plan"}
              </>
            )}
          </Button>
        </DialogFooter>
      </div>
    )
  }
}

