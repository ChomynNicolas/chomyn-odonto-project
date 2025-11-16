// src/components/consulta-clinica/modules/MedicacionModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pill, Calendar } from "lucide-react"
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
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
          label: formData.label.trim(),
          dose: formData.dose.trim() || null,
          freq: formData.freq.trim() || null,
          route: formData.route.trim() || null,
          startAt: formData.startAt || null,
          endAt: formData.endAt || null,
          isActive: true,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al prescribir medicamento")
      }

      toast.success("Medicamento prescrito correctamente")
      setOpen(false)
      setFormData({
        label: "",
        dose: "",
        freq: "",
        route: "",
        startAt: "",
        endAt: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error prescribing medication:", error)
      toast.error(error instanceof Error ? error.message : "Error al prescribir medicamento")
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
                  </div>
                  {med.isActive && (
                    <Badge variant="default">Activo</Badge>
                  )}
                </div>
              </CardHeader>
              {med.createdBy && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Prescrito por: {med.createdBy.nombre}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

