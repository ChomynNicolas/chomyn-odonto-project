// src/components/consulta-clinica/modules/DiagnosticosModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, ClipboardList, Trash2, Edit, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, DiagnosticoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface DiagnosticosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function DiagnosticosModule({ citaId, consulta, canEdit, onUpdate }: DiagnosticosModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DiagnosticoDTO | null>(null)
  const [label, setLabel] = useState("")
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<"ACTIVE" | "RESOLVED" | "RULED_OUT">("ACTIVE")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) {
      toast.error("El diagnóstico es obligatorio")
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/diagnosticos/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/diagnosticos`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? {
                status,
                notes: notes.trim() || null,
              }
            : {
                label: label.trim(),
                code: code.trim() || null,
                status,
                notes: notes.trim() || null,
              }
        ),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar diagnóstico")
      }

      toast.success(editing ? "Diagnóstico actualizado" : "Diagnóstico creado")
      setOpen(false)
      setEditing(null)
      setLabel("")
      setCode("")
      setStatus("ACTIVE")
      setNotes("")
      onUpdate()
    } catch (error) {
      console.error("Error saving diagnosis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar diagnóstico")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (diagnostico: DiagnosticoDTO) => {
    setEditing(diagnostico)
    setLabel(diagnostico.label)
    setCode(diagnostico.code || "")
    setStatus(diagnostico.status)
    setNotes(diagnostico.notes || "")
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este diagnóstico?")) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/diagnosticos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar diagnóstico")

      toast.success("Diagnóstico eliminado")
      onUpdate()
    } catch (error) {
      console.error("Error deleting diagnosis:", error)
      toast.error("Error al eliminar diagnóstico")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">Activo</Badge>
      case "RESOLVED":
        return <Badge variant="secondary">Resuelto</Badge>
      case "RULED_OUT":
        return <Badge variant="outline">Descartado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Diagnósticos</h3>
        {canEdit && (
          <Dialog open={open} onOpenChange={(o) => {
            setOpen(o)
            if (!o) {
              setEditing(null)
              setLabel("")
              setCode("")
              setStatus("ACTIVE")
              setNotes("")
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Diagnóstico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Diagnóstico" : "Nuevo Diagnóstico"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editing && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="label">
                        Diagnóstico <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Ej: Caries dental"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Código (opcional)</Label>
                      <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Ej: CIE-10 K02"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="RESOLVED">Resuelto</SelectItem>
                      <SelectItem value="RULED_OUT">Descartado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
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

      {consulta.diagnosticos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay diagnósticos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consulta.diagnosticos.map((diagnostico) => (
            <Card key={diagnostico.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{diagnostico.label}</CardTitle>
                      {getStatusBadge(diagnostico.status)}
                    </div>
                    {diagnostico.code && (
                      <p className="text-sm text-muted-foreground mt-1">Código: {diagnostico.code}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(diagnostico.notedAt).toLocaleString()} • Por: {diagnostico.createdBy.nombre}
                      {diagnostico.resolvedAt && ` • Resuelto: ${new Date(diagnostico.resolvedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(diagnostico)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {diagnostico.status !== "RESOLVED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(diagnostico.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              {diagnostico.notes && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{diagnostico.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

