"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ToothEditor } from "./ToothEditor"
import type { ToothRecord, ToothCondition } from "@/lib/types/patient"
import { getToothConditionColor } from "@/lib/utils/patient-helpers"

interface OdontogramEditorProps {
  teeth: ToothRecord[]
  notes: string
  onToothUpdate: (toothNumber: string, condition: ToothCondition, surfaces?: string[], notes?: string) => void
  onNotesChange: (notes: string) => void
}

export function OdontogramEditor({ teeth, notes, onToothUpdate, onNotesChange }: OdontogramEditorProps) {
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null)

  const getToothData = (toothNumber: string): ToothRecord | undefined => {
    return teeth.find((t) => t.toothNumber === toothNumber)
  }

  const getConditionLabel = (condition: ToothCondition) => {
    const labels: Record<ToothCondition, string> = {
      INTACT: "Sano",
      CARIES: "Caries",
      FILLED: "Obturado",
      CROWN: "Corona",
      MISSING: "Ausente",
      IMPLANT: "Implante",
      ROOT_CANAL: "Endodoncia",
      FRACTURED: "Fracturado",
    }
    return labels[condition]
  }

  // Count teeth by condition
  const conditionCounts = teeth.reduce(
    (acc, tooth) => {
      if (tooth.condition !== "INTACT") {
        acc[tooth.condition] = (acc[tooth.condition] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main Editor */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Editor de Odontograma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upper Arch */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Arcada Superior</h3>
              <div className="grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(11 + i)
                  const tooth = getToothData(toothNumber)
                  return (
                    <button
                      key={toothNumber}
                      onClick={() => setSelectedTooth(toothNumber)}
                      className={`rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                        selectedTooth === toothNumber ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <div
                        className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                      />
                      <p className="text-center text-xs font-medium">{toothNumber}</p>
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(21 + i)
                  const tooth = getToothData(toothNumber)
                  return (
                    <button
                      key={toothNumber}
                      onClick={() => setSelectedTooth(toothNumber)}
                      className={`rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                        selectedTooth === toothNumber ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <div
                        className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                      />
                      <p className="text-center text-xs font-medium">{toothNumber}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Lower Arch */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Arcada Inferior</h3>
              <div className="grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(41 + i)
                  const tooth = getToothData(toothNumber)
                  return (
                    <button
                      key={toothNumber}
                      onClick={() => setSelectedTooth(toothNumber)}
                      className={`rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                        selectedTooth === toothNumber ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <div
                        className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                      />
                      <p className="text-center text-xs font-medium">{toothNumber}</p>
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, i) => {
                  const toothNumber = String(31 + i)
                  const tooth = getToothData(toothNumber)
                  return (
                    <button
                      key={toothNumber}
                      onClick={() => setSelectedTooth(toothNumber)}
                      className={`rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                        selectedTooth === toothNumber ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <div
                        className={`mb-2 h-16 w-full rounded ${getToothConditionColor(tooth?.condition || "INTACT")}`}
                      />
                      <p className="text-center text-xs font-medium">{toothNumber}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">Leyenda</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    "INTACT",
                    "CARIES",
                    "FILLED",
                    "CROWN",
                    "MISSING",
                    "IMPLANT",
                    "ROOT_CANAL",
                    "FRACTURED",
                  ] as ToothCondition[]
                ).map((condition) => (
                  <div key={condition} className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded ${getToothConditionColor(condition)}`} />
                    <span className="text-xs">{getConditionLabel(condition)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* General Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas Generales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Observaciones generales del odontograma..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Tooth Editor */}
        {selectedTooth && (
          <ToothEditor
            tooth={getToothData(selectedTooth)}
            toothNumber={selectedTooth}
            onUpdate={onToothUpdate}
            onClose={() => setSelectedTooth(null)}
          />
        )}

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Total de dientes</p>
              <p className="text-2xl font-bold">{teeth.length}</p>
            </div>
            {Object.keys(conditionCounts).length > 0 && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Condiciones</p>
                <div className="space-y-2">
                  {Object.entries(conditionCounts).map(([condition, count]) => (
                    <div key={condition} className="flex items-center justify-between">
                      <span className="text-sm">{getConditionLabel(condition as ToothCondition)}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
