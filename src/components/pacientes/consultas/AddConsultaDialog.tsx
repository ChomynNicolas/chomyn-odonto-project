"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AddConsultaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: string
}

export function AddConsultaDialog({ open, onOpenChange, pacienteId }: AddConsultaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    reason: "",
    diagnosis: "",
    clinicalNotes: "",
    status: "DRAFT" as "DRAFT" | "FINAL",
  })
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/consultas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Error al crear consulta")

      toast("Consulta creada",{
        description: "La consulta se ha registrado correctamente",
      })

      onOpenChange(false)
      setFormData({ reason: "", diagnosis: "", clinicalNotes: "", status: "DRAFT" })
      window.location.reload() // Recargar para mostrar la nueva consulta
    } catch (error) {
      toast.error("Error",{
        description: error instanceof Error ? error.message : "Error al crear consulta",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Consulta</DialogTitle>
          <DialogDescription>Registra una nueva consulta para el paciente</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de consulta</Label>
            <Textarea
              id="reason"
              placeholder="Describe el motivo de la consulta..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico</Label>
            <Textarea
              id="diagnosis"
              placeholder="Diagnóstico clínico..."
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinicalNotes">Notas clínicas</Label>
            <Textarea
              id="clinicalNotes"
              placeholder="Observaciones adicionales..."
              value={formData.clinicalNotes}
              onChange={(e) => setFormData({ ...formData, clinicalNotes: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "DRAFT" | "FINAL") => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="FINAL">Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Consulta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
