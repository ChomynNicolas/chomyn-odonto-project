// src/components/consulta-clinica/modules/AnamnesisModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, FileText, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, AnamnesisDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface AnamnesisModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function AnamnesisModule({ citaId, consulta, canEdit, onUpdate }: AnamnesisModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AnamnesisDTO | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) {
      toast.error("Las notas son obligatorias")
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/anamnesis/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/anamnesis`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          notes: notes.trim(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      toast.success(editing ? "Anamnesis actualizada" : "Anamnesis creada")
      setOpen(false)
      setEditing(null)
      setTitle("")
      setNotes("")
      onUpdate()
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar anamnesis")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (anamnesis: AnamnesisDTO) => {
    setEditing(anamnesis)
    setTitle(anamnesis.title || "")
    setNotes(anamnesis.notes)
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta anamnesis?")) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/anamnesis/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar anamnesis")

      toast.success("Anamnesis eliminada")
      onUpdate()
    } catch (error) {
      console.error("Error deleting anamnesis:", error)
      toast.error("Error al eliminar anamnesis")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Anamnesis y Notas Clínicas</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              setEditing(null)
              setTitle("")
              setNotes("")
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Anamnesis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Anamnesis" : "Nueva Anamnesis"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título (opcional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Motivo de consulta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notas <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describa la anamnesis del paciente..."
                    rows={8}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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

      {consulta.anamnesis.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay anamnesis registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consulta.anamnesis.map((anamnesis) => (
            <Card key={anamnesis.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {anamnesis.title || "Anamnesis sin título"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(anamnesis.fecha).toLocaleString()} • Por: {anamnesis.createdBy.nombre}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(anamnesis)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(anamnesis.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{anamnesis.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

