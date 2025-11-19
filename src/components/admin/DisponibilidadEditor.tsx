"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import type { Disponibilidad } from "@/app/api/profesionales/_schemas"

interface DisponibilidadEditorProps {
  value: Disponibilidad | null | undefined
  onChange: (disponibilidad: Disponibilidad) => void
}

const DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const

export default function DisponibilidadEditor({ value, onChange }: DisponibilidadEditorProps) {
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>(
    value || {
      weekly: {},
      exceptions: [],
      timezone: "America/Asuncion",
    }
  )

  const updateDisponibilidad = (newValue: Disponibilidad) => {
    setDisponibilidad(newValue)
    onChange(newValue)
  }

  const addTimeRange = (day: string) => {
    const newValue = {
      ...disponibilidad,
      weekly: {
        ...disponibilidad.weekly,
        [day]: [...(disponibilidad.weekly?.[day as keyof typeof disponibilidad.weekly] || []), { start: "09:00", end: "17:00" }],
      },
    }
    updateDisponibilidad(newValue)
  }

  const removeTimeRange = (day: string, index: number) => {
    const dayRanges = disponibilidad.weekly?.[day as keyof typeof disponibilidad.weekly] || []
    const newRanges = dayRanges.filter((_, i) => i !== index)
    const newValue = {
      ...disponibilidad,
      weekly: {
        ...disponibilidad.weekly,
        [day]: newRanges.length > 0 ? newRanges : undefined,
      },
    }
    updateDisponibilidad(newValue)
  }

  const updateTimeRange = (day: string, index: number, field: "start" | "end", time: string) => {
    const dayRanges = [...(disponibilidad.weekly?.[day as keyof typeof disponibilidad.weekly] || [])]
    dayRanges[index] = { ...dayRanges[index], [field]: time }
    const newValue = {
      ...disponibilidad,
      weekly: {
        ...disponibilidad.weekly,
        [day]: dayRanges,
      },
    }
    updateDisponibilidad(newValue)
  }

  return (
    <div className="space-y-4">
      <Label>Disponibilidad Semanal</Label>
      <div className="space-y-3 rounded-md border p-4">
        {DAYS.map((day) => {
          const ranges = disponibilidad.weekly?.[day.key as keyof typeof disponibilidad.weekly] || []
          return (
            <div key={day.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{day.label}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addTimeRange(day.key)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar horario
                </Button>
              </div>
              {ranges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No disponible</p>
              ) : (
                <div className="space-y-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={range.start}
                        onChange={(e) => updateTimeRange(day.key, index, "start", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm">-</span>
                      <Input
                        type="time"
                        value={range.end}
                        onChange={(e) => updateTimeRange(day.key, index, "end", e.target.value)}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeRange(day.key, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Nota: Las excepciones por fecha se pueden agregar después de crear el profesional.
      </p>
    </div>
  )
}

