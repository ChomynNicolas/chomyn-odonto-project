// src/components/consulta-clinica/modules/MedicacionesModule.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pill, Trash2, Edit, Search, Clock, User } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, MedicacionDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface MedicacionesModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

/**
 * Módulo de Indicaciones y Recetas
 * 
 * Permite a los odontólogos agregar, editar y visualizar indicaciones
 * y medicaciones prescritas al paciente.
 */
export function MedicacionesModule({ citaId, consulta, canEdit, onUpdate }: MedicacionesModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MedicacionDTO | null>(null)
  const [label, setLabel] = useState("")
  const [dose, setDose] = useState("")
  const [freq, setFreq] = useState("")
  const [route, setRoute] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Debug: verificar permisos recibidos
  console.log("[MedicacionesModule] Debug:", {
    citaId,
    canEdit,
    consultaStatus: consulta.status,
    medicacionesCount: consulta.medicaciones?.length || 0,
  })

  // Filtrar medicaciones por búsqueda
  const filteredMedicaciones = useMemo(() => {
    const medicacionesList = consulta.medicaciones || []
    if (medicacionesList.length === 0) return []
    if (!searchQuery.trim()) return medicacionesList

    const query = searchQuery.toLowerCase().trim()
    return medicacionesList.filter(
      (m) =>
        m.label?.toLowerCase().includes(query) ||
        m.dose?.toLowerCase().includes(query) ||
        m.freq?.toLowerCase().includes(query) ||
        m.route?.toLowerCase().includes(query) ||
        m.createdBy.nombre.toLowerCase().includes(query)
    )
  }, [consulta.medicaciones, searchQuery])

  const resetForm = () => {
    setEditing(null)
    setLabel("")
    setDose("")
    setFreq("")
    setRoute("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación frontend
    if (!label.trim()) {
      toast.error("El medicamento/indicación es obligatorio")
      return
    }

    if (label.trim().length > 200) {
      toast.error("El medicamento no puede exceder 200 caracteres")
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/medicaciones/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/medicaciones`
      const method = editing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
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
        throw new Error(error.error || "Error al guardar indicación")
      }

      toast.success(editing ? "Indicación actualizada correctamente" : "Indicación creada correctamente")
      setOpen(false)
      resetForm()
      onUpdate()
    } catch (error) {
      console.error("Error saving medication:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar indicación")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (medicacion: MedicacionDTO) => {
    setEditing(medicacion)
    setLabel(medicacion.label || "")
    setDose(medicacion.dose || "")
    setFreq(medicacion.freq || "")
    setRoute(medicacion.route || "")
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de desactivar esta indicación? El paciente ya no la verá como activa.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/medicaciones/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al desactivar indicación")
      }

      toast.success("Indicación desactivada correctamente")
      onUpdate()
    } catch (error) {
      console.error("Error deleting medication:", error)
      toast.error(error instanceof Error ? error.message : "Error al desactivar indicación")
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

  const medicacionesList = consulta.medicaciones || []
  const hasMedicaciones = medicacionesList.length > 0
  const hasFilteredResults = filteredMedicaciones.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Indicaciones y Recetas</h3>
          {hasMedicaciones && (
            <p className="text-sm text-muted-foreground mt-1">
              {medicacionesList.length} {medicacionesList.length === 1 ? "indicación" : "indicaciones"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Indicación
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Indicación" : "Nueva Indicación"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique los detalles de la indicación médica."
                    : "Registre una nueva indicación o receta para el paciente."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">
                    Medicamento/Indicación <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ej: Ibuprofeno 400mg, Amoxicilina 500mg, etc."
                    required
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">{label.length}/200 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dose">
                    Dosis <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="dose"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="Ej: 400mg, 500mg, 1 comprimido"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{dose.length}/100 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="freq">
                    Frecuencia <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="freq"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value)}
                    placeholder="Ej: Cada 8 horas, Cada 12 horas, 3 veces al día"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{freq.length}/100 caracteres</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">
                    Vía de Administración <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="route"
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    placeholder="Ej: Oral, Tópico, Intramuscular, etc."
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{route.length}/100 caracteres</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !label.trim()}>
                    {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda */}
      {hasMedicaciones && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por medicamento, dosis, frecuencia, vía o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Lista de medicaciones */}
      {!hasMedicaciones ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay indicaciones registradas</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience agregando la primera indicación o receta"
                : "No hay información de indicaciones disponible"}
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
          {filteredMedicaciones.map((med) => (
            <Card key={med.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <CardTitle className="text-base flex-1">{med.label || "Indicación sin especificar"}</CardTitle>
                      {med.isActive ? (
                        <Badge variant="default" className="bg-emerald-500">Activa</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-500">Inactiva</Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {med.dose && <p>Dosis: {med.dose}</p>}
                      {med.freq && <p>Frecuencia: {med.freq}</p>}
                      {med.route && <p>Vía: {med.route}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{med.createdBy.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(med.startAt || med.createdAt, true)}</span>
                          <span className="text-xs">({formatRelativeTime(med.startAt || med.createdAt)})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {canEdit && med.isActive && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(med)}
                        className="h-8 w-8 p-0"
                        title="Editar indicación"
                        disabled={isDeleting === med.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(med.id)}
                        disabled={isDeleting === med.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Desactivar indicación"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
