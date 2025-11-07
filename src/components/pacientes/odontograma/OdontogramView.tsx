"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Save, RotateCcw, History } from "lucide-react"
import { OdontogramEditor } from "./OdontogramEditor"
import { OdontogramHistory } from "./OdontogramHistory"
import type { ToothRecord, ToothCondition } from "@/lib/types/patient"
import { toast } from "sonner"
import { usePatientContext } from "@/context/PatientDataContext"

interface OdontogramViewProps {
  patientId: string
}

export function OdontogramView({ patientId }: OdontogramViewProps) {
  const { patient, isLoading, error, mutate } = usePatientContext()
  const [teeth, setTeeth] = useState<ToothRecord[]>([])
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (patient?.odontogramSnapshots && patient.odontogramSnapshots.length > 0) {
      const latest = patient.odontogramSnapshots[0]
      setTeeth(latest.teeth || [])
      setNotes(latest.notes || "")
    } else {
      // Initialize with all teeth as INTACT
      const initialTeeth: ToothRecord[] = []
      // Upper arch: 11-18, 21-28
      for (let i = 11; i <= 18; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 21; i <= 28; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      // Lower arch: 31-38, 41-48
      for (let i = 31; i <= 38; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 41; i <= 48; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      setTeeth(initialTeeth)
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${patientId}/odontograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teeth,
          notes,
          takenAt: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error("Error al guardar odontograma")

      toast.success("Odontograma guardado exitosamente")
      setHasChanges(false)
      mutate()
    } catch (error) {
      toast.error("Error al guardar odontograma")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (patient?.odontogramSnapshots && patient.odontogramSnapshots.length > 0) {
      const latest = patient.odontogramSnapshots[0]
      setTeeth(latest.teeth || [])
      setNotes(latest.notes || "")
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
        <OdontogramHistory
          snapshots={patient.odontogramSnapshots || []}
          onClose={() => setShowHistory(false)}
          onRestore={(snapshot) => {
            setTeeth(snapshot.teeth)
            setNotes(snapshot.notes || "")
            setHasChanges(true)
            setShowHistory(false)
            toast.info("Odontograma restaurado")
          }}
        />
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
