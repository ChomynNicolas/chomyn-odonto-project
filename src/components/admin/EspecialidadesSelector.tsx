"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { EspecialidadListItem } from "@/app/api/especialidades/_service"

interface EspecialidadesSelectorProps {
  especialidades: EspecialidadListItem[]
  selectedIds: number[]
  onSelectionChange: (ids: number[]) => void
}

export default function EspecialidadesSelector({
  especialidades,
  selectedIds,
  onSelectionChange,
}: EspecialidadesSelectorProps) {
  const handleToggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-2">
      <Label>Especialidades</Label>
      <div className="grid grid-cols-2 gap-3 rounded-md border p-4">
        {especialidades.map((especialidad) => (
          <div key={especialidad.idEspecialidad} className="flex items-center space-x-2">
            <Checkbox
              id={`esp-${especialidad.idEspecialidad}`}
              checked={selectedIds.includes(especialidad.idEspecialidad)}
              onCheckedChange={() => handleToggle(especialidad.idEspecialidad)}
            />
            <Label
              htmlFor={`esp-${especialidad.idEspecialidad}`}
              className="text-sm font-normal cursor-pointer"
            >
              {especialidad.nombre}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

