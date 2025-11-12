// src/components/consulta-clinica/modules/ProcedimientosModule.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Plus, Activity, Trash2, Edit, Search, Clock } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, ProcedimientoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface ProcedimientosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

/**
 * Módulo de Procedimientos Realizados
 * 
 * Permite a los odontólogos agregar, editar y visualizar procedimientos
 * realizados durante la consulta.
 */
export function ProcedimientosModule({ citaId, consulta, canEdit, onUpdate }: ProcedimientosModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ProcedimientoDTO | null>(null)
  const [serviceType, setServiceType] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [resultNotes, setResultNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Debug: verificar permisos recibidos
  console.log("[ProcedimientosModule] Debug:", {
    citaId,
    canEdit,
    consultaStatus: consulta.status,
    procedimientosCount: consulta.procedimientos?.length || 0,
  })

  // Filtrar procedimientos por búsqueda
  const filteredProcedimientos = useMemo(() => {
    const procedimientosList = consulta.procedimientos || []
    if (procedimientosList.length === 0) return []
    if (!searchQuery.trim()) return procedimientosList

    const query = searchQuery.toLowerCase().trim()
    return procedimientosList.filter(
      (p) =>
        p.serviceType?.toLowerCase().includes(query) ||
        p.resultNotes?.toLowerCase().includes(query) ||
        (p.toothNumber && String(p.toothNumber).includes(query))
    )
  }, [consulta.procedimientos, searchQuery])

  const resetForm = () => {
    setEditing(null)
    setServiceType("")
    setQuantity("1")
    setResultNotes("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación frontend
    const qty = parseInt(quantity)
    if (isNaN(qty) || qty < 1) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    if (resultNotes && resultNotes.trim().length > 2000) {
      toast.error("Las notas no pueden exceder 2000 caracteres")
      return
    }

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
                quantity: qty,
                resultNotes: resultNotes.trim() || null,
              }
            : {
                serviceType: serviceType.trim() || null,
                quantity: qty,
                resultNotes: resultNotes.trim() || null,
              }
        ),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar procedimiento")
      }

      toast.success(editing ? "Procedimiento actualizado correctamente" : "Procedimiento creado correctamente")
      setOpen(false)
      resetForm()
      onUpdate()
    } catch (error) {
      console.error("Error saving procedure:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar procedimiento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (procedimiento: ProcedimientoDTO) => {
    setEditing(procedimiento)
    setServiceType(procedimiento.serviceType || "")
    setQuantity(String(procedimiento.quantity))
    setResultNotes(procedimiento.resultNotes || "")
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este procedimiento? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/procedimientos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar procedimiento")
      }

      toast.success("Procedimiento eliminado correctamente")
      onUpdate()
    } catch (error) {
      console.error("Error deleting procedure:", error)
      toast.error(error instanceof Error ? error.message : "Error al eliminar procedimiento")
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDialogClose = (open: boolean) => {
    setOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const procedimientosList = consulta.procedimientos || []
  const hasProcedimientos = procedimientosList.length > 0
  const hasFilteredResults = filteredProcedimientos.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Procedimientos Realizados</h3>
          {hasProcedimientos && (
            <p className="text-sm text-muted-foreground mt-1">
              {procedimientosList.length} {procedimientosList.length === 1 ? "procedimiento" : "procedimientos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Procedimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Procedimiento" : "Nuevo Procedimiento"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique los detalles del procedimiento realizado."
                    : "Registre un nuevo procedimiento realizado durante la consulta."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editing && (
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">
                      Tipo de Procedimiento <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="serviceType"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      placeholder="Ej: Obturación, Limpieza, Endodoncia, etc."
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground">{serviceType.length}/200 caracteres</p>
                  </div>
                )}
                {editing && (
                  <div className="space-y-2">
                    <Label>Procedimiento</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{editing.serviceType || "Procedimiento sin especificar"}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Cantidad <span className="text-destructive">*</span>
                  </Label>
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
                  <Label htmlFor="resultNotes">
                    Notas del Resultado <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="resultNotes"
                    value={resultNotes}
                    onChange={(e) => setResultNotes(e.target.value)}
                    placeholder="Describa el resultado del procedimiento, observaciones, etc."
                    rows={6}
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground">{resultNotes.length}/2000 caracteres</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
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

      {/* Búsqueda */}
      {hasProcedimientos && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por tipo de procedimiento, notas o diente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Lista de procedimientos */}
      {!hasProcedimientos ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay procedimientos registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience agregando el primer procedimiento realizado"
                : "No hay información de procedimientos disponible"}
            </p>
          </CardContent>
        </Card>
      ) : !hasFilteredResults ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No se encontraron resultados</p>
            <p className="text-sm mt-1">Intente con otros términos de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProcedimientos.map((proc) => (
            <Card key={proc.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">
                      {proc.serviceType || "Procedimiento sin especificar"}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span>Cantidad: {proc.quantity}</span>
                      {proc.toothNumber && <span>Diente: {proc.toothNumber}</span>}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(proc.createdAt, true)}</span>
                        <span className="text-xs">({formatRelativeTime(proc.createdAt)})</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(proc)}
                        className="h-8 w-8 p-0"
                        title="Editar procedimiento"
                        disabled={isDeleting === proc.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(proc.id)}
                        disabled={isDeleting === proc.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Eliminar procedimiento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {proc.resultNotes && (
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{proc.resultNotes}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
