// src/components/consulta-clinica/modules/PeriodontogramaModule.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Activity, Save, RotateCcw, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, PeriodontogramMeasureDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import type { PerioSite, PerioBleeding } from "@prisma/client"

interface PeriodontogramaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

interface MeasureForm {
  toothNumber: number
  site: PerioSite
  probingDepthMm: number | null
  bleeding: PerioBleeding | null
  plaque: boolean | null
  mobility: number | null
  furcation: number | null
}

export function PeriodontogramaModule({ citaId, consulta, canEdit, onUpdate }: PeriodontogramaModuleProps) {
  const [measures, setMeasures] = useState<PeriodontogramMeasureDTO[]>([])
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<MeasureForm>({
    toothNumber: 11,
    site: "DB",
    probingDepthMm: null,
    bleeding: null,
    plaque: null,
    mobility: null,
    furcation: null,
  })

  useEffect(() => {
    if (consulta.periodontograma) {
      setMeasures(consulta.periodontograma.measures)
      setNotes(consulta.periodontograma.notes || "")
      setHasChanges(false)
    } else {
      setMeasures([])
      setNotes("")
      setHasChanges(false)
    }
  }, [consulta.periodontograma])

  const handleAddMeasure = () => {
    const newMeasure: PeriodontogramMeasureDTO = {
      id: Date.now(), // Temporal ID
      toothNumber: formData.toothNumber,
      site: formData.site,
      probingDepthMm: formData.probingDepthMm,
      bleeding: formData.bleeding,
      plaque: formData.plaque,
      mobility: formData.mobility,
      furcation: formData.furcation,
    }
    setMeasures((prev) => [...prev, newMeasure])
    setFormData({
      toothNumber: 11,
      site: "DB",
      probingDepthMm: null,
      bleeding: null,
      plaque: null,
      mobility: null,
      furcation: null,
    })
    setHasChanges(true)
    setOpen(false)
  }

  const handleDeleteMeasure = (id: number) => {
    setMeasures((prev) => prev.filter((m) => m.id !== id))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!canEdit) return

    try {
      setIsSaving(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/periodontograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          measures: measures.map((m) => ({
            toothNumber: m.toothNumber,
            site: m.site,
            probingDepthMm: m.probingDepthMm,
            bleeding: m.bleeding,
            plaque: m.plaque,
            mobility: m.mobility,
            furcation: m.furcation,
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar periodontograma")
      }

      toast.success("Periodontograma guardado exitosamente")
      setHasChanges(false)
      onUpdate()
    } catch (error) {
      console.error("Error saving periodontogram:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar periodontograma")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (consulta.periodontograma) {
      setMeasures(consulta.periodontograma.measures)
      setNotes(consulta.periodontograma.notes || "")
    } else {
      setMeasures([])
      setNotes("")
    }
    setHasChanges(false)
    toast.info("Cambios descartados")
  }

  const getSiteLabel = (site: PerioSite): string => {
    const labels: Record<PerioSite, string> = {
      DB: "Disto-Bucal",
      B: "Bucal",
      MB: "Mesio-Bucal",
      DL: "Disto-Lingual",
      L: "Lingual",
      ML: "Mesio-Lingual",
    }
    return labels[site] || site
  }

  // Agrupar medidas por diente
  const measuresByTooth = measures.reduce((acc, m) => {
    if (!acc[m.toothNumber]) {
      acc[m.toothNumber] = []
    }
    acc[m.toothNumber].push(m)
    return acc
  }, {} as Record<number, PeriodontogramMeasureDTO[]>)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Periodontograma</h3>
        {canEdit && (
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Medida
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nueva Medida Periodontal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="toothNumber">Número de Diente</Label>
                    <Input
                      id="toothNumber"
                      type="number"
                      min="11"
                      max="48"
                      value={formData.toothNumber}
                      onChange={(e) => setFormData({ ...formData, toothNumber: Number.parseInt(e.target.value) || 11 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="site">Sitio</Label>
                    <Select value={formData.site} onValueChange={(v: PerioSite) => setFormData({ ...formData, site: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DB">Disto-Bucal</SelectItem>
                        <SelectItem value="B">Bucal</SelectItem>
                        <SelectItem value="MB">Mesio-Bucal</SelectItem>
                        <SelectItem value="DL">Disto-Lingual</SelectItem>
                        <SelectItem value="L">Lingual</SelectItem>
                        <SelectItem value="ML">Mesio-Lingual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probingDepth">Profundidad de Sondaje (mm)</Label>
                    <Input
                      id="probingDepth"
                      type="number"
                      min="0"
                      max="20"
                      value={formData.probingDepthMm ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, probingDepthMm: e.target.value ? Number.parseInt(e.target.value) : null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bleeding">Sangrado</Label>
                    <Select
                      value={formData.bleeding ?? ""}
                      onValueChange={(v: string) => setFormData({ ...formData, bleeding: v ? (v as PerioBleeding) : null })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin especificar</SelectItem>
                        <SelectItem value="NONE">No</SelectItem>
                        <SelectItem value="YES">Sí</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plaque">Placa</Label>
                    <Select
                      value={formData.plaque === null ? "" : formData.plaque ? "true" : "false"}
                      onValueChange={(v: string) =>
                        setFormData({ ...formData, plaque: v === "" ? null : v === "true" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin especificar</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Sí</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobility">Movilidad (0-3)</Label>
                    <Input
                      id="mobility"
                      type="number"
                      min="0"
                      max="3"
                      value={formData.mobility ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, mobility: e.target.value ? Number.parseInt(e.target.value) : null })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="furcation">Furcación (0-3)</Label>
                    <Input
                      id="furcation"
                      type="number"
                      min="0"
                      max="3"
                      value={formData.furcation ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, furcation: e.target.value ? Number.parseInt(e.target.value) : null })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddMeasure}>Agregar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </div>

      {/* Notas generales */}
      {canEdit && (
        <div className="space-y-2">
          <Label htmlFor="periodontogram-notes">Notas Generales</Label>
          <Textarea
            id="periodontogram-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
              setHasChanges(true)
            }}
            placeholder="Observaciones generales del periodontograma..."
            rows={3}
          />
        </div>
      )}

      {/* Lista de medidas */}
      {measures.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay medidas periodontales registradas</p>
            {canEdit && <p className="text-sm mt-2">Agregue medidas para comenzar</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(measuresByTooth)
            .sort(([a], [b]) => Number.parseInt(a) - Number.parseInt(b))
            .map(([toothNum, toothMeasures]) => (
              <Card key={toothNum}>
                <CardHeader>
                  <CardTitle className="text-base">Diente {toothNum}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {toothMeasures.map((measure) => (
                      <div key={measure.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getSiteLabel(measure.site)}</Badge>
                            {measure.probingDepthMm !== null && (
                              <span className="text-sm">
                                Sondaje: <strong>{measure.probingDepthMm}mm</strong>
                              </span>
                            )}
                            {measure.bleeding && (
                              <Badge variant={measure.bleeding === "YES" ? "destructive" : "secondary"}>
                                Sangrado: {measure.bleeding === "YES" ? "Sí" : "No"}
                              </Badge>
                            )}
                            {measure.plaque !== null && (
                              <Badge variant={measure.plaque ? "default" : "secondary"}>
                                Placa: {measure.plaque ? "Sí" : "No"}
                              </Badge>
                            )}
                            {measure.mobility !== null && (
                              <span className="text-sm">
                                Movilidad: <strong>{measure.mobility}</strong>
                              </span>
                            )}
                            {measure.furcation !== null && (
                              <span className="text-sm">
                                Furcación: <strong>{measure.furcation}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteMeasure(measure.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Vista de solo lectura cuando hay datos pero no se puede editar */}
      {!canEdit && consulta.periodontograma && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Periodontograma</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registrado: {new Date(consulta.periodontograma.takenAt).toLocaleString()} • Por:{" "}
              {consulta.periodontograma.createdBy.nombre}
            </p>
          </CardHeader>
          <CardContent>
            {consulta.periodontograma.notes && <p className="text-sm mb-4">{consulta.periodontograma.notes}</p>}
            <div className="text-sm text-muted-foreground">
              <p>Medidas registradas: {consulta.periodontograma.measures.length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
