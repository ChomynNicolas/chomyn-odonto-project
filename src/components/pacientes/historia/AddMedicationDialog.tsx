"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface AddMedicationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  onSuccess: () => void
}

export function AddMedicationDialog({ open, onOpenChange, patientId, onSuccess }: AddMedicationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    label: "",
    dose: "",
    freq: "",
    route: "ORAL",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/pacientes/${patientId}/medicacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isActive: true,
          startAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error("Error al agregar medicación")

      toast.success("Medicación agregada exitosamente")
      onSuccess()
      onOpenChange(false)
      setFormData({ label: "", dose: "", freq: "", route: "ORAL" })
    } catch {
      toast.error("Error al agregar medicación")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Medicación</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Medicamento *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Ej: Ibuprofeno"
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
                placeholder="Ej: 400mg"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Vía de Administración</Label>
            <Select value={formData.route} onValueChange={(value) => setFormData({ ...formData, route: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ORAL">Oral</SelectItem>
                <SelectItem value="TOPICAL">Tópica</SelectItem>
                <SelectItem value="INJECTION">Inyección</SelectItem>
                <SelectItem value="INHALATION">Inhalación</SelectItem>
                <SelectItem value="OTHER">Otra</SelectItem>
              </SelectContent>
            </Select>
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
