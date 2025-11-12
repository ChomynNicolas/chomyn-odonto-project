// src/components/consulta-clinica/modules/AnamnesisModule.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Trash2, Edit, Search, Clock, User } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, AnamnesisDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface AnamnesisModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

/**
 * Módulo de Anamnesis Clínica
 * 
 * Permite a los odontólogos agregar, editar y visualizar información de anamnesis
 * de forma interactiva y optimizada según el modelo Prisma ClinicalHistoryEntry.
 * 
 * Características:
 * - CRUD completo de anamnesis
 * - Búsqueda y filtrado en tiempo real
 * - Validaciones Zod en frontend y backend
 * - Auditoría completa (usuario y timestamp)
 * - Diseño responsivo y accesible
 * - Manejo robusto de errores
 * - Creación automática de consulta si no existe al crear primera anamnesis
 */
export function AnamnesisModule({ citaId, consulta, canEdit, hasConsulta, onUpdate }: AnamnesisModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AnamnesisDTO | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Asegurar que anamnesis siempre sea un array (usando useMemo para evitar warnings)
  const anamnesisArray = useMemo(() => {
    return Array.isArray(consulta.anamnesis) ? consulta.anamnesis : []
  }, [consulta.anamnesis])

  // Filtrar anamnesis por búsqueda
  const filteredAnamnesis = useMemo(() => {
    if (!anamnesisArray || anamnesisArray.length === 0) return []
    if (!searchQuery.trim()) return anamnesisArray

    const query = searchQuery.toLowerCase().trim()
    return anamnesisArray.filter(
      (a) =>
        a.title?.toLowerCase().includes(query) ||
        a.notes.toLowerCase().includes(query) ||
        a.createdBy.nombre.toLowerCase().includes(query)
    )
  }, [anamnesisArray, searchQuery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación frontend robusta
    const trimmedNotes = notes.trim()
    const trimmedTitle = title.trim()

    if (!trimmedNotes) {
      toast.error("Las notas son obligatorias")
      return
    }

    if (trimmedNotes.length > 5000) {
      toast.error(`Las notas exceden el límite de 5000 caracteres (${trimmedNotes.length}/5000)`)
      return
    }

    if (trimmedTitle && trimmedTitle.length > 200) {
      toast.error(`El título excede el límite de 200 caracteres (${trimmedTitle.length}/200)`)
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/anamnesis/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/anamnesis`
      const method = editing ? "PUT" : "POST"

      const payload = {
        title: trimmedTitle || null,
        notes: trimmedNotes,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        const errorMessage = errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`
        throw new Error(errorMessage)
      }

      const result = await res.json()
      if (!result.ok) {
        throw new Error(result.error || "Error al guardar anamnesis")
      }

      toast.success(editing ? "Anamnesis actualizada correctamente" : "Anamnesis creada correctamente")
      setOpen(false)
      resetForm()
      // Si no había consulta y se creó la primera anamnesis, la consulta se creó automáticamente
      // Recargar para obtener el estado actualizado
      onUpdate()
    } catch (error) {
      console.error("[AnamnesisModule] Error saving anamnesis:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al guardar anamnesis"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEditing(null)
    setTitle("")
    setNotes("")
  }

  const handleEdit = (anamnesis: AnamnesisDTO) => {
    setEditing(anamnesis)
    setTitle(anamnesis.title || "")
    setNotes(anamnesis.notes)
    setOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta anamnesis? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/anamnesis/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        const errorMessage = errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`
        throw new Error(errorMessage)
      }

      const result = await res.json()
      if (!result.ok) {
        throw new Error(result.error || "Error al eliminar anamnesis")
      }

      toast.success("Anamnesis eliminada correctamente")
      onUpdate()
    } catch (error) {
      console.error("[AnamnesisModule] Error deleting anamnesis:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar anamnesis"
      toast.error(errorMessage)
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

  const anamnesisList = anamnesisArray
  const hasAnamnesis = anamnesisList.length > 0
  const hasFilteredResults = filteredAnamnesis.length > 0

  // Debug: verificar datos recibidos
  console.log("[AnamnesisModule] Debug:", {
    citaId,
    hasConsulta,
    canEdit,
    anamnesisCount: anamnesisList.length,
    anamnesis: anamnesisList,
    consultaAnamnesis: consulta.anamnesis,
    anamnesisArray,
    isArray: Array.isArray(consulta.anamnesis),
  })

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Anamnesis y Notas Clínicas</h3>
          {hasAnamnesis && (
            <p className="text-sm text-muted-foreground mt-1">
              {anamnesisList.length} {anamnesisList.length === 1 ? "registro" : "registros"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Anamnesis
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Anamnesis" : "Nueva Anamnesis"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique la información de la anamnesis. Los cambios quedarán registrados en el historial."
                    : "Registre la anamnesis y notas clínicas del paciente. Esta información quedará vinculada a la consulta actual."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Título <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Motivo de consulta, Antecedentes médicos, etc."
                    maxLength={200}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{title.length}/200 caracteres</p>
                    {title.length > 180 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Quedan {200 - title.length} caracteres
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notas Clínicas <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describa la anamnesis del paciente, síntomas, antecedentes relevantes, motivo de consulta, etc."
                    rows={10}
                    required
                    maxLength={5000}
                    className="w-full resize-y min-h-[200px]"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {notes.length}/5000 caracteres
                    </p>
                    {notes.length > 4500 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Quedan {5000 - notes.length} caracteres
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !notes.trim()}>
                    {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda */}
      {hasAnamnesis && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por título, contenido o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Lista de anamnesis */}
      {!hasAnamnesis ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay anamnesis registradas</p>
            <p className="text-sm mt-1">
              {canEdit
                ? hasConsulta
                  ? "Comience agregando la primera anamnesis del paciente"
                  : "Agregue la primera anamnesis para iniciar la consulta automáticamente"
                : "No hay información de anamnesis disponible"}
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
          {filteredAnamnesis.map((anamnesis) => (
            <Card key={anamnesis.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <CardTitle className="text-base flex-1">
                        {anamnesis.title || (
                          <span className="text-muted-foreground italic">Anamnesis sin título</span>
                        )}
                      </CardTitle>
                      {!anamnesis.title && (
                        <Badge variant="outline" className="text-xs">
                          Sin título
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(anamnesis.fecha, true)}</span>
                        <span className="text-xs">({formatRelativeTime(anamnesis.fecha)})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{anamnesis.createdBy.nombre}</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(anamnesis)}
                        className="h-8 w-8 p-0"
                        title="Editar anamnesis"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(anamnesis.id)}
                        disabled={isDeleting === anamnesis.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Eliminar anamnesis"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {anamnesis.notes}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
