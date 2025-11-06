"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface AddDiagnosisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  onSuccess: () => void
}

export function AddDiagnosisDialog({ open, onOpenChange, patientId, onSuccess }: AddDiagnosisDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    status: "ACTIVE",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/pacientes/${patientId}/diagnosticos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          notedAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error("Error al agregar diagnóstico")

      toast.success("Diagnóstico agregado exitosamente")
      onSuccess()
      onOpenChange(false)
      setFormData({ code: "", label: "", status: "ACTIVE", notes: "" })
    } catch (error) {
      toast.error("Error al agregar diagnóstico")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agregar Diagnóstico</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código (CIE-10)</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ej: K02.1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Diagnóstico *</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="Ej: Caries dental"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Activo</SelectItem>
                <SelectItem value="CHRONIC">Crónico</SelectItem>
                <SelectItem value="MONITORING">En Monitoreo</SelectItem>
                <SelectItem value="RESOLVED">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={3}
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
