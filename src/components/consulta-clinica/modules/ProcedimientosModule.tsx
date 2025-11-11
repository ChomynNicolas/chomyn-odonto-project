// src/components/consulta-clinica/modules/ProcedimientosModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Activity, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface ProcedimientosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function ProcedimientosModule({ citaId, consulta, canEdit, onUpdate }: ProcedimientosModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProcedimientoDTO | null>(null)
  const [serviceType, setServiceType] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [resultNotes, setResultNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/procedimientos/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/procedimientos`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                quantity: parseInt(quantity),
                resultNotes: resultNotes.trim() || null,
              }
            : {
                serviceType: serviceType.trim() || null,
                quantity: parseInt(quantity),
                resultNotes: resultNotes.trim() || null,
              }
        ),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar procedimiento")
      }

      toast.success(editing ? "Procedimiento actualizado" : "Procedimiento creado")
      setOpen(false)
      setEditing(null)
      setServiceType("")
      setQuantity("1")
      setResultNotes("")
      onUpdate()
    } catch (error) {
      console.error("Error saving procedure:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar procedimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este procedimiento?")) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/procedimientos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar procedimiento")

      toast.success("Procedimiento eliminado")
      onUpdate()
    } catch (error) {
      console.error("Error deleting procedure:", error)
      toast.error("Error al eliminar procedimiento")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Procedimientos Realizados</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              setEditing(null)
              setServiceType("")
              setQuantity("1")
              setResultNotes("")
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Procedimiento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Procedimiento" : "Nuevo Procedimiento"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editing && (
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Tipo de Procedimiento</Label>
                    <Input
                      id="serviceType"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      placeholder="Ej: Obturación, Limpieza, etc."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resultNotes">Notas del Resultado</Label>
                  <Textarea
                    id="resultNotes"
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    rows={4}
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

      {consulta.procedimientos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay procedimientos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consulta.procedimientos.map((proc) => (
            <Card key={proc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">
                      {proc.serviceType || "Procedimiento"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cantidad: {proc.quantity} • {new Date(proc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(proc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {proc.resultNotes && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{proc.resultNotes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

