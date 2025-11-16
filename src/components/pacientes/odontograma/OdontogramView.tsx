"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Save, RotateCcw, History } from "lucide-react"
import { OdontogramEditor } from "./OdontogramEditor"
import { OdontogramHistory } from "./OdontogramHistory"
import type { ToothRecord, ToothCondition, OdontogramSnapshot } from "@/lib/types/patient"
import { toast } from "sonner"
import { usePatientContext } from "@/context/PatientDataContext"
import { entriesToToothRecords, toothRecordsToEntries } from "@/lib/utils/odontogram-helpers"

interface OdontogramViewProps {
  patientId: string
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

export function OdontogramView({ patientId }: OdontogramViewProps) {
  const { patient, isLoading, error, mutate } = usePatientContext()
  const [teeth, setTeeth] = useState<ToothRecord[]>(initializeTeeth())
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [historySnapshots, setHistorySnapshots] = useState<OdontogramSnapshot[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Load latest odontogram from patient context
  useEffect(() => {
    if (patient?.odontogramSnapshots && patient.odontogramSnapshots.length > 0) {
      const latest = patient.odontogramSnapshots[0]
      setTeeth(latest.teeth || initializeTeeth())
      setNotes(latest.notes || "")
      setHasChanges(false)
    } else {
      setTeeth(initializeTeeth())
      setNotes("")
      setHasChanges(false)
    }
  }, [patient])

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

  // Load history when showing history panel
  useEffect(() => {
    if (showHistory) {
      const fetchHistory = async () => {
        setIsLoadingHistory(true)
        try {
          const res = await fetch(`/api/pacientes/${patientId}/odontograma/historial`)
          if (res.ok) {
            const data = await res.json()
            if (data.ok && data.data) {
              // Import the DTO type for proper typing
              type ApiSnapshot = {
                id: number
                takenAt: string
                notes: string | null
                entries: Array<{
                  id: number
                  toothNumber: number
                  surface: string | null // API returns string, will be cast to DienteSuperficie
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
              // Fallback: use patient context snapshots
              setHistorySnapshots(patient?.odontogramSnapshots || [])
            }
          } else {
            // Fallback: use patient context snapshots
            setHistorySnapshots(patient?.odontogramSnapshots || [])
          }
        } catch (error) {
          console.error("Error fetching odontogram history:", error)
          // Fallback: use patient context snapshots
          setHistorySnapshots(patient?.odontogramSnapshots || [])
        } finally {
          setIsLoadingHistory(false)
        }
      }
      fetchHistory()
    } else {
      setHistorySnapshots([])
    }
  }, [showHistory, patientId, patient?.odontogramSnapshots])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const entries = toothRecordsToEntries(teeth)

      if (entries.length === 0) {
        toast.error("Debe registrar al menos un diente")
        return
      }

      const res = await fetch(`/api/pacientes/${patientId}/odontograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teeth,
          notes,
          takenAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error al guardar odontograma")
      }

      const result = await res.json()
      if (result.ok) {
        toast.success("Odontograma guardado exitosamente")
        setHasChanges(false)
        mutate() // Refresh patient data
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
    if (patient?.odontogramSnapshots && patient.odontogramSnapshots.length > 0) {
      const latest = patient.odontogramSnapshots[0]
      setTeeth(latest.teeth || initializeTeeth())
      setNotes(latest.notes || "")
    } else {
      setTeeth(initializeTeeth())
      setNotes("")
    }
    setHasChanges(false)
    toast.info("Cambios descartados")
  }

  if (isLoading) {
    return <OdontogramSkeleton />
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Error al cargar odontograma</h3>
              <p className="text-sm text-muted-foreground">
                {error?.message || "No se pudo cargar la información del paciente"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Odontograma</h1>
          <p className="text-muted-foreground">
            {patient.firstName} {patient.lastName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" />
            Historial
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* History Panel */}
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

      {/* Editor */}
      <OdontogramEditor
        teeth={teeth}
        notes={notes}
        onToothUpdate={handleToothUpdate}
        onNotesChange={(newNotes) => {
          setNotes(newNotes)
          setHasChanges(true)
        }}
      />
    </div>
  )
}

function OdontogramSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}
