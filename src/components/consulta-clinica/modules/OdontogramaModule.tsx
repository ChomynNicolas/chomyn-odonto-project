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

interface OdontogramData {
  id: number
  takenAt: string
  notes: string | null
  createdBy: {
    id: number
    nombre: string
  }
  entries: Array<{
    id: number
    toothNumber: number
    surface: string | null
    condition: string
    notes: string | null
  }>
}

/**
 * Componente de solo lectura que muestra el último odontograma del paciente
 */
function ReadOnlyOdontogramView({ citaId }: { citaId: number }) {
  const [odontogramData, setOdontogramData] = useState<OdontogramData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadOdontogram = async () => {
      try {
        const response = await fetch(`/api/agenda/citas/${citaId}/consulta/odontograma`)
        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.data) {
            setOdontogramData(result.data)
          }
        }
      } catch (error) {
        console.error("Error loading odontogram for read-only view:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOdontogram()
  }, [citaId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Odontograma del Paciente</CardTitle>
        {odontogramData && (
          <p className="text-sm text-muted-foreground">
            Última actualización: {new Date(odontogramData.takenAt).toLocaleString()} • Por:{" "}
            {odontogramData.createdBy.nombre}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {odontogramData ? (
          <>
            {odontogramData.notes && (
              <div className="mb-4 rounded-lg bg-muted p-3">
                <p className="text-sm font-medium mb-1">Notas:</p>
                <p className="text-sm">{odontogramData.notes}</p>
              </div>
            )}
            {/* Mostrar vista del odontograma */}
            <OdontogramEditor
              teeth={entriesToToothRecords(odontogramData.entries.map(e => ({
                ...e,
                surface: e.surface as import("@prisma/client").DienteSuperficie | null,
                condition: e.condition as import("@prisma/client").ToothCondition,
              })))}
              notes={odontogramData.notes || ""}
              onToothUpdate={() => {}} // No-op en modo lectura
              onNotesChange={() => {}} // No-op en modo lectura
            />
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay odontograma registrado para este paciente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

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

  // Cargar odontograma del paciente (no específico de la consulta)
  useEffect(() => {
    const loadPatientOdontogram = async () => {
      if (!hasConsulta) return

      try {
        // CAMBIO CLAVE: Cargar el último odontograma del paciente desde la API de consulta
        const response = await fetch(`/api/agenda/citas/${citaId}/consulta/odontograma`)
        if (response.ok) {
          const result = await response.json()
          if (result.ok && result.data) {
            const records = entriesToToothRecords(result.data.entries)
            setTeeth(records)
            setNotes(result.data.notes || "")
            setHasChanges(false)
            return
          }
        }
        
        // Si no hay odontograma previo, inicializar con todos los dientes como INTACT
        setTeeth(initializeTeeth())
        setNotes("")
        setHasChanges(false)
      } catch (error) {
        console.error("Error loading patient odontogram:", error)
        toast.error("Error al cargar odontograma del paciente")
        // Fallback: inicializar con dientes INTACT
        setTeeth(initializeTeeth())
        setNotes("")
        setHasChanges(false)
      }
    }

    loadPatientOdontogram()
  }, [citaId, hasConsulta]) // Cambio: depende de citaId y hasConsulta, no de consulta.odontograma

  // Cargar historial completo del paciente
  useEffect(() => {
    if (showHistory && consulta.pacienteId) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
          // CAMBIO: Usar la nueva API de historial de paciente
          const res = await fetch(`/api/pacientes/${consulta.pacienteId}/odontograma/historial`)
          if (res.ok) {
            const data = await res.json()
            if (data.ok && data.data) {
              const snapshots: OdontogramSnapshot[] = data.data.snapshots.map((snapshot: OdontogramData) => {
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
              setHistorySnapshots([])
            }
          } else {
            console.warn("Failed to fetch odontogram history:", res.status)
            setHistorySnapshots([])
          }
        } catch (error) {
          console.error("Error fetching odontogram history:", error)
          setHistorySnapshots([])
        } finally {
          setIsLoadingHistory(false)
        }
      }
      fetchHistory()
    } else if (!showHistory) {
      setHistorySnapshots([])
    }
  }, [showHistory, consulta.pacienteId]) // Simplificado: solo depende de pacienteId

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

  const handleReset = async () => {
    try {
      // CAMBIO: Recargar el último odontograma del paciente desde la API
      const response = await fetch(`/api/agenda/citas/${citaId}/consulta/odontograma`)
      if (response.ok) {
        const result = await response.json()
        if (result.ok && result.data) {
          const records = entriesToToothRecords(result.data.entries)
          setTeeth(records)
          setNotes(result.data.notes || "")
          setHasChanges(false)
          toast.info("Cambios descartados, odontograma restaurado")
          return
        }
      }
      
      // Fallback: inicializar con dientes INTACT
      setTeeth(initializeTeeth())
      setNotes("")
      setHasChanges(false)
      toast.info("Cambios descartados")
    } catch (error) {
      console.error("Error resetting odontogram:", error)
      setTeeth(initializeTeeth())
      setNotes("")
      setHasChanges(false)
      toast.info("Cambios descartados")
    }
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
        // Vista de solo lectura - muestra el último odontograma del paciente
        <ReadOnlyOdontogramView citaId={citaId} />
      )}
    </div>
  )
}
