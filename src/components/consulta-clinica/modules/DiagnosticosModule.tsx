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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, ClipboardList, Trash2, Edit, CheckCircle2, Search, Clock, User, BookOpen, PenTool, X, AlertTriangle, ChevronDown, FileText, Activity } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, DiagnosticoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"
import { DiagnosisSelector } from "./diagnosticos/components/DiagnosisSelector"
import type { DiagnosisCatalogItem } from "@/app/api/diagnosis-catalog/_schemas"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface DiagnosticosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

interface DiagnosisHistoryResponse {
  diagnosis: {
    id: number
    label: string
    code: string | null
    status: string
    notedAt: string
    resolvedAt: string | null
    notes: string | null
  }
  statusHistory: Array<{
    id: number
    previousStatus: string | null
    newStatus: string
    reason: string | null
    changedAt: string
    changedBy: {
      id: number
      nombre: string
    }
    encounter: {
      citaId: number
      fecha: string
      profesional: string | null
    } | null
  }>
  encounters: Array<{
    citaId: number
    fecha: string
    profesional: string | null
    encounterNotes: string | null
    wasEvaluated: boolean
    wasManaged: boolean
    createdAt: string
  }>
  linkedProcedures: Array<{
    id: number
    citaId: number
    fecha: string
    profesional: string | null
    procedure: string
    toothNumber: number | null
    toothSurface: string | null
    quantity: number
    resultNotes: string | null
    createdAt: string
  }>
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
  const [status, setStatus] = useState<"ACTIVE" | "UNDER_FOLLOW_UP" | "RESOLVED" | "DISCARDED" | "RULED_OUT">("ACTIVE")
  const [reason, setReason] = useState("") // For DISCARDED status
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [diagnosisToChangeStatus, setDiagnosisToChangeStatus] = useState<DiagnosticoDTO | null>(null)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedDiagnosisForHistory, setSelectedDiagnosisForHistory] = useState<DiagnosticoDTO | null>(null)
  const [diagnosisHistory, setDiagnosisHistory] = useState<DiagnosisHistoryResponse | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const [inputMode, setInputMode] = useState<"catalog" | "manual">("catalog") // New: catalog or manual entry mode
  const [selectedCatalogDiagnosis, setSelectedCatalogDiagnosis] = useState<DiagnosisCatalogItem | null>(null)
  const [diagnosisId, setDiagnosisId] = useState<number | null>(null) // For catalog-based diagnoses

  // Debug: verificar permisos recibidos
  console.log("[DiagnosticosModule] Debug:", {
    citaId,
    canEdit,
    consultaStatus: consulta.status,
    diagnosticosCount: consulta.diagnosticos?.length || 0,
  })

  

  const resetForm = () => {
    setEditing(null)
    setLabel("")
    setCode("")
    setStatus("ACTIVE")
    setNotes("")
    setReason("")
    setInputMode("catalog")
    setSelectedCatalogDiagnosis(null)
    setDiagnosisId(null)
  }

  // Handle catalog diagnosis selection
  const handleCatalogSelect = (diagnosis: DiagnosisCatalogItem) => {
    setSelectedCatalogDiagnosis(diagnosis)
    setDiagnosisId(diagnosis.idDiagnosisCatalog)
    setLabel(diagnosis.name)
    setCode(diagnosis.code)
    // Optionally pre-fill description in notes if available
    if (diagnosis.description && !notes) {
      setNotes(diagnosis.description)
    }
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

    // Validate catalog selection if in catalog mode
    if (!editing && inputMode === "catalog" && !diagnosisId) {
      toast.error("Por favor seleccione un diagnóstico del catálogo o cambie a entrada manual")
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
                status: status === "RULED_OUT" ? "DISCARDED" : status, // Map RULED_OUT to DISCARDED
                reason: status === "DISCARDED" || status === "RULED_OUT" ? reason.trim() || null : null,
                notes: notes.trim() || null,
              }
            : {
                diagnosisId: inputMode === "catalog" ? diagnosisId : null,
                label: label.trim(),
                code: inputMode === "catalog" ? code.trim() || null : code.trim() || null,
                status: status === "RULED_OUT" ? "DISCARDED" : status, // Map RULED_OUT to DISCARDED
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
    setStatus(diagnostico.status === "RULED_OUT" ? "DISCARDED" : diagnostico.status)
    setNotes(diagnostico.notes || "")
    setReason("")
    // Set input mode based on whether diagnosis came from catalog
    setInputMode(diagnostico.diagnosisId ? "catalog" : "manual")
    setDiagnosisId(diagnostico.diagnosisId || null)
    setSelectedCatalogDiagnosis(null) // Will be loaded if needed
    setOpen(true)
  }

  const handleStatusChange = (diagnostico: DiagnosticoDTO) => {
    setDiagnosisToChangeStatus(diagnostico)
    setStatus(diagnostico.status === "RULED_OUT" ? "DISCARDED" : diagnostico.status)
    setReason("")
    setStatusChangeDialogOpen(true)
  }

  const handleStatusChangeSubmit = async () => {
    if (!diagnosisToChangeStatus) return

    if ((status === "DISCARDED" || status === "RULED_OUT") && !reason.trim()) {
      toast.error("La razón es obligatoria cuando se descarta un diagnóstico")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnosisToChangeStatus.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status === "RULED_OUT" ? "DISCARDED" : status,
          reason: status === "DISCARDED" || status === "RULED_OUT" ? reason.trim() || null : null,
          notes: diagnosisToChangeStatus.notes || null,
        }),
      })

      const responseText = await res.text()
      if (!res.ok) {
        let errorData: { error?: string; message?: string } = {}
        try {
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch {
          errorData = { error: responseText || `Error ${res.status}: ${res.statusText}` }
        }
        throw new Error(errorData.error || errorData.message || "Error al actualizar diagnóstico")
      }

      toast.success("Estado del diagnóstico actualizado correctamente")
      setStatusChangeDialogOpen(false)
      setDiagnosisToChangeStatus(null)
      onUpdate()
    } catch (error) {
      console.error("Error updating diagnosis status:", error)
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewHistory = async (diagnostico: DiagnosticoDTO) => {
    setSelectedDiagnosisForHistory(diagnostico)
    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/diagnosticos/${diagnostico.id}/history`)
      if (!res.ok) throw new Error("Error al cargar historial")
      const data = await res.json()
      if (data.ok) {
        setDiagnosisHistory(data.data)
        setHistoryDialogOpen(true)
      } else {
        throw new Error(data.error || "Error al cargar historial")
      }
    } catch (error) {
      console.error("Error loading diagnosis history:", error)
      toast.error("Error al cargar historial del diagnóstico")
    }
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
      case "UNDER_FOLLOW_UP":
        return <Badge variant="secondary" className="bg-amber-500">En Seguimiento</Badge>
      case "RESOLVED":
        return <Badge variant="secondary" className="bg-emerald-500">Resuelto</Badge>
      case "DISCARDED":
      case "RULED_OUT":
        return <Badge variant="outline" className="bg-gray-500">Descartado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Separate diagnoses into sections
  const diagnosesBySection = useMemo(() => {
    const diagnosticosList = consulta.diagnosticos || []
    const previous = diagnosticosList.filter(
      (d) => d.source === "previous_encounter" && (d.status === "ACTIVE" || d.status === "UNDER_FOLLOW_UP")
    )
    const current = diagnosticosList.filter((d) => d.source === "current_encounter")
    const history = diagnosticosList.filter(
      (d) => d.status === "RESOLVED" || d.status === "DISCARDED" || d.status === "RULED_OUT"
    )
    return { previous, current, history }
  }, [consulta.diagnosticos])

  // Filter each section
  const filteredPrevious = useMemo(() => {
    if (!searchQuery.trim()) return diagnosesBySection.previous
    const query = searchQuery.toLowerCase().trim()
    return diagnosesBySection.previous.filter(
      (d) =>
        d.label.toLowerCase().includes(query) ||
        d.code?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query)
    )
  }, [diagnosesBySection, searchQuery])

  const filteredCurrent = useMemo(() => {
    if (!searchQuery.trim()) return diagnosesBySection.current
    const query = searchQuery.toLowerCase().trim()
    return diagnosesBySection.current.filter(
      (d) =>
        d.label.toLowerCase().includes(query) ||
        d.code?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query)
    )
  }, [diagnosesBySection, searchQuery])

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return diagnosesBySection.history
    const query = searchQuery.toLowerCase().trim()
    return diagnosesBySection.history.filter(
      (d) =>
        d.label.toLowerCase().includes(query) ||
        d.code?.toLowerCase().includes(query) ||
        d.notes?.toLowerCase().includes(query)
    )
  }, [diagnosesBySection, searchQuery])

  const diagnosticosList = consulta.diagnosticos || []
  const hasDiagnosticos = diagnosticosList.length > 0
  const hasAnyFilteredResults = filteredPrevious.length > 0 || filteredCurrent.length > 0 || filteredHistory.length > 0

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
                    {/* Input Mode Toggle */}
                    <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "catalog" | "manual")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="catalog" className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          <span>Desde Catálogo</span>
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="flex items-center gap-2">
                          <PenTool className="h-4 w-4" />
                          <span>Entrada Manual</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="catalog" className="mt-4">
                        <div className="space-y-2">
                          <Label>
                            Seleccionar Diagnóstico del Catálogo <span className="text-destructive">*</span>
                          </Label>
                          <DiagnosisSelector
                            onSelect={handleCatalogSelect}
                            excludeIds={consulta.diagnosticos
                              .filter((d) => d.diagnosisId !== null)
                              .map((d) => d.diagnosisId!)}
                            showDescription={true}
                          />
                          {selectedCatalogDiagnosis && (
                            <div className="mt-2 p-3 rounded-md border bg-muted/50">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{selectedCatalogDiagnosis.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {selectedCatalogDiagnosis.code}
                                    </Badge>
                                    {selectedCatalogDiagnosis.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {selectedCatalogDiagnosis.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCatalogDiagnosis(null)
                                    setDiagnosisId(null)
                                    setLabel("")
                                    setCode("")
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="manual" className="mt-4">
                        <div className="space-y-4">
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
                            <Label htmlFor="code">
                              Código <span className="text-muted-foreground text-xs">(opcional)</span>
                            </Label>
                            <Input
                              id="code"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              placeholder="Ej: CIE-10 K02, ICD-10 K02.9"
                              maxLength={50}
                            />
                            <p className="text-xs text-muted-foreground">{code.length}/50 caracteres</p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
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
                  <Select value={status} onValueChange={(v: "ACTIVE" | "UNDER_FOLLOW_UP" | "RESOLVED" | "DISCARDED" | "RULED_OUT") => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="UNDER_FOLLOW_UP">En Seguimiento</SelectItem>
                      <SelectItem value="RESOLVED">Resuelto</SelectItem>
                      <SelectItem value="DISCARDED">Descartado</SelectItem>
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
                {(status === "DISCARDED" || status === "RULED_OUT") && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">
                      Razón del descarte <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Explique por qué se descarta este diagnóstico..."
                      rows={3}
                      maxLength={500}
                      required
                    />
                    <p className="text-xs text-muted-foreground">{reason.length}/500 caracteres</p>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (!editing &&
                        (!label.trim() || (inputMode === "catalog" && !diagnosisId)))
                    }
                  >
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
      ) : !hasAnyFilteredResults ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No se encontraron resultados</p>
            <p className="text-sm mt-1">Intente con otros términos de búsqueda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Diagnoses from Previous Encounters */}
          {filteredPrevious.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h4 className="font-semibold text-base">Diagnósticos Activos (Consultas Anteriores)</h4>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  {filteredPrevious.length}
                </Badge>
              </div>
              {filteredPrevious.map((diagnostico) => (
            <Card key={diagnostico.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <CardTitle className="text-base flex-1">{diagnostico.label}</CardTitle>
                      {getStatusBadge(diagnostico.status)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      {diagnostico.code && (
                        <Badge variant="outline" className="text-xs">
                          {diagnostico.code}
                        </Badge>
                      )}
                      {diagnostico.diagnosisId && (
                        <Badge variant="secondary" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Del Catálogo
                        </Badge>
                      )}
                    </div>
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
                        onClick={() => handleViewHistory(diagnostico)}
                        className="h-8 w-8 p-0"
                        title="Ver historial"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(diagnostico)}
                        className="h-8 w-8 p-0"
                        title="Cambiar estado"
                        disabled={isDeleting === diagnostico.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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

          {/* Current Encounter Diagnoses */}
          {filteredCurrent.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h4 className="font-semibold text-base">Diagnósticos de esta Consulta</h4>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  {filteredCurrent.length}
                </Badge>
              </div>
              {filteredCurrent.map((diagnostico) => (
                <Card key={diagnostico.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <CardTitle className="text-base flex-1">{diagnostico.label}</CardTitle>
                          {getStatusBadge(diagnostico.status)}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {diagnostico.code && (
                            <Badge variant="outline" className="text-xs">
                              {diagnostico.code}
                            </Badge>
                          )}
                          {diagnostico.diagnosisId && (
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Del Catálogo
                            </Badge>
                          )}
                        </div>
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
                          {diagnostico.linkedProceduresCount && diagnostico.linkedProceduresCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>{diagnostico.linkedProceduresCount} {diagnostico.linkedProceduresCount === 1 ? "procedimiento" : "procedimientos"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(diagnostico)}
                            className="h-8 w-8 p-0"
                            title="Ver historial"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
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

          {/* History Section (Collapsible) */}
          {filteredHistory.length > 0 && (
            <Collapsible defaultOpen={false}>
              <div className="space-y-3">
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold text-base">Historial (Resueltos/Descartados)</h4>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                    {filteredHistory.length}
                  </Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 mt-3">
                    {filteredHistory.map((diagnostico) => (
                      <Card key={diagnostico.id} className="hover:shadow-md transition-shadow opacity-75">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <CardTitle className="text-base flex-1">{diagnostico.label}</CardTitle>
                                {getStatusBadge(diagnostico.status)}
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                {diagnostico.code && (
                                  <Badge variant="outline" className="text-xs">
                                    {diagnostico.code}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(diagnostico.notedAt, true)}</span>
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
                                  onClick={() => handleViewHistory(diagnostico)}
                                  className="h-8 w-8 p-0"
                                  title="Ver historial completo"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
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
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      )}

      {/* Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado del Diagnóstico</DialogTitle>
            <DialogDescription>
              {diagnosisToChangeStatus && `Diagnóstico: ${diagnosisToChangeStatus.label}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="statusChange">Nuevo Estado</Label>
              <Select value={status} onValueChange={(v: "ACTIVE" | "UNDER_FOLLOW_UP" | "RESOLVED" | "DISCARDED" | "RULED_OUT") => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="UNDER_FOLLOW_UP">En Seguimiento</SelectItem>
                  <SelectItem value="RESOLVED">Resuelto</SelectItem>
                  <SelectItem value="DISCARDED">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(status === "DISCARDED" || status === "RULED_OUT") && (
              <div className="space-y-2">
                <Label htmlFor="reasonChange">
                  Razón del descarte <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reasonChange"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explique por qué se descarta este diagnóstico..."
                  rows={3}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground">{reason.length}/500 caracteres</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeDialogOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChangeSubmit} disabled={isSubmitting || ((status === "DISCARDED" || status === "RULED_OUT") && !reason.trim())}>
              {isSubmitting ? "Guardando..." : "Actualizar Estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial del Diagnóstico</DialogTitle>
            <DialogDescription>
              {selectedDiagnosisForHistory && `Diagnóstico: ${selectedDiagnosisForHistory.label}`}
            </DialogDescription>
          </DialogHeader>
          {diagnosisHistory && (
            <div className="space-y-6 py-4">
              <div>
                <h4 className="font-semibold mb-2">Información General</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Estado actual:</span> {getStatusBadge(diagnosisHistory.diagnosis.status)}</p>
                  <p><span className="font-medium">Creado:</span> {formatDate(diagnosisHistory.diagnosis.notedAt, true)}</p>
                  {diagnosisHistory.diagnosis.resolvedAt && (
                    <p><span className="font-medium">Resuelto:</span> {formatDate(diagnosisHistory.diagnosis.resolvedAt, true)}</p>
                  )}
                </div>
              </div>

              {diagnosisHistory.statusHistory && diagnosisHistory.statusHistory.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Historial de Cambios de Estado</h4>
                  <div className="space-y-2">
                    {diagnosisHistory.statusHistory.map((entry) => (
                      <Card key={entry.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {entry.previousStatus && (
                                  <>
                                    {getStatusBadge(entry.previousStatus)}
                                    <span className="text-muted-foreground">→</span>
                                  </>
                                )}
                                {getStatusBadge(entry.newStatus)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(entry.changedAt, true)} por {entry.changedBy.nombre}
                              </p>
                              {entry.reason && (
                                <p className="text-sm mt-2 italic">{entry.reason}</p>
                              )}
                              {entry.encounter && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Consulta: {formatDate(entry.encounter.fecha, true)}
                                  {entry.encounter.profesional && ` • ${entry.encounter.profesional}`}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {diagnosisHistory.linkedProcedures && diagnosisHistory.linkedProcedures.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Procedimientos Vinculados</h4>
                  <div className="space-y-2">
                    {diagnosisHistory.linkedProcedures.map((proc) => (
                      <Card key={proc.id}>
                        <CardContent className="pt-4">
                          <p className="font-medium">{proc.procedure}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(proc.fecha, true)}
                            {proc.profesional && ` • ${proc.profesional}`}
                          </p>
                          {proc.toothNumber && (
                            <p className="text-xs text-muted-foreground mt-1">Diente: {proc.toothNumber}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
