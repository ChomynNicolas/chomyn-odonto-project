"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface AddVitalSignsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  onSuccess: () => void
}

export function AddVitalSignsDialog({ open, onOpenChange, patientId, onSuccess }: AddVitalSignsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    heightCm: "",
    weightKg: "",
    bpSyst: "",
    bpDiast: "",
    heartRate: "",
    temperature: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        heightCm: formData.heightCm ? Number.parseFloat(formData.heightCm) : null,
        weightKg: formData.weightKg ? Number.parseFloat(formData.weightKg) : null,
        bpSyst: formData.bpSyst ? Number.parseInt(formData.bpSyst) : null,
        bpDiast: formData.bpDiast ? Number.parseInt(formData.bpDiast) : null,
        heartRate: formData.heartRate ? Number.parseInt(formData.heartRate) : null,
        temperature: formData.temperature ? Number.parseFloat(formData.temperature) : null,
        notes: formData.notes || null,
        measuredAt: new Date().toISOString(),
      }

      const res = await fetch(`/api/pacientes/${patientId}/vitales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Error al registrar signos vitales")

      toast.success("Signos vitales registrados exitosamente")
      onSuccess()
      onOpenChange(false)
      setFormData({
        heightCm: "",
        weightKg: "",
        bpSyst: "",
        bpDiast: "",
        heartRate: "",
        temperature: "",
        notes: "",
      })
    } catch {
      toast.error("Error al registrar signos vitales")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Registrar Signos Vitales</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heightCm">Altura (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                step="0.1"
                value={formData.heightCm}
                onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                placeholder="170"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightKg">Peso (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                step="0.1"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                placeholder="70"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bpSyst">Presión Sistólica (mmHg)</Label>
              <Input
                id="bpSyst"
                type="number"
                value={formData.bpSyst}
                onChange={(e) => setFormData({ ...formData, bpSyst: e.target.value })}
                placeholder="120"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpDiast">Presión Diastólica (mmHg)</Label>
              <Input
                id="bpDiast"
                type="number"
                value={formData.bpDiast}
                onChange={(e) => setFormData({ ...formData, bpDiast: e.target.value })}
                placeholder="80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heartRate">Frecuencia Cardíaca (bpm)</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                placeholder="72"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperatura (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="36.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
