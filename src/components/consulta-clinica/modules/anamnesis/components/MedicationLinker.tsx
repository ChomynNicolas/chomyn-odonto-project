// src/components/consulta-clinica/modules/anamnesis/components/MedicationLinker.tsx
// Component for linking existing medications to anamnesis

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Plus, Pill } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PatientMedication {
  idPatientMedication: number
  label: string | null
  medicationCatalog: { name: string } | null
  dose: string | null
  freq: string | null
  route: string | null
  isActive: boolean
}

interface MedicationLinkerProps {
  pacienteId: number
  value: number[] // Array of medication IDs
  onChange: (value: number[]) => void
  disabled?: boolean
}

export function MedicationLinker({ pacienteId, value, onChange, disabled }: MedicationLinkerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      fetch(`/api/pacientes/${pacienteId}/medicacion`)
        .then((res) => res.json())
        .then((data) => {
          setMedications(data.data || [])
          setIsLoading(false)
        })
        .catch((error) => {
          console.error("Error loading medications:", error)
          setIsLoading(false)
        })
    }
  }, [open, pacienteId])

  const handleAdd = (medicationId: number) => {
    if (value.includes(medicationId)) {
      toast.info("Esta medicación ya está agregada")
      return
    }
    onChange([...value, medicationId])
    setOpen(false)
    setSearchQuery("")
  }

  const handleRemove = (medicationId: number) => {
    onChange(value.filter((id) => id !== medicationId))
  }

  const filteredMedications = medications.filter((med) => {
    const name = med.label || med.medicationCatalog?.name || ""
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const selectedMedications = medications.filter((med) => value.includes(med.idPatientMedication))

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start">
              <Plus className="mr-2 h-4 w-4" />
              Vincular medicación existente
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar medicación..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <CommandEmpty>Cargando...</CommandEmpty>
                ) : filteredMedications.length === 0 ? (
                  <CommandEmpty>No se encontraron medicaciones.</CommandEmpty>
                ) : (
                  <CommandGroup heading="Medicaciones del paciente">
                    {filteredMedications.map((med) => (
                      <CommandItem
                        key={med.idPatientMedication}
                        onSelect={() => handleAdd(med.idPatientMedication)}
                        className="cursor-pointer"
                        disabled={value.includes(med.idPatientMedication)}
                      >
                        <div className="flex flex-col">
                          <span>{med.label || med.medicationCatalog?.name || "Sin nombre"}</span>
                          {med.dose && (
                            <span className="text-xs text-muted-foreground">
                              {med.dose} {med.freq && `- ${med.freq}`}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled}>
              <Pill className="mr-2 h-4 w-4" />
              Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nueva medicación</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Para crear una nueva medicación, vaya a la sección de Medicación del paciente.
            </p>
            <Button onClick={() => setShowCreateDialog(false)}>Cerrar</Button>
          </DialogContent>
        </Dialog>
      </div>

      {selectedMedications.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMedications.map((med) => {
            const name = med.label || med.medicationCatalog?.name || "Sin nombre"
            const details = [med.dose, med.freq].filter(Boolean).join(" - ")
            return (
              <Badge key={med.idPatientMedication} variant="secondary" className="flex items-center gap-1">
                <Pill className="h-3 w-3" />
                <span>{name}</span>
                {details && <span className="text-xs">({details})</span>}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(med.idPatientMedication)}
                    className="ml-1 rounded-full hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

