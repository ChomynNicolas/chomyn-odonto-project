"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { searchUsuariosODONT } from "@/lib/api/admin/profesionales"
import type { UsuarioSearchResult } from "@/lib/api/admin/profesionales"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface UsuarioODONTSelectorProps {
  value: number | null
  onSelect: (userId: number, usuarioData?: { nombreApellido: string; email: string | null }) => void
  disabled?: boolean
}

export default function UsuarioODONTSelector({ onSelect, disabled }: UsuarioODONTSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<UsuarioSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioSearchResult | null>(null)

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const data = await searchUsuariosODONT(query, 20)
      setResults(data)
    } catch (error) {
      console.error("Error searching usuarios:", error)
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

  const handleSelect = (usuario: UsuarioSearchResult) => {
    if (usuario.yaVinculado) {
      return // No permitir seleccionar usuarios ya vinculados
    }
    setSelectedUsuario(usuario)
    onSelect(usuario.idUsuario, {
      nombreApellido: usuario.nombreApellido,
      email: usuario.email,
    })
    setOpen(false)
    setSearchQuery("")
  }

  const getDisplayText = () => {
    if (selectedUsuario) {
      return `${selectedUsuario.nombreApellido} (${selectedUsuario.usuario})`
    }
    return "Buscar usuario ODONT..."
  }

  return (
    <div className="space-y-2">
      <Label>Usuario ODONT</Label>
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
              placeholder="Buscar por nombre o usuario..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <CommandEmpty>No se encontraron usuarios ODONT</CommandEmpty>
              ) : (
                <CommandGroup>
                  {results.map((usuario) => (
                    <CommandItem
                      key={usuario.idUsuario}
                      value={`${usuario.nombreApellido} ${usuario.usuario}`}
                      onSelect={() => handleSelect(usuario)}
                      disabled={usuario.yaVinculado || !usuario.estaActivo}
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {usuario.nombreApellido} ({usuario.usuario})
                          </span>
                          {usuario.yaVinculado && (
                            <Badge variant="secondary" className="text-xs">
                              Ya vinculado
                            </Badge>
                          )}
                        </div>
                        {usuario.email && (
                          <span className="text-xs text-muted-foreground">{usuario.email}</span>
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
      {selectedUsuario?.yaVinculado && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Este usuario ya está vinculado a otro profesional</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

