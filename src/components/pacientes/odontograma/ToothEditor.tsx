"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { X } from "lucide-react"
import type { ToothRecord, ToothCondition } from "@/lib/types/patient"

interface ToothEditorProps {
  tooth?: ToothRecord
  toothNumber: string
  onUpdate: (toothNumber: string, condition: ToothCondition, surfaces?: string[], notes?: string) => void
  onClose: () => void
}

const SURFACES = ["Oclusal", "Mesial", "Distal", "Vestibular", "Lingual/Palatino"]

export function ToothEditor({ tooth, toothNumber, onUpdate, onClose }: ToothEditorProps) {
  const [condition, setCondition] = useState<ToothCondition>(tooth?.condition || "INTACT")
  const [surfaces, setSurfaces] = useState<string[]>(tooth?.surfaces || [])
  const [notes, setNotes] = useState(tooth?.notes || "")

  useEffect(() => {
    setCondition(tooth?.condition || "INTACT")
    setSurfaces(tooth?.surfaces || [])
    setNotes(tooth?.notes || "")
  }, [tooth, toothNumber])

  const handleSurfaceToggle = (surface: string) => {
    setSurfaces((prev) => (prev.includes(surface) ? prev.filter((s) => s !== surface) : [...prev, surface]))
  }

  const handleApply = () => {
    onUpdate(toothNumber, condition, surfaces.length > 0 ? surfaces : undefined, notes || undefined)
    onClose()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Diente {toothNumber}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="condition">Condición</Label>
          <Select value={condition} onValueChange={(value) => setCondition(value as ToothCondition)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTACT">Sano</SelectItem>
              <SelectItem value="CARIES">Caries</SelectItem>
              <SelectItem value="FILLED">Obturado</SelectItem>
              <SelectItem value="CROWN">Corona</SelectItem>
              <SelectItem value="MISSING">Ausente</SelectItem>
              <SelectItem value="IMPLANT">Implante</SelectItem>
              <SelectItem value="ROOT_CANAL">Endodoncia</SelectItem>
              <SelectItem value="BRIDGE">Puente</SelectItem>
              <SelectItem value="EXTRACTION_NEEDED">Extracción necesaria</SelectItem>
              <SelectItem value="FRACTURED">Fracturado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {condition !== "MISSING" && condition !== "IMPLANT" && condition !== "BRIDGE" && condition !== "EXTRACTION_NEEDED" && (
          <div className="space-y-2">
            <Label>Superficies Afectadas</Label>
            <div className="space-y-2">
              {SURFACES.map((surface) => (
                <div key={surface} className="flex items-center space-x-2">
                  <Checkbox
                    id={`surface-${surface}`}
                    checked={surfaces.includes(surface)}
                    onCheckedChange={() => handleSurfaceToggle(surface)}
                  />
                  <label
                    htmlFor={`surface-${surface}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {surface}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="tooth-notes">Notas</Label>
          <Textarea
            id="tooth-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones específicas..."
            rows={3}
          />
        </div>

        <Button onClick={handleApply} className="w-full">
          Aplicar
        </Button>
      </CardContent>
    </Card>
  )
}
