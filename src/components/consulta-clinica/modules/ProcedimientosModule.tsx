// src/components/consulta-clinica/modules/ProcedimientosModule.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Activity, Trash2, Edit, Search, Clock, ClipboardList, Info } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { TreatmentStepStatus, DienteSuperficie } from "@prisma/client"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface ProcedimientoCatalogoDTO {
  id: number
  code: string
  nombre: string
  descripcion: string | null
  defaultPriceCents: number | null
  aplicaDiente: boolean
  aplicaSuperficie: boolean
}

interface ProcedimientosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
  userRole?: "ADMIN" | "ODONT" | "RECEP" // Rol del usuario para controlar visibilidad de precios
}

/**
 * Módulo de Procedimientos Realizados
 * 
 * Permite a los odontólogos agregar, editar y visualizar procedimientos
 * realizados durante la consulta.
 */
export function ProcedimientosModule({ citaId, consulta, canEdit, onUpdate, userRole = "ADMIN" }: ProcedimientosModuleProps) {
  const canViewPrices = userRole === "ADMIN" // Only ADMIN can see prices
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProcedimientoDTO | null>(null)
  const [serviceType, setServiceType] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [resultNotes, setResultNotes] = useState("")
  const [treatmentStepId, setTreatmentStepId] = useState<number | null>(null)
  const [procedureId, setProcedureId] = useState<number | null>(null)
  const [unitPriceCents, setUnitPriceCents] = useState<string>("")
  const [toothNumber, setToothNumber] = useState<string>("")
  const [toothSurface, setToothSurface] = useState<DienteSuperficie | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [diagnosisId, setDiagnosisId] = useState<number | null>(null)
  const [filterByDiagnosisId, setFilterByDiagnosisId] = useState<number | null>(null)
  
  // Estados para catálogo
  const [catalogOptions, setCatalogOptions] = useState<ProcedimientoCatalogoDTO[]>([])
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProcedimientoCatalogoDTO | null>(null)

  // Get active diagnoses for linking
  const activeDiagnoses = useMemo(() => {
    return (consulta.diagnosticos || []).filter(
      (d) => {
        const status = d.status as string
        return status === "ACTIVE" || status === "UNDER_FOLLOW_UP"
      }
    )
  }, [consulta.diagnosticos])

  // Filtrar procedimientos por búsqueda y diagnóstico
  const filteredProcedimientos = useMemo(() => {
    const procedimientosList = consulta.procedimientos || []
    if (procedimientosList.length === 0) return []
    
    let filtered = procedimientosList

    // Filter by diagnosis if selected
    if (filterByDiagnosisId) {
      filtered = filtered.filter((p) => p.diagnosisId === filterByDiagnosisId)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          p.serviceType?.toLowerCase().includes(query) ||
          p.resultNotes?.toLowerCase().includes(query) ||
          (p.toothNumber && String(p.toothNumber).includes(query)) ||
          p.diagnosis?.label.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [consulta.procedimientos, searchQuery, filterByDiagnosisId])

  const resetForm = () => {
    setEditing(null)
    setServiceType("")
    setQuantity("1")
    setResultNotes("")
    setTreatmentStepId(null)
    setProcedureId(null)
    setUnitPriceCents("")
    setToothNumber("")
    setToothSurface(null)
    setSelectedCatalogItem(null)
    setDiagnosisId(null)
  }

  // Cargar catálogo al abrir el diálogo
  useEffect(() => {
    if (open && catalogOptions.length === 0 && !isLoadingCatalog) {
      loadCatalog()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadCatalog = async () => {
    try {
      setIsLoadingCatalog(true)
      const res = await fetch("/api/procedimientos/catalogo?activo=true")
      if (!res.ok) {
        throw new Error("Error al cargar catálogo")
      }
      const data = await res.json()
      if (data.ok) {
        setCatalogOptions(data.data)
        
        // Si hay un procedureId seleccionado pero no hay selectedCatalogItem, buscarlo
        if (procedureId && !selectedCatalogItem) {
          const catalogItem = data.data.find((item: ProcedimientoCatalogoDTO) => item.id === procedureId)
          if (catalogItem) {
            setSelectedCatalogItem(catalogItem)
          }
        }
      }
    } catch (error) {
      console.error("Error loading catalog:", error)
      toast.error("Error al cargar catálogo de procedimientos")
    } finally {
      setIsLoadingCatalog(false)
    }
  }

  // Manejar selección de catálogo
  const handleCatalogSelect = (catalogId: string) => {
    if (!catalogId || catalogId === "" || catalogId === "__none__") {
      // Limpiar selección
      setProcedureId(null)
      setSelectedCatalogItem(null)
      setServiceType("")
      setUnitPriceCents("")
      setToothNumber("")
      setToothSurface(null)
      return
    }

    const id = Number.parseInt(catalogId, 10)
    const catalogItem = catalogOptions.find((item) => item.id === id)
    
    if (!catalogItem) return

    setProcedureId(id)
    setSelectedCatalogItem(catalogItem)
    setServiceType(catalogItem.nombre)
    
    // Pre-llenar precio si existe
    if (catalogItem.defaultPriceCents) {
      setUnitPriceCents(String(catalogItem.defaultPriceCents))
    } else {
      setUnitPriceCents("")
    }

    // Limpiar diente/superficie si no aplican
    if (!catalogItem.aplicaDiente) {
      setToothNumber("")
    }
    if (!catalogItem.aplicaSuperficie) {
      setToothSurface(null)
    }
  }

  // Obtener steps disponibles para vincular (solo PENDING, SCHEDULED, IN_PROGRESS)
  const availableSteps = useMemo(() => {
    if (!consulta.planTratamiento?.steps) return []
    return consulta.planTratamiento.steps.filter(
      (step) =>
        step.status === TreatmentStepStatus.PENDING ||
        step.status === TreatmentStepStatus.SCHEDULED ||
        step.status === TreatmentStepStatus.IN_PROGRESS
    )
  }, [consulta.planTratamiento?.steps])

  // Función para obtener el nombre del step
  const getStepLabel = (stepId: number): string => {
    const step = consulta.planTratamiento?.steps.find((s) => s.id === stepId)
    if (!step) return ""
    const procedureName = step.procedimientoCatalogo
      ? `${step.procedimientoCatalogo.code} - ${step.procedimientoCatalogo.nombre}`
      : step.serviceType || "Procedimiento"
    const priority = step.priority ? ` (Prioridad ${step.priority})` : ""
    const sessionInfo = step.requiresMultipleSessions && step.totalSessions
      ? ` (Sesión ${step.currentSession ?? 1}/${step.totalSessions})`
      : ""
    return `#${step.order} - ${procedureName}${priority}${sessionInfo}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación frontend
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    if (resultNotes && resultNotes.trim().length > 2000) {
      toast.error("Las notas no pueden exceder 2000 caracteres")
      return
    }

    // Validación: debe haber procedureId O serviceType no vacío
    const hasProcedureId = procedureId !== null && procedureId !== undefined
    const hasServiceType = serviceType.trim() !== ""
    if (!hasProcedureId && !hasServiceType) {
      toast.error("Debe seleccionar un procedimiento del catálogo o ingresar un nombre manual")
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/procedimientos/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/procedimientos`
      const method = editing ? "PUT" : "POST"

      // Helper function to remove null/undefined values from object (only for creation)
      const cleanNullValues = (obj: Record<string, unknown>) => {
        const cleaned: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(obj)) {
          if (value !== null && value !== undefined) {
            cleaned[key] = value
          }
        }
        return cleaned
      }

      const requestBody = editing
        ? {
            quantity: qty,
            resultNotes: resultNotes.trim() || null,
          }
        : {
            procedureId: procedureId || null,
            serviceType: serviceType.trim() || null,
            quantity: qty,
            // Only send price data if user can view prices (ADMIN role)
            unitPriceCents: canViewPrices && unitPriceCents ? Number.parseInt(unitPriceCents, 10) : null,
            toothNumber: toothNumber ? Number.parseInt(toothNumber, 10) : null,
            toothSurface: toothSurface || null,
            resultNotes: resultNotes.trim() || null,
            treatmentStepId: treatmentStepId || null,
            diagnosisId: diagnosisId || null,
          }

      // For creation, remove null values to avoid validation errors
      // For update, keep null values as they may be needed to clear fields
      const bodyToSend = editing ? requestBody : cleanNullValues(requestBody)

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyToSend),
      })

      if (!res.ok) {
        const error = await res.json()
        // Si hay errores de validación de Zod, mostrarlos
        if (error.errors) {
          const errorMessages = Object.values(error.errors).flat() as string[]
          const firstError = errorMessages[0] || error.error || "Error al guardar procedimiento"
          throw new Error(firstError)
        }
        throw new Error(error.error || "Error al guardar procedimiento")
      }

      toast.success(editing ? "Procedimiento actualizado correctamente" : "Procedimiento creado correctamente")
      setOpen(false)
      resetForm()
      onUpdate()
    } catch (error) {
      console.error("Error saving procedure:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar procedimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (procedimiento: ProcedimientoDTO) => {
    setEditing(procedimiento)
    setServiceType(procedimiento.serviceType || "")
    setQuantity(String(procedimiento.quantity))
    setResultNotes(procedimiento.resultNotes || "")
    setTreatmentStepId(procedimiento.treatmentStepId || null)
    setProcedureId(procedimiento.procedureId || null)
    setUnitPriceCents(procedimiento.unitPriceCents ? String(procedimiento.unitPriceCents) : "")
    setToothNumber(procedimiento.toothNumber ? String(procedimiento.toothNumber) : "")
    setToothSurface(procedimiento.toothSurface || null)
    setDiagnosisId(procedimiento.diagnosisId || null)
    
    // Si tiene procedureId, buscar en catálogo para habilitar/deshabilitar campos
    if (procedimiento.procedureId) {
      const catalogItem = catalogOptions.find((item) => item.id === procedimiento.procedureId)
      if (catalogItem) {
        setSelectedCatalogItem(catalogItem)
      }
    } else {
      setSelectedCatalogItem(null)
    }
    
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este procedimiento? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/procedimientos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar procedimiento")
      }

      toast.success("Procedimiento eliminado correctamente")
      onUpdate()
    } catch (error) {
      console.error("Error deleting procedure:", error)
      toast.error(error instanceof Error ? error.message : "Error al eliminar procedimiento")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const procedimientosList = consulta.procedimientos || []
  const hasProcedimientos = procedimientosList.length > 0
  const hasFilteredResults = filteredProcedimientos.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Procedimientos Realizados</h3>
          {hasProcedimientos && (
            <p className="text-sm text-muted-foreground mt-1">
              {procedimientosList.length} {procedimientosList.length === 1 ? "procedimiento" : "procedimientos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Procedimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Procedimiento" : "Nuevo Procedimiento"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique los detalles del procedimiento realizado."
                    : "Registre un nuevo procedimiento realizado durante la consulta."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editing && (
                  <>
                    {availableSteps.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="treatmentStepId">
                          Vincular a Plan de Tratamiento <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Select
                          value={treatmentStepId?.toString() || "__none__"}
                          onValueChange={(value) => {
                            const stepId = value === "__none__" ? null : (value ? Number.parseInt(value, 10) : null)
                            setTreatmentStepId(stepId)
                            // Pre-llenar serviceType con el procedimiento del step
                            if (stepId) {
                              const step = consulta.planTratamiento?.steps.find((s) => s.id === stepId)
                              if (step) {
                                // Si el step tiene un procedimiento del catálogo, usar ese
                                if (step.procedimientoCatalogo && step.procedureId) {
                                  const catalogItem = catalogOptions.find(
                                    (item) => item.id === step.procedureId
                                  )
                                  if (catalogItem) {
                                    setProcedureId(catalogItem.id)
                                    setSelectedCatalogItem(catalogItem)
                                    setServiceType(catalogItem.nombre)
                                    if (catalogItem.defaultPriceCents) {
                                      setUnitPriceCents(String(catalogItem.defaultPriceCents))
                                    }
                                    // Pre-llenar diente/superficie del step si aplican
                                    if (catalogItem.aplicaDiente && step.toothNumber) {
                                      setToothNumber(String(step.toothNumber))
                                    } else if (!catalogItem.aplicaDiente) {
                                      setToothNumber("")
                                    }
                                    if (catalogItem.aplicaSuperficie && step.toothSurface) {
                                      setToothSurface(step.toothSurface)
                                    } else if (!catalogItem.aplicaSuperficie) {
                                      setToothSurface(null)
                                    }
                                  } else {
                                    // Catálogo no cargado aún, solo pre-llenar nombre desde el step
                                    setProcedureId(step.procedureId)
                                    setServiceType(`${step.procedimientoCatalogo.code} - ${step.procedimientoCatalogo.nombre}`)
                                    // Pre-llenar diente/superficie del step
                                    if (step.toothNumber) {
                                      setToothNumber(String(step.toothNumber))
                                    }
                                    if (step.toothSurface) {
                                      setToothSurface(step.toothSurface)
                                    }
                                  }
                                } else {
                                  // Step con texto libre
                                  setProcedureId(null)
                                  setSelectedCatalogItem(null)
                                  setServiceType(step.serviceType || "")
                                  // Pre-llenar diente/superficie del step si existen
                                  if (step.toothNumber) {
                                    setToothNumber(String(step.toothNumber))
                                  }
                                  if (step.toothSurface) {
                                    setToothSurface(step.toothSurface)
                                  }
                                }
                              }
                            } else {
                              // Limpiar todo
                              setProcedureId(null)
                              setSelectedCatalogItem(null)
                              setServiceType("")
                              setUnitPriceCents("")
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un paso del plan..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin vincular</SelectItem>
                            {availableSteps.map((step) => (
                              <SelectItem key={step.id} value={step.id.toString()}>
                                {getStepLabel(step.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Al vincular, el paso se marcará como completado automáticamente
                        </p>
                        {treatmentStepId && (() => {
                          const selectedStep = consulta.planTratamiento?.steps.find((s) => s.id === treatmentStepId)
                          return selectedStep?.requiresMultipleSessions && selectedStep.totalSessions ? (
                            <Alert className="mt-2">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                Este paso de tratamiento requiere {selectedStep.totalSessions} sesiones. 
                                Actualmente en sesión {selectedStep.currentSession ?? 1} de {selectedStep.totalSessions}.
                              </AlertDescription>
                            </Alert>
                          ) : null
                        })()}
                      </div>
                    )}
                    
                    {/* Selector de catálogo */}
                    <div className="space-y-2">
                      <Label htmlFor="catalogProcedure">
                        Seleccionar desde catálogo <span className="text-muted-foreground text-xs">(opcional)</span>
                      </Label>
                      <Select
                        value={procedureId?.toString() || "__none__"}
                        onValueChange={handleCatalogSelect}
                        disabled={isLoadingCatalog || !!treatmentStepId || !canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCatalog ? "Cargando..." : "Seleccione un procedimiento del catálogo..."} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin seleccionar (procedimiento manual)</SelectItem>
                          {catalogOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id.toString()}>
                              {item.code} - {item.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedCatalogItem?.descripcion && (
                        <p className="text-xs text-muted-foreground italic">{selectedCatalogItem.descripcion}</p>
                      )}
                    </div>

                    {/* Tipo de Procedimiento */}
                    <div className="space-y-2">
                      <Label htmlFor="serviceType">
                        Tipo de Procedimiento{" "}
                        {!procedureId && <span className="text-destructive">*</span>}
                        {procedureId && <span className="text-muted-foreground text-xs">(pre-llenado desde catálogo)</span>}
                      </Label>
                      <Input
                        id="serviceType"
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        placeholder="Ej: Obturación, Limpieza, Endodoncia, etc."
                        maxLength={200}
                        disabled={!!treatmentStepId}
                        className={procedureId ? "bg-muted" : ""}
                      />
                      <p className="text-xs text-muted-foreground">
                        {serviceType.length}/200 caracteres
                        {treatmentStepId && " (se usa el procedimiento del plan)"}
                        {procedureId && " (desde catálogo)"}
                      </p>
                    </div>

                    {/* Precio unitario - Solo visible para ADMIN */}
                    {canViewPrices && (
                      <div className="space-y-2">
                        <Label htmlFor="unitPriceCents">
                          Precio Unitario (centavos) <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Input
                          id="unitPriceCents"
                          type="number"
                          min="0"
                          value={unitPriceCents}
                          onChange={(e) => setUnitPriceCents(e.target.value)}
                          placeholder="Precio en centavos"
                          disabled={!!treatmentStepId}
                          className={selectedCatalogItem?.defaultPriceCents ? "bg-muted" : ""}
                        />
                        {selectedCatalogItem?.defaultPriceCents && (
                          <p className="text-xs text-muted-foreground">
                            Precio por defecto del catálogo: {selectedCatalogItem.defaultPriceCents.toLocaleString()} centavos
                          </p>
                        )}
                      </div>
                    )}
                    {!canViewPrices && (
                      <div className="rounded-md border border-muted bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Los precios son gestionados por la administración
                        </p>
                      </div>
                    )}

                    {/* Diente */}
                    <div className="space-y-2">
                      <Label htmlFor="toothNumber">
                        Número de Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                      </Label>
                      <Input
                        id="toothNumber"
                        type="number"
                        min="1"
                        max="85"
                        value={toothNumber}
                        onChange={(e) => setToothNumber(e.target.value)}
                        placeholder="1-32 o 51-85"
                        disabled={!!treatmentStepId || !!(selectedCatalogItem && !selectedCatalogItem.aplicaDiente)}
                      />
                      {selectedCatalogItem && !selectedCatalogItem.aplicaDiente && (
                        <p className="text-xs text-muted-foreground">
                          Este procedimiento no aplica a dientes específicos
                        </p>
                      )}
                    </div>

                    {/* Superficie */}
                    {selectedCatalogItem?.aplicaSuperficie && (
                      <div className="space-y-2">
                        <Label htmlFor="toothSurface">
                          Superficie del Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                        </Label>
                        <Select
                          value={toothSurface || "__none__"}
                          onValueChange={(value) => setToothSurface(value === "__none__" ? null : (value ? (value as DienteSuperficie) : null))}
                          disabled={!!treatmentStepId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione superficie..." />
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
                  </>
                )}
                {editing && (
                  <>
                    <div className="space-y-2">
                      <Label>Procedimiento</Label>
                      <div className="p-3 bg-muted rounded-md">
                        <p className="font-medium">{editing.serviceType || "Procedimiento sin especificar"}</p>
                        {editing.procedureId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Procedimiento del catálogo (ID: {editing.procedureId})
                          </p>
                        )}
                      </div>
                    </div>
                    {editing.toothNumber && (
                      <div className="space-y-2">
                        <Label>Diente</Label>
                        <div className="p-3 bg-muted rounded-md">
                          <p className="font-medium">
                            Diente {editing.toothNumber}
                            {editing.toothSurface && ` - Superficie: ${editing.toothSurface}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Cantidad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                {/* Diagnosis Link */}
                {activeDiagnoses.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="diagnosisLink">
                      Vincular a Diagnóstico <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Select
                      value={diagnosisId?.toString() || "__none__"}
                      onValueChange={(value) => {
                        setDiagnosisId(value === "__none__" ? null : (value ? Number.parseInt(value, 10) : null))
                      }}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un diagnóstico..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin vincular</SelectItem>
                        {activeDiagnoses.map((diagnosis) => {
                          const status = diagnosis.status as string
                          return (
                            <SelectItem key={diagnosis.id} value={diagnosis.id.toString()}>
                              {diagnosis.label} {status === "UNDER_FOLLOW_UP" && "(En Seguimiento)"}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Vincule este procedimiento a un diagnóstico activo para seguimiento clínico
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="resultNotes">
                    Notas del Resultado <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="resultNotes"
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    placeholder="Describa el resultado del procedimiento, observaciones, etc."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">{resultNotes.length}/2000 caracteres</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda y Filtros */}
      {hasProcedimientos && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por tipo de procedimiento, notas o diente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {activeDiagnoses.length > 0 && (
            <div className="flex items-center gap-2">
              <Label htmlFor="filterDiagnosis" className="text-sm whitespace-nowrap">
                Filtrar por diagnóstico:
              </Label>
              <Select
                value={filterByDiagnosisId?.toString() || "__none__"}
                onValueChange={(value) => {
                  setFilterByDiagnosisId(value === "__none__" ? null : (value ? Number.parseInt(value, 10) : null))
                }}
              >
                <SelectTrigger id="filterDiagnosis" className="w-full sm:w-[300px]">
                  <SelectValue placeholder="Todos los procedimientos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos los procedimientos</SelectItem>
                  {activeDiagnoses.map((diagnosis) => {
                    const status = diagnosis.status as string
                    return (
                      <SelectItem key={diagnosis.id} value={diagnosis.id.toString()}>
                        {diagnosis.label} {status === "UNDER_FOLLOW_UP" && "(En Seguimiento)"}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Lista de procedimientos */}
      {!hasProcedimientos ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay procedimientos registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience agregando el primer procedimiento realizado"
                : "No hay información de procedimientos disponible"}
            </p>
          </CardContent>
        </Card>
      ) : !hasFilteredResults ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No se encontraron resultados</p>
            <p className="text-sm mt-1">Intente con otros términos de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProcedimientos.map((proc) => (
            <Card key={proc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">
                      {proc.serviceType || "Procedimiento sin especificar"}
                    </CardTitle>
                    {proc.diagnosis && (
                      <div className="mt-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Vinculado a: {proc.diagnosis.label}
                          {(proc.diagnosis.status as string) === "UNDER_FOLLOW_UP" && " (En Seguimiento)"}
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span>Cantidad: {proc.quantity}</span>
                      {proc.toothNumber && <span>Diente: {proc.toothNumber}</span>}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(proc.createdAt, true)}</span>
                        <span className="text-xs">({formatRelativeTime(proc.createdAt)})</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(proc)}
                        className="h-8 w-8 p-0"
                        title="Editar procedimiento"
                        disabled={isDeleting === proc.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(proc.id)}
                        disabled={isDeleting === proc.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Eliminar procedimiento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {proc.resultNotes && (
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{proc.resultNotes}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
