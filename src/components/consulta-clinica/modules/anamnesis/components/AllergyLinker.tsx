// src/components/consulta-clinica/modules/anamnesis/components/AllergyLinker.tsx
// Component for linking existing allergies to anamnesis

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { X, Plus, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface PatientAllergy {
  idPatientAllergy: number
  label: string | null
  allergyCatalog: { name: string } | null
  severity: "MILD" | "MODERATE" | "SEVERE"
  reaction: string | null
  isActive: boolean
}

interface AllergyLinkerProps {
  pacienteId: number
  value: number[] // Array of allergy IDs
  onChange: (value: number[]) => void
  disabled?: boolean
}

const SEVERITY_COLORS = {
  MILD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  MODERATE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  SEVERE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function AllergyLinker({ pacienteId, value, onChange, disabled }: AllergyLinkerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [allergies, setAllergies] = useState<PatientAllergy[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      fetch(`/api/pacientes/${pacienteId}/alergias`)
        .then((res) => res.json())
        .then((data) => {
          setAllergies(data.data || [])
          setIsLoading(false)
        })
        .catch((error) => {
          console.error("Error loading allergies:", error)
          setIsLoading(false)
        })
    }
  }, [open, pacienteId])

  const handleAdd = (allergyId: number) => {
    if (value.includes(allergyId)) {
      toast.info("Esta alergia ya está agregada")
      return
    }
    onChange([...value, allergyId])
    setOpen(false)
    setSearchQuery("")
  }

  const handleRemove = (allergyId: number) => {
    onChange(value.filter((id) => id !== allergyId))
  }

  const filteredAllergies = allergies.filter((all) => {
    const name = all.label || all.allergyCatalog?.name || ""
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const selectedAllergies = allergies.filter((all) => value.includes(all.idPatientAllergy))

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start">
              <Plus className="mr-2 h-4 w-4" />
              Vincular alergia existente
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar alergia..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isLoading ? (
                  <CommandEmpty>Cargando...</CommandEmpty>
                ) : filteredAllergies.length === 0 ? (
                  <CommandEmpty>No se encontraron alergias.</CommandEmpty>
                ) : (
                  <CommandGroup heading="Alergias del paciente">
                    {filteredAllergies.map((all) => (
                      <CommandItem
                        key={all.idPatientAllergy}
                        onSelect={() => handleAdd(all.idPatientAllergy)}
                        className="cursor-pointer"
                        disabled={value.includes(all.idPatientAllergy)}
                      >
                        <div className="flex flex-col">
                          <span>{all.label || all.allergyCatalog?.name || "Sin nombre"}</span>
                          {all.reaction && (
                            <span className="text-xs text-muted-foreground">{all.reaction}</span>
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
              <AlertTriangle className="mr-2 h-4 w-4" />
              Nueva
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nueva alergia</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Para crear una nueva alergia, vaya a la sección de Alergias del paciente.
            </p>
            <Button onClick={() => setShowCreateDialog(false)}>Cerrar</Button>
          </DialogContent>
        </Dialog>
      </div>

      {selectedAllergies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedAllergies.map((all) => {
            const name = all.label || all.allergyCatalog?.name || "Sin nombre"
            return (
              <Badge
                key={all.idPatientAllergy}
                variant="secondary"
                className={`flex items-center gap-1 ${SEVERITY_COLORS[all.severity]}`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>{name}</span>
                {all.reaction && <span className="text-xs">({all.reaction})</span>}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(all.idPatientAllergy)}
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

