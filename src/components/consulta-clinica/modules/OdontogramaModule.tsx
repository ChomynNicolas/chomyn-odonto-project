// src/components/consulta-clinica/modules/OdontogramaModule.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Save, RotateCcw, History } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"
import { OdontogramEditor } from "@/components/pacientes/odontograma/OdontogramEditor"
import { OdontogramHistory } from "@/components/pacientes/odontograma/OdontogramHistory"
import { entriesToToothRecords, toothRecordsToEntries } from "@/lib/utils/odontogram-helpers"
import type { ToothRecord, ToothCondition, OdontogramSnapshot } from "@/lib/types/patient"

interface OdontogramaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  hasConsulta?: boolean // Indica si la consulta ya fue iniciada (createdAt !== null)
  onUpdate: () => void
}

export function OdontogramaModule({ citaId, consulta, canEdit, onUpdate }: OdontogramaModuleProps) {
  const [teeth, setTeeth] = useState<ToothRecord[]>([])
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [historySnapshots, setHistorySnapshots] = useState<OdontogramSnapshot[]>([])

  // Cargar odontograma existente o inicializar
  useEffect(() => {
    if (consulta.odontograma) {
      const records = entriesToToothRecords(consulta.odontograma.entries)
      setTeeth(records)
      setNotes(consulta.odontograma.notes || "")
      setHasChanges(false)
    } else {
      // Inicializar con todos los dientes como INTACT
      const initialTeeth: ToothRecord[] = []
      for (let i = 11; i <= 18; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 21; i <= 28; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 31; i <= 38; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 41; i <= 48; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      setTeeth(initialTeeth)
      setNotes("")
      setHasChanges(false)
    }
  }, [consulta.odontograma])

  // Cargar historial
  useEffect(() => {
    if (showHistory) {
      // Obtener historial del paciente desde la API de pacientes
      // Por ahora usamos el snapshot actual como historial si existe
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
  }, [showHistory, consulta.odontograma])

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
    if (!canEdit) return

    try {
      setIsSaving(true)
      const entries = toothRecordsToEntries(teeth)

      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/odontograma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.trim() || null,
          entries,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar odontograma")
      }

      toast.success("Odontograma guardado exitosamente")
      setHasChanges(false)
      onUpdate()
    } catch (error) {
      console.error("Error saving odontogram:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar odontograma")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (consulta.odontograma) {
      const records = entriesToToothRecords(consulta.odontograma.entries)
      setTeeth(records)
      setNotes(consulta.odontograma.notes || "")
    } else {
      const initialTeeth: ToothRecord[] = []
      for (let i = 11; i <= 18; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 21; i <= 28; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 31; i <= 38; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      for (let i = 41; i <= 48; i++) initialTeeth.push({ toothNumber: String(i), condition: "INTACT" })
      setTeeth(initialTeeth)
      setNotes("")
    }
    setHasChanges(false)
    toast.info("Cambios descartados")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Odontograma</h3>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="h-4 w-4 mr-2" />
              Historial
            </Button>
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

      {/* Historial */}
      {showHistory && (
        <OdontogramHistory
          snapshots={historySnapshots}
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

      {/* Editor Visual */}
      {canEdit ? (
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
                {consulta.odontograma.notes && <p className="text-sm mb-4">{consulta.odontograma.notes}</p>}
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
                <p>No hay odontograma registrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
