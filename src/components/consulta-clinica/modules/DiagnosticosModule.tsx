// src/components/consulta-clinica/modules/DiagnosticosModule.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Plus, ClipboardList, Trash2, Edit, CheckCircle2, Search, Clock, User } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, DiagnosticoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface DiagnosticosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

/**
 * Módulo de Diagnósticos Clínicos
 * 
 * Permite a los odontólogos agregar, editar y visualizar diagnósticos
 * de forma interactiva y optimizada según el modelo Prisma PatientDiagnosis.
 * 
 * Características:
 * - CRUD completo de diagnósticos
 * - Búsqueda y filtrado en tiempo real
 * - Gestión de estados (Activo, Resuelto, Descartado)
 * - Validaciones Zod en frontend y backend
 * - Auditoría completa (usuario y timestamp)
 * - Diseño responsivo y accesible
 */
export function DiagnosticosModule({ citaId, consulta, canEdit, onUpdate }: DiagnosticosModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DiagnosticoDTO | null>(null)
  const [label, setLabel] = useState("")
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<"ACTIVE" | "RESOLVED" | "RULED_OUT">("ACTIVE")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Debug: verificar permisos recibidos
  console.log("[DiagnosticosModule] Debug:", {
    citaId,
    canEdit,
    consultaStatus: consulta.status,
    diagnosticosCount: consulta.diagnosticos?.length || 0,
  })

  // Filtrar diagnósticos por búsqueda
  const filteredDiagnosticos = useMemo(() => {
    const diagnosticosList = consulta.diagnosticos || []
    if (diagnosticosList.length === 0) return []
    if (!searchQuery.trim()) return diagnosticosList

    const query = searchQuery.toLowerCase().trim()
    return diagnosticosList.filter(
      (d) =>
        d.label.toLowerCase().includes(query) ||
        d.code?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query) ||
        d.createdBy.nombre.toLowerCase().includes(query)
    )
  }, [consulta.diagnosticos, searchQuery])

  const resetForm = () => {
    setEditing(null)
    setLabel("")
    setCode("")
    setStatus("ACTIVE")
    setNotes("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación frontend
    if (!label.trim()) {
      toast.error("El diagnóstico es obligatorio")
      return
    }

    if (label.trim().length > 200) {
      toast.error("El diagnóstico no puede exceder 200 caracteres")
      return
    }

    if (code && code.trim().length > 50) {
      toast.error("El código no puede exceder 50 caracteres")
      return
    }

    if (notes && notes.trim().length > 1000) {
      toast.error("Las notas no pueden exceder 1000 caracteres")
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

      // Leer el cuerpo de la respuesta una sola vez
      const responseText = await res.text()
      
      if (!res.ok) {
        let errorData: { error?: string; message?: string } = {}
        try {
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          // Si no es JSON válido, usar el texto como mensaje
          console.error("[DiagnosticosModule] Failed to parse error response:", parseError)
          errorData = { error: responseText || `Error ${res.status}: ${res.statusText}` }
        }
        
        const errorMessage = errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`
        console.error("[DiagnosticosModule] API Error:", {
          status: res.status,
          statusText: res.statusText,
          errorData,
          responseText: responseText.substring(0, 200), // Limitar log a 200 caracteres
        })
        throw new Error(errorMessage)
      }

      // Parsear la respuesta exitosa
      const result = JSON.parse(responseText)
      if (!result.ok) {
        throw new Error(result.error || "Error al guardar diagnóstico")
      }

      toast.success(editing ? "Diagnóstico actualizado correctamente" : "Diagnóstico creado correctamente")
      setOpen(false)
      resetForm()
      onUpdate()
    } catch (error) {
      console.error("[DiagnosticosModule] Error saving diagnosis:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al guardar diagnóstico"
      toast.error(errorMessage)
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
    if (!confirm("¿Está seguro de eliminar este diagnóstico? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/diagnosticos/${id}`, {
        method: "DELETE",
      })

      // Leer el cuerpo de la respuesta una sola vez
      const responseText = await res.text()
      
      if (!res.ok) {
        let errorData: { error?: string; message?: string } = {}
        try {
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          // Si no es JSON válido, usar el texto como mensaje
          console.error("[DiagnosticosModule] Failed to parse error response:", parseError)
          errorData = { error: responseText || `Error ${res.status}: ${res.statusText}` }
        }
        
        const errorMessage = errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`
        console.error("[DiagnosticosModule] API Delete Error:", {
          status: res.status,
          statusText: res.statusText,
          errorData,
          responseText: responseText.substring(0, 200),
        })
        throw new Error(errorMessage)
      }

      // Parsear la respuesta exitosa
      const result = JSON.parse(responseText)
      if (!result.ok) {
        throw new Error(result.error || "Error al eliminar diagnóstico")
      }

      toast.success("Diagnóstico eliminado correctamente")
      onUpdate()
    } catch (error) {
      console.error("[DiagnosticosModule] Error deleting diagnosis:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar diagnóstico"
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-blue-500">Activo</Badge>
      case "RESOLVED":
        return <Badge variant="secondary" className="bg-emerald-500">Resuelto</Badge>
      case "RULED_OUT":
        return <Badge variant="outline" className="bg-gray-500">Descartado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const diagnosticosList = consulta.diagnosticos || []
  const hasDiagnosticos = diagnosticosList.length > 0
  const hasFilteredResults = filteredDiagnosticos.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Diagnósticos</h3>
          {hasDiagnosticos && (
            <p className="text-sm text-muted-foreground mt-1">
              {diagnosticosList.length} {diagnosticosList.length === 1 ? "diagnóstico" : "diagnósticos"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Diagnóstico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Diagnóstico" : "Nuevo Diagnóstico"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique el estado y las notas del diagnóstico. El diagnóstico en sí no puede modificarse."
                    : "Registre un nuevo diagnóstico para el paciente. Esta información quedará vinculada a la consulta actual."}
                </DialogDescription>
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
                        placeholder="Ej: Caries dental, Gingivitis, etc."
                        required
                        maxLength={200}
                      />
                      <p className="text-xs text-muted-foreground">{label.length}/200 caracteres</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Código <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                      <Input
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Ej: CIE-10 K02, ICD-10 K02.9"
                        maxLength={50}
                      />
                      <p className="text-xs text-muted-foreground">{code.length}/50 caracteres</p>
                    </div>
                  </>
                )}
                {editing && (
                  <div className="space-y-2">
                    <Label>Diagnóstico</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{editing.label}</p>
                      {editing.code && <p className="text-sm text-muted-foreground mt-1">Código: {editing.code}</p>}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={(v: "ACTIVE" | "RESOLVED" | "RULED_OUT") => setStatus(v)}>
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
                  <Label htmlFor="notes">
                    Notas <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales sobre el diagnóstico..."
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">{notes.length}/1000 caracteres</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || (!editing && !label.trim())}>
                    {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda */}
      {hasDiagnosticos && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por diagnóstico, código, notas o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Lista de diagnósticos */}
      {!hasDiagnosticos ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay diagnósticos registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? "Comience agregando el primer diagnóstico del paciente"
                : "No hay información de diagnósticos disponible"}
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
          {filteredDiagnosticos.map((diagnostico) => (
            <Card key={diagnostico.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <CardTitle className="text-base flex-1">{diagnostico.label}</CardTitle>
                      {getStatusBadge(diagnostico.status)}
                    </div>
                    {diagnostico.code && (
                      <p className="text-sm text-muted-foreground mb-2">Código: {diagnostico.code}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(diagnostico.notedAt, true)}</span>
                        <span className="text-xs">({formatRelativeTime(diagnostico.notedAt)})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{diagnostico.createdBy.nombre}</span>
                      </div>
                      {diagnostico.resolvedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>Resuelto: {formatDate(diagnostico.resolvedAt, true)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(diagnostico)}
                        className="h-8 w-8 p-0"
                        title="Editar diagnóstico"
                        disabled={isDeleting === diagnostico.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {diagnostico.status !== "RESOLVED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(diagnostico.id)}
                          disabled={isDeleting === diagnostico.id}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Eliminar diagnóstico"
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
                  <div className="prose prose-sm max-w-none">
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{diagnostico.notes}</p>
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
