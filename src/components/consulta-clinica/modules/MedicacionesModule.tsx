// src/components/consulta-clinica/modules/MedicacionesModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Pill, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, MedicacionDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface MedicacionesModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function MedicacionesModule({ citaId, consulta, canEdit, onUpdate }: MedicacionesModuleProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [dose, setDose] = useState("")
  const [freq, setFreq] = useState("")
  const [route, setRoute] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || null,
          dose: dose.trim() || null,
          freq: freq.trim() || null,
          route: route.trim() || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar medicación")
      }

      toast.success("Indicación creada")
      setOpen(false)
      setLabel("")
      setDose("")
      setFreq("")
      setRoute("")
      onUpdate()
    } catch (error) {
      console.error("Error saving medication:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar indicación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de desactivar esta indicación?")) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al desactivar indicación")

      toast.success("Indicación desactivada")
      onUpdate()
    } catch (error) {
      console.error("Error deleting medication:", error)
      toast.error("Error al desactivar indicación")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Indicaciones y Recetas</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Indicación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Indicación</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Medicamento/Indicación</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ej: Ibuprofeno 400mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose">Dosis</Label>
                  <Input
                    id="dose"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="Ej: 400mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freq">Frecuencia</Label>
                  <Input
                    id="freq"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value)}
                    placeholder="Ej: Cada 8 horas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">Vía de Administración</Label>
                  <Input
                    id="route"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    placeholder="Ej: Oral"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {consulta.medicaciones.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay indicaciones registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consulta.medicaciones.map((med) => (
            <Card key={med.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{med.label || "Indicación"}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {med.dose && <p>Dosis: {med.dose}</p>}
                      {med.freq && <p>Frecuencia: {med.freq}</p>}
                      {med.route && <p>Vía: {med.route}</p>}
                      <p>Por: {med.createdBy.nombre}</p>
                    </div>
                  </div>
                  {canEdit && med.isActive && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(med.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

