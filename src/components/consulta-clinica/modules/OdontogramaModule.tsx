// src/components/consulta-clinica/modules/OdontogramaModule.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Save, RotateCcw, History, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { OdontogramEditor } from "@/components/pacientes/odontograma/OdontogramEditor"
import { OdontogramHistory } from "@/components/pacientes/odontograma/OdontogramHistory"
import { entriesToToothRecords, toothRecordsToEntries } from "@/lib/utils/odontogram-helpers"
import type { ToothRecord, ToothCondition, OdontogramSnapshot } from "@/lib/types/patient"
import { Skeleton } from "@/components/ui/skeleton"

interface OdontogramaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

/**
 * Initialize all teeth as INTACT
 */
function initializeTeeth(): ToothRecord[] {
  const initialTeeth: ToothRecord[] = []
  // Upper arch: 11-18, 21-28
  for (let i = 11; i <= 18; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
  for (let i = 21; i <= 28; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
  // Lower arch: 31-38, 41-48
  for (let i = 31; i <= 38; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
  for (let i = 41; i <= 48; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
  return initialTeeth
}

export function OdontogramaModule({ citaId, consulta, canEdit, hasConsulta, onUpdate }: OdontogramaModuleProps) {
  const [teeth, setTeeth] = useState<ToothRecord[]>(initializeTeeth())
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [historySnapshots, setHistorySnapshots] = useState<OdontogramSnapshot[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Cargar odontograma existente o inicializar
  useEffect(() => {
    if (consulta.odontograma) {
      try {
        const records = entriesToToothRecords(consulta.odontograma.entries)
        setTeeth(records)
        setNotes(consulta.odontograma.notes || "")
        setHasChanges(false)
      } catch (error) {
        console.error("Error loading odontogram:", error)
        toast.error("Error al cargar odontograma")
        setTeeth(initializeTeeth())
        setNotes("")
      }
    } else {
      // Inicializar con todos los dientes como INTACT
      setTeeth(initializeTeeth())
      setNotes("")
      setHasChanges(false)
    }
  }, [consulta.odontograma])

  // Cargar historial completo del paciente
  useEffect(() => {
    if (showHistory && consulta.pacienteId) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
          // Fetch all odontogram snapshots for this patient
          const res = await fetch(`/api/pacientes/${consulta.pacienteId}/odontograma/historial`)
          if (res.ok) {
            const data = await res.json()
            if (data.ok && data.data) {
              type ApiSnapshot = {
                id: number
                takenAt: string
                notes: string | null
                entries: Array<{
                  id: number
                  toothNumber: number
                  surface: string | null
                  condition: string
                  notes: string | null
                }>
              }
              const snapshots: OdontogramSnapshot[] = (data.data as ApiSnapshot[]).map((snapshot) => {
                // Convert entries to match OdontogramEntryDTO format
                const entries = snapshot.entries.map((e) => ({
                  id: e.id,
                  toothNumber: e.toothNumber,
                  surface: e.surface as import("@prisma/client").DienteSuperficie | null,
                  condition: e.condition as import("@prisma/client").ToothCondition,
                  notes: e.notes,
                }))
                return {
                  id: String(snapshot.id),
                  recordedAt: snapshot.takenAt,
                  teeth: entriesToToothRecords(entries),
                  notes: snapshot.notes || "",
                }
              })
              setHistorySnapshots(snapshots)
            } else {
              // Fallback: use current snapshot if available
              if (consulta.odontograma) {
                setHistorySnapshots([
                  {
                    id: String(consulta.odontograma.id),
                    recordedAt: consulta.odontograma.takenAt,
                    teeth: entriesToToothRecords(consulta.odontograma.entries),
                    notes: consulta.odontograma.notes || "",
                  },
                ])
              } else {
                setHistorySnapshots([])
              }
            }
          } else {
            // Fallback: use current snapshot if available
            if (consulta.odontograma) {
              setHistorySnapshots([
                {
                  id: String(consulta.odontograma.id),
                  recordedAt: consulta.odontograma.takenAt,
                  teeth: entriesToToothRecords(consulta.odontograma.entries),
                  notes: consulta.odontograma.notes || "",
                },
              ])
            } else {
              setHistorySnapshots([])
            }
          }
        } catch (error) {
          console.error("Error fetching odontogram history:", error)
          // Fallback: use current snapshot if available
          if (consulta.odontograma) {
            setHistorySnapshots([
              {
                id: String(consulta.odontograma.id),
                recordedAt: consulta.odontograma.takenAt,
                teeth: entriesToToothRecords(consulta.odontograma.entries),
                notes: consulta.odontograma.notes || "",
              },
            ])
          } else {
            setHistorySnapshots([])
          }
        } finally {
          setIsLoadingHistory(false)
        }
      }
      fetchHistory()
    } else if (!showHistory) {
      setHistorySnapshots([])
    }
  }, [showHistory, consulta.pacienteId, consulta.odontograma])

  const handleToothUpdate = (
    toothNumber: string,
    condition: ToothCondition,
    surfaces?: string[],
    toothNotes?: string,
  ) => {
    setTeeth((prev) =>
      prev.map((tooth) =>
        tooth.toothNumber === toothNumber ? { ...tooth, condition, surfaces, notes: toothNotes } : tooth,
      ),
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("No tiene permisos para editar el odontograma")
      return
    }

    if (!hasConsulta) {
      toast.error("Debe iniciar la consulta antes de guardar el odontograma")
      return
    }

    try {
      setIsSaving(true)
      
      // Convertir a entries (ya filtra automáticamente dientes INTACT sin información)
      const entries = toothRecordsToEntries(teeth)

      if (entries.length === 0) {
        toast.error("Debe registrar al menos un diente con información relevante (condición diferente a sano, superficies o notas)")
        return
      }

      // Preparar datos para enviar, asegurando que null se maneje correctamente
      const payload = {
        notes: notes.trim() || undefined,
        entries: entries.map((entry) => ({
          toothNumber: entry.toothNumber,
          surface: entry.surface ?? null,
          condition: entry.condition,
          notes: entry.notes ?? null,
        })),
      }

      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV === "development") {
        console.log("[OdontogramaModule] Sending payload:", JSON.stringify(payload, null, 2))
        console.log("[OdontogramaModule] Entries count:", entries.length)
      }

      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/odontograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al guardar odontograma")
      }

      const result = await res.json()
      if (result.ok) {
        toast.success("Odontograma guardado exitosamente")
        setHasChanges(false)
        onUpdate() // Refresh consulta data
      } else {
        throw new Error(result.error || "Error al guardar odontograma")
      }
    } catch (error) {
      console.error("Error saving odontogram:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar odontograma")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (consulta.odontograma) {
      try {
        const records = entriesToToothRecords(consulta.odontograma.entries)
        setTeeth(records)
        setNotes(consulta.odontograma.notes || "")
      } catch (error) {
        console.error("Error resetting odontogram:", error)
        setTeeth(initializeTeeth())
        setNotes("")
      }
    } else {
      setTeeth(initializeTeeth())
      setNotes("")
    }
    setHasChanges(false)
    toast.info("Cambios descartados")
  }

  // Show warning if consulta not started
  if (!hasConsulta && canEdit) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Debe iniciar la consulta antes de registrar el odontograma.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Odontograma</h3>
        {canEdit && hasConsulta && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4 mr-2" />
              Historial
            </Button>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges || !hasConsulta}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        )}
      </div>

      {/* Historial */}
      {showHistory && (
        <>
          {isLoadingHistory ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <OdontogramHistory
              snapshots={historySnapshots}
              onClose={() => setShowHistory(false)}
              onRestore={(snapshot) => {
                setTeeth(snapshot.teeth)
                setNotes(snapshot.notes || "")
                setHasChanges(true)
                setShowHistory(false)
                toast.info("Odontograma restaurado. Recuerde guardar los cambios.")
              }}
            />
          )}
        </>
      )}

      {/* Editor Visual */}
      {canEdit && hasConsulta ? (
        <OdontogramEditor
          teeth={teeth}
          notes={notes}
          onToothUpdate={handleToothUpdate}
          onNotesChange={(newNotes) => {
            setNotes(newNotes)
            setHasChanges(true)
          }}
        />
      ) : (
        // Vista de solo lectura
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odontograma</CardTitle>
            {consulta.odontograma && (
              <p className="text-sm text-muted-foreground">
                Registrado: {new Date(consulta.odontograma.takenAt).toLocaleString()} • Por:{" "}
                {consulta.odontograma.createdBy.nombre}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {consulta.odontograma ? (
              <>
                {consulta.odontograma.notes && (
                  <div className="mb-4 rounded-lg bg-muted p-3">
                    <p className="text-sm font-medium mb-1">Notas:</p>
                    <p className="text-sm">{consulta.odontograma.notes}</p>
                  </div>
                )}
                {/* Mostrar vista del odontograma */}
                <OdontogramEditor
                  teeth={entriesToToothRecords(consulta.odontograma.entries)}
                  notes={consulta.odontograma.notes || ""}
                  onToothUpdate={() => {}} // No-op en modo lectura
                  onNotesChange={() => {}} // No-op en modo lectura
                />
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay odontograma registrado para esta consulta</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
