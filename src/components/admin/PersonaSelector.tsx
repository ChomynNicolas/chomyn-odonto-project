"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Plus } from "lucide-react"
import { searchPersonas } from "@/lib/api/admin/profesionales"
import type { PersonaSearchResult } from "@/lib/api/admin/profesionales"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import PersonaCreateDialog from "./PersonaCreateDialog"

interface PersonaSelectorProps {
  value: number | null
  onSelect: (personaId: number) => void
  disabled?: boolean
  usuarioODONTData?: {
    nombreApellido: string
    email: string | null
  } | null
}

export default function PersonaSelector({
  value,
  onSelect,
  disabled,
  usuarioODONTData,
}: PersonaSelectorProps) {
  const [open, setOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<PersonaSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaSearchResult | null>(null)

  // Cargar persona cuando se proporciona un value inicial
  useEffect(() => {
    const loadPersona = async () => {
      if (value && !selectedPersona) {
        try {
          const response = await fetch(`/api/personas/${value}`)
          if (response.ok) {
            const result = await response.json()
            if (result.ok && result.data) {
              setSelectedPersona({
                idPersona: result.data.idPersona,
                nombres: result.data.nombres,
                apellidos: result.data.apellidos,
                segundoApellido: result.data.segundoApellido,
                documento: result.data.documento,
                email: result.data.email,
                telefono: result.data.telefono,
              })
            }
          }
        } catch (error) {
          console.error("Error loading persona:", error)
        }
      } else if (!value) {
        setSelectedPersona(null)
      }
    }

    loadPersona()
  }, [value, selectedPersona])

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const data = await searchPersonas(query, 20)
      setResults(data)
    } catch (error) {
      console.error("Error searching personas:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, performSearch])

  const handleSelect = (persona: PersonaSearchResult) => {
    setSelectedPersona(persona)
    onSelect(persona.idPersona)
    setOpen(false)
    setSearchQuery("")
  }

  const getDisplayText = () => {
    if (selectedPersona) {
      return `${selectedPersona.nombres} ${selectedPersona.apellidos}`
    }
    return "Buscar persona..."
  }

  const handleCreateSuccess = (personaId: number) => {
    onSelect(personaId)
    setCreateDialogOpen(false)
    // Recargar la búsqueda para mostrar la nueva persona
    if (searchQuery) {
      performSearch(searchQuery)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Persona</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear nueva
        </Button>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {getDisplayText()}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar por nombre o documento..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-2">No se encontraron personas</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOpen(false)
                        setCreateDialogOpen(true)
                      }}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crear nueva persona
                    </Button>
                  </div>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((persona) => (
                    <CommandItem
                      key={persona.idPersona}
                      value={`${persona.nombres} ${persona.apellidos}`}
                      onSelect={() => handleSelect(persona)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {persona.nombres} {persona.apellidos}
                        </span>
                        {persona.documento && (
                          <span className="text-xs text-muted-foreground">
                            {persona.documento.tipo}: {persona.documento.numero}
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
      <PersonaCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
        initialData={
          usuarioODONTData
            ? {
                nombreCompleto: usuarioODONTData.nombreApellido,
                email: usuarioODONTData.email,
              }
            : undefined
        }
      />
    </div>
  )
}

