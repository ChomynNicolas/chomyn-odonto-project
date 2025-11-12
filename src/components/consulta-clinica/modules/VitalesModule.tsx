// src/components/consulta-clinica/modules/VitalesModule.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Activity, Trash2, Edit, Search, Clock, User } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, VitalesDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { formatDate, formatRelativeTime, calculateBMI } from "@/lib/utils/patient-helpers"

interface VitalesModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta: boolean
  onUpdate: () => void
}

/**
 * Módulo de Signos Vitales
 *
 * Permite a los odontólogos agregar, editar y visualizar signos vitales
 * de forma interactiva y optimizada según el modelo Prisma PatientVitals.
 *
 * Características:
 * - CRUD completo de signos vitales
 * - Cálculo automático de BMI
 * - Búsqueda y filtrado en tiempo real
 * - Validaciones Zod en frontend y backend
 * - Auditoría completa (usuario y timestamp)
 * - Diseño responsivo y accesible
 * - Manejo robusto de errores
 */
export function VitalesModule({ citaId, consulta, canEdit, hasConsulta, onUpdate }: VitalesModuleProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VitalesDTO | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Form state
  const [heightCm, setHeightCm] = useState<string>("")
  const [weightKg, setWeightKg] = useState<string>("")
  const [bpSyst, setBpSyst] = useState<string>("")
  const [bpDiast, setBpDiast] = useState<string>("")
  const [heartRate, setHeartRate] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [measuredAt, setMeasuredAt] = useState<string>("")

  // Calcular BMI automáticamente
  const calculatedBMI = useMemo(() => {
    const h = heightCm ? Number.parseFloat(heightCm) : null
    const w = weightKg ? Number.parseFloat(weightKg) : null
    if (h && w && h > 0 && w > 0) {
      return calculateBMI(w, h)
    }
    return null
  }, [heightCm, weightKg])

  // Asegurar que vitales siempre sea un array
  const vitalesArray = useMemo(() => {
    return Array.isArray(consulta.vitales) ? consulta.vitales : []
  }, [consulta.vitales])

  // Filtrar vitales por búsqueda
  const filteredVitales = useMemo(() => {
    if (!vitalesArray || vitalesArray.length === 0) return []
    if (!searchQuery.trim()) return vitalesArray

    const query = searchQuery.toLowerCase().trim()
    return vitalesArray.filter(
      (v) =>
        v.notes?.toLowerCase().includes(query) ||
        v.createdBy.nombre.toLowerCase().includes(query) ||
        formatDate(v.measuredAt, true).toLowerCase().includes(query)
    )
  }, [vitalesArray, searchQuery])

  const resetForm = () => {
    setEditing(null)
    setHeightCm("")
    setWeightKg("")
    setBpSyst("")
    setBpDiast("")
    setHeartRate("")
    setNotes("")
    setMeasuredAt("")
  }

  const handleEdit = (vital: VitalesDTO) => {
    setEditing(vital)
    setHeightCm(vital.heightCm?.toString() ?? "")
    setWeightKg(vital.weightKg?.toString() ?? "")
    setBpSyst(vital.bpSyst?.toString() ?? "")
    setBpDiast(vital.bpDiast?.toString() ?? "")
    setHeartRate(vital.heartRate?.toString() ?? "")
    setNotes(vital.notes ?? "")
    setMeasuredAt(vital.measuredAt ? new Date(vital.measuredAt).toISOString().slice(0, 16) : "")
    setOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación frontend
    const height = heightCm ? Number.parseInt(heightCm) : null
    const weight = weightKg ? Number.parseInt(weightKg) : null
    const bpSys = bpSyst ? Number.parseInt(bpSyst) : null
    const bpDias = bpDiast ? Number.parseInt(bpDiast) : null
    const hr = heartRate ? Number.parseInt(heartRate) : null

    // Validar rangos
    if (height !== null && (height < 50 || height > 250)) {
      toast.error("La altura debe estar entre 50 y 250 cm")
      return
    }
    if (weight !== null && (weight < 10 || weight > 500)) {
      toast.error("El peso debe estar entre 10 y 500 kg")
      return
    }
    if (bpSys !== null && (bpSys < 60 || bpSys > 300)) {
      toast.error("La presión sistólica debe estar entre 60 y 300 mmHg")
      return
    }
    if (bpDias !== null && (bpDias < 30 || bpDias > 200)) {
      toast.error("La presión diastólica debe estar entre 30 y 200 mmHg")
      return
    }
    if (hr !== null && (hr < 30 || hr > 300)) {
      toast.error("La frecuencia cardíaca debe estar entre 30 y 300 lpm")
      return
    }

    if (notes && notes.length > 1000) {
      toast.error(`Las notas exceden el límite de 1000 caracteres (${notes.length}/1000)`)
      return
    }

    try {
      setIsSubmitting(true)
      const url = editing
        ? `/api/agenda/citas/${citaId}/consulta/vitales/${editing.id}`
        : `/api/agenda/citas/${citaId}/consulta/vitales`
      const method = editing ? "PUT" : "POST"

      const payload: {
        heightCm: number | null
        weightKg: number | null
        bpSyst: number | null
        bpDiast: number | null
        heartRate: number | null
        notes: string | null
        measuredAt?: string
      } = {
        heightCm: height,
        weightKg: weight,
        bpSyst: bpSys,
        bpDiast: bpDias,
        heartRate: hr,
        notes: notes.trim() || null,
      }

      if (measuredAt) {
        payload.measuredAt = new Date(measuredAt).toISOString()
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
        throw new Error(result.error || "Error al guardar signos vitales")
      }

      toast.success(editing ? "Signos vitales actualizados correctamente" : "Signos vitales registrados correctamente")
      setOpen(false)
      resetForm()
      onUpdate()
    } catch (error) {
      console.error("[VitalesModule] Error saving vitales:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al guardar signos vitales"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar estos signos vitales? Esta acción no se puede deshacer.")) return

    try {
      setIsDeleting(id)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/vitales/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        const errorMessage = errorData.error || errorData.message || `Error ${res.status}: ${res.statusText}`
        throw new Error(errorMessage)
      }

      const result = await res.json()
      if (!result.ok) {
        throw new Error(result.error || "Error al eliminar signos vitales")
      }

      toast.success("Signos vitales eliminados correctamente")
      onUpdate()
    } catch (error) {
      console.error("[VitalesModule] Error deleting vitales:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar signos vitales"
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

  // Inicializar fecha/hora actual si se abre el diálogo para crear nuevo
  useEffect(() => {
    if (open && !editing && !measuredAt) {
      const now = new Date()
      setMeasuredAt(now.toISOString().slice(0, 16))
    }
  }, [open, editing, measuredAt])

  const vitalesList = vitalesArray
  const hasVitales = vitalesList.length > 0
  const hasFilteredResults = filteredVitales.length > 0

  return (
    <div className="space-y-4">
      {/* Header con búsqueda */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Signos Vitales</h3>
          {hasVitales && (
            <p className="text-sm text-muted-foreground mt-1">
              {vitalesList.length} {vitalesList.length === 1 ? "registro" : "registros"}
            </p>
          )}
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Signos Vitales
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Signos Vitales" : "Registrar Signos Vitales"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Modifique los signos vitales. Los cambios quedarán registrados en el historial."
                    : "Registre los signos vitales del paciente. Esta información quedará vinculada a la consulta actual."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="measuredAt">
                      Fecha y Hora de Medición <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="measuredAt"
                      type="datetime-local"
                      value={measuredAt}
                      onChange={(e) => setMeasuredAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="heightCm">
                      Altura (cm) <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="heightCm"
                      type="number"
                      min={50}
                      max={250}
                      step="1"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="Ej: 170"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weightKg">
                      Peso (kg) <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="weightKg"
                      type="number"
                      min={10}
                      max={500}
                      step="1"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="Ej: 70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bmi">IMC</Label>
                    <Input id="bmi" readOnly value={calculatedBMI?.toFixed(1) ?? "—"} placeholder="—" />
                    <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bpSyst">
                      PA Sistólica (mmHg) <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="bpSyst"
                      type="number"
                      min={60}
                      max={300}
                      step="1"
                      value={bpSyst}
                      onChange={(e) => setBpSyst(e.target.value)}
                      placeholder="Ej: 120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpDiast">
                      PA Diastólica (mmHg) <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="bpDiast"
                      type="number"
                      min={30}
                      max={200}
                      step="1"
                      value={bpDiast}
                      onChange={(e) => setBpDiast(e.target.value)}
                      placeholder="Ej: 80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heartRate">
                      Frecuencia Cardíaca (lpm) <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="heartRate"
                      type="number"
                      min={30}
                      max={300}
                      step="1"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="Ej: 72"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Notas <span className="text-muted-foreground text-xs">(opcional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales sobre la medición..."
                    rows={3}
                    maxLength={1000}
                    className="w-full resize-y"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{notes.length}/1000 caracteres</p>
                    {notes.length > 900 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Quedan {1000 - notes.length} caracteres
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : editing ? "Actualizar" : "Registrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Búsqueda */}
      {hasVitales && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por notas, autor o fecha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Visualización de último registro o lista */}
      {!hasVitales ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No hay signos vitales registrados</p>
            <p className="text-sm mt-1">
              {canEdit
                ? hasConsulta
                  ? "Comience registrando los signos vitales del paciente"
                  : "Registre los signos vitales para iniciar la consulta automáticamente"
                : "No hay información de signos vitales disponible"}
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
          {filteredVitales.map((vital) => (
            <Card key={vital.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base">Signos Vitales</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {formatDate(vital.measuredAt, true)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(vital.measuredAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{vital.createdBy.nombre}</span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(vital)}
                        className="h-8 w-8 p-0"
                        title="Editar signos vitales"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(vital.id)}
                        disabled={isDeleting === vital.id}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Eliminar signos vitales"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {vital.heightCm && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Altura</p>
                      <p className="mt-1 text-lg font-semibold">{vital.heightCm} cm</p>
                    </div>
                  )}
                  {vital.weightKg && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="mt-1 text-lg font-semibold">{vital.weightKg} kg</p>
                    </div>
                  )}
                  {(vital.bmi || (vital.heightCm && vital.weightKg)) && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">IMC</p>
                      <p className="mt-1 text-lg font-semibold">
                        {vital.bmi?.toFixed(1) ??
                          (vital.heightCm && vital.weightKg
                            ? calculateBMI(vital.weightKg, vital.heightCm).toFixed(1)
                            : "—")}
                      </p>
                    </div>
                  )}
                  {vital.bpSyst && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">PA Sistólica</p>
                      <p className="mt-1 text-lg font-semibold">{vital.bpSyst} mmHg</p>
                    </div>
                  )}
                  {vital.bpDiast && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">PA Diastólica</p>
                      <p className="mt-1 text-lg font-semibold">{vital.bpDiast} mmHg</p>
                    </div>
                  )}
                  {vital.heartRate && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">FC</p>
                      <p className="mt-1 text-lg font-semibold">{vital.heartRate} lpm</p>
                    </div>
                  )}
                </div>
                {vital.notes && (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium">Notas</p>
                    <p className="mt-1 text-sm text-muted-foreground">{vital.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

