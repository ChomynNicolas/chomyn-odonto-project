// src/components/consulta-clinica/modules/VitalesModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Plus, Activity, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate } from "@/lib/utils/patient-helpers"

interface VitalesModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean
  onUpdate: () => void
}

export function VitalesModule({ citaId, consulta, canEdit, hasConsulta, onUpdate }: VitalesModuleProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    heightCm: "",
    weightKg: "",
    bpSyst: "",
    bpDiast: "",
    heartRate: "",
    notes: "",
  })

  const vitalesList = consulta.vitales || []
  const hasVitales = vitalesList.length > 0
  const latestVitals = vitalesList[0] // Most recent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta primero")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/vitales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: formData.heightCm ? parseInt(formData.heightCm, 10) : null,
          weightKg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          bpSyst: formData.bpSyst ? parseInt(formData.bpSyst, 10) : null,
          bpDiast: formData.bpDiast ? parseInt(formData.bpDiast, 10) : null,
          heartRate: formData.heartRate ? parseInt(formData.heartRate, 10) : null,
          notes: formData.notes.trim() || null,
          measuredAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar signos vitales")
      }

      toast.success("Signos vitales registrados correctamente")
      setOpen(false)
      setFormData({
        heightCm: "",
        weightKg: "",
        bpSyst: "",
        bpDiast: "",
        heartRate: "",
        notes: "",
      })
      onUpdate()
    } catch (error) {
      console.error("Error saving vitals:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar signos vitales")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Signos Vitales</h3>
          {hasVitales && (
            <p className="text-sm text-muted-foreground mt-1">
              Última medición: {formatDate(latestVitals.measuredAt, true)}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Signos Vitales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Signos Vitales</DialogTitle>
                <DialogDescription>
                  Registre los signos vitales del paciente durante la consulta.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heightCm">Estatura (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      min="0"
                      value={formData.heightCm}
                      onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                      placeholder="Ej: 170"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">Peso (kg)</Label>
                    <Input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                      placeholder="Ej: 70.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpSyst">Presión Sistólica</Label>
                    <Input
                      id="bpSyst"
                      type="number"
                      min="0"
                      value={formData.bpSyst}
                      onChange={(e) => setFormData({ ...formData, bpSyst: e.target.value })}
                      placeholder="Ej: 120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpDiast">Presión Diastólica</Label>
                    <Input
                      id="bpDiast"
                      type="number"
                      min="0"
                      value={formData.bpDiast}
                      onChange={(e) => setFormData({ ...formData, bpDiast: e.target.value })}
                      placeholder="Ej: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heartRate">Frecuencia Cardíaca (bpm)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      min="0"
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                      placeholder="Ej: 72"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Observaciones adicionales..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Display vitals */}
      {!hasVitales ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay signos vitales registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience registrando los signos vitales del paciente"
                : "No hay información de signos vitales disponible"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vitalesList.map((vital) => (
            <Card key={vital.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(vital.measuredAt, true)}
                    </CardTitle>
                    <CardDescription>
                      Registrado por: {vital.createdBy.nombre}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {vital.heightCm && (
                    <div>
                      <p className="text-sm text-muted-foreground">Estatura</p>
                      <p className="font-medium">{vital.heightCm} cm</p>
                    </div>
                  )}
                  {vital.weightKg && (
                    <div>
                      <p className="text-sm text-muted-foreground">Peso</p>
                      <p className="font-medium">{vital.weightKg} kg</p>
                    </div>
                  )}
                  {vital.bmi && (
                    <div>
                      <p className="text-sm text-muted-foreground">IMC</p>
                      <p className="font-medium">{vital.bmi.toFixed(1)}</p>
                    </div>
                  )}
                  {vital.bpSyst && vital.bpDiast && (
                    <div>
                      <p className="text-sm text-muted-foreground">Presión Arterial</p>
                      <p className="font-medium">{vital.bpSyst}/{vital.bpDiast} mmHg</p>
                    </div>
                  )}
                  {vital.heartRate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Frecuencia Cardíaca</p>
                      <p className="font-medium">{vital.heartRate} bpm</p>
                    </div>
                  )}
                </div>
                {vital.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm whitespace-pre-wrap">{vital.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
