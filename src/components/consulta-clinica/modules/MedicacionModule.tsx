// src/components/consulta-clinica/modules/MedicacionModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pill, Calendar, Edit, X } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, MedicacionDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"

interface MedicacionModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean
  onUpdate: () => void
}

export function MedicacionModule({ citaId, consulta, canEdit, hasConsulta, onUpdate }: MedicacionModuleProps) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [editingMedication, setEditingMedication] = useState<MedicacionDTO | null>(null)
  const [deactivatingMedication, setDeactivatingMedication] = useState<MedicacionDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    dose: "",
    freq: "",
    route: "",
    startAt: "",
    endAt: "",
  })

  const medicacionesList = consulta.medicaciones || []
  const activeMedications = medicacionesList.filter(m => m.isActive)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    // Client-side validation: require label
    if (!formData.label.trim()) {
      toast.error("El nombre del medicamento es requerido")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label.trim() || null,
          description: formData.description.trim() || null,
          dose: formData.dose.trim() || null,
          freq: formData.freq.trim() || null,
          route: formData.route.trim() || null,
          startAt: formData.startAt || null,
          endAt: formData.endAt || null,
        }),
      })

      if (!res.ok) {
        // Check if response is JSON before parsing
        const contentType = res.headers.get("content-type")
        let errorMessage = "Error al prescribir medicamento"
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await res.json()
            // Handle structured error responses
            if (error.error) {
              errorMessage = error.error
            } else if (error.message) {
              errorMessage = error.message
            } else if (typeof error === "string") {
              errorMessage = error
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError)
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        } else {
          // Non-JSON response
          try {
            const text = await res.text()
            errorMessage = text || `Error ${res.status}: ${res.statusText}`
          } catch {
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      // Parse successful response
      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        await res.json() // Consume the response
      }

      toast.success("Medicamento prescrito correctamente")
      setOpen(false)
      setFormData({
        label: "",
        description: "",
        dose: "",
        freq: "",
        route: "",
        startAt: "",
        endAt: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error prescribing medication:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al prescribir medicamento"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (med: MedicacionDTO) => {
    setEditingMedication(med)
    setFormData({
      label: med.label || "",
      description: med.description || "",
      dose: med.dose || "",
      freq: med.freq || "",
      route: med.route || "",
      startAt: med.startAt ? med.startAt.split("T")[0] : "",
      endAt: med.endAt ? med.endAt.split("T")[0] : "",
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    if (!editingMedication) return

    // Client-side validation: require label
    if (!formData.label.trim()) {
      toast.error("El nombre del medicamento es requerido")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones/${editingMedication.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formData.label.trim() || null,
          description: formData.description.trim() || null,
          dose: formData.dose.trim() || null,
          freq: formData.freq.trim() || null,
          route: formData.route.trim() || null,
          startAt: formData.startAt || null,
          endAt: formData.endAt || null,
        }),
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        let errorMessage = "Error al actualizar medicamento"
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await res.json()
            if (error.error) {
              errorMessage = error.error
            } else if (error.message) {
              errorMessage = error.message
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError)
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        } else {
          try {
            const text = await res.text()
            errorMessage = text || `Error ${res.status}: ${res.statusText}`
          } catch {
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      const contentType = res.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        await res.json()
      }

      toast.success("Medicamento actualizado correctamente")
      setEditOpen(false)
      setEditingMedication(null)
      setFormData({
        label: "",
        description: "",
        dose: "",
        freq: "",
        route: "",
        startAt: "",
        endAt: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error updating medication:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar medicamento"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeactivate = (med: MedicacionDTO) => {
    setDeactivatingMedication(med)
    setDeactivateOpen(true)
  }

  const handleDeactivateConfirm = async () => {
    if (!deactivatingMedication) return

    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones/${deactivatingMedication.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const contentType = res.headers.get("content-type")
        let errorMessage = "Error al desactivar medicamento"
        
        if (contentType && contentType.includes("application/json")) {
          try {
            const error = await res.json()
            if (error.error) {
              errorMessage = error.error
            } else if (error.message) {
              errorMessage = error.message
            }
          } catch (parseError) {
            console.error("Error parsing error response:", parseError)
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        } else {
          try {
            const text = await res.text()
            errorMessage = text || `Error ${res.status}: ${res.statusText}`
          } catch {
            errorMessage = `Error ${res.status}: ${res.statusText}`
          }
        }
        
        throw new Error(errorMessage)
      }

      toast.success("Medicamento desactivado correctamente")
      setDeactivateOpen(false)
      setDeactivatingMedication(null)
      onUpdate()
    } catch (error) {
      console.error("Error deactivating medication:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al desactivar medicamento"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Medicación</h3>
          {activeMedications.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {activeMedications.length} {activeMedications.length === 1 ? "medicamento activo" : "medicamentos activos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Prescribir Medicamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Prescribir Medicamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">
                    Medicamento <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Ej: Amoxicilina 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del medicamento..."
                    rows={4}
                    maxLength={1000}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/1000 caracteres
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dose">Dosis</Label>
                    <Input
                      id="dose"
                      value={formData.dose}
                      onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                      placeholder="Ej: 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freq">Frecuencia</Label>
                    <Input
                      id="freq"
                      value={formData.freq}
                      onChange={(e) => setFormData({ ...formData, freq: e.target.value })}
                      placeholder="Ej: Cada 8 horas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="route">Vía de administración</Label>
                    <Input
                      id="route"
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      placeholder="Ej: Oral, IV, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startAt">Fecha inicio</Label>
                    <Input
                      id="startAt"
                      type="date"
                      value={formData.startAt}
                      onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endAt">Fecha fin (opcional)</Label>
                    <Input
                      id="endAt"
                      type="date"
                      value={formData.endAt}
                      onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Prescribir"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Medicamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">
                Medicamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ej: Amoxicilina 500mg"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional del medicamento..."
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/1000 caracteres
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dose">Dosis</Label>
                <Input
                  id="edit-dose"
                  value={formData.dose}
                  onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
                  placeholder="Ej: 500mg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-freq">Frecuencia</Label>
                <Input
                  id="edit-freq"
                  value={formData.freq}
                  onChange={(e) => setFormData({ ...formData, freq: e.target.value })}
                  placeholder="Ej: Cada 8 horas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-route">Vía de administración</Label>
                <Input
                  id="edit-route"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="Ej: Oral, IV, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startAt">Fecha inicio</Label>
                <Input
                  id="edit-startAt"
                  type="date"
                  value={formData.startAt}
                  onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endAt">Fecha fin (opcional)</Label>
                <Input
                  id="edit-endAt"
                  type="date"
                  value={formData.endAt}
                  onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar medicamento?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de desactivar &quot;{deactivatingMedication?.label || "este medicamento"}&quot;? 
              El medicamento será marcado como inactivo pero se mantendrá en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirm}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Display medications */}
      {medicacionesList.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay medicación registrada</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience prescribiendo medicamentos al paciente"
                : "No hay información de medicación disponible"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {medicacionesList.map((med) => (
            <Card key={med.id} className={med.isActive ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      {med.label || "Medicamento sin especificar"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      {med.dose && <span>Dosis: {med.dose}</span>}
                      {med.freq && <span>Frecuencia: {med.freq}</span>}
                      {med.route && <span>Vía: {med.route}</span>}
                      {med.startAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Inicio: {formatDate(med.startAt, true)}
                        </span>
                      )}
                      {!med.isActive && med.endAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Fin: {formatDate(med.endAt, true)}
                        </span>
                      )}
                    </div>
                    {med.description && (
                      <p className="text-sm text-muted-foreground mt-2">{med.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {med.isActive && (
                      <Badge variant="default">Activo</Badge>
                    )}
                    {canEdit && med.isActive && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(med)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivate(med)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {med.createdBy && (
                    <p>Prescrito por: {med.createdBy.nombre}</p>
                  )}
                  {med.updatedBy && med.updatedAt && (
                    <p>Actualizado por: {med.updatedBy.nombre} el {formatDate(med.updatedAt, true)}</p>
                  )}
                  {med.discontinuedBy && med.discontinuedAt && (
                    <p>Desactivado por: {med.discontinuedBy.nombre} el {formatDate(med.discontinuedAt, true)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

