"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"

/**
 * Lista de ciudades de Paraguay, priorizando las cercanas a Encarnación
 * Estructurado para permitir fácil expansión en el futuro
 */
const CIUDADES_PARAGUAY = [
  // Itapúa (cerca de Encarnación)
  "Encarnación",
  "Cambyretá",
  "Capitán Miranda",
  "Carlos Antonio López",
  "Carmen del Paraná",
  "Coronel Bogado",
  "Fram",
  "General Artigas",
  "General Delgado",
  "Hohenau",
  "Jesús",
  "José Leandro Oviedo",
  "La Paz",
  "Mayor Otaño",
  "Natalio",
  "Nueva Alborada",
  "Obligado",
  "Pirapó",
  "San Cosme y Damián",
  "San Pedro del Paraná",
  "San Rafael del Paraná",
  "Tomás Romero Pereira",
  "Trinidad",
  "Yatytay",
  
  // Otras ciudades importantes
  "Asunción",
  "Ciudad del Este",
  "San Lorenzo",
  "Luque",
  "Capiatá",
  "Lambaré",
  "Fernando de la Mora",
  "Limpio",
  "Ñemby",
  "Mariano Roque Alonso",
  "Itauguá",
  "Villa Elisa",
  "San Antonio",
  "Areguá",
  "Ypacaraí",
  "Villeta",
  "Guarambaré",
  "Itá",
  "Ypané",
  "Paraguarí",
  "Villarrica",
  "Caacupé",
  "Coronel Oviedo",
  "Villa Hayes",
  "Concepción",
  "Pedro Juan Caballero",
  "Pilar",
  "Pozo Colorado",
  "Filadelfia",
] as const

interface CiudadAutocompleteProps {
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  pais?: string // Código de país (ej: "PY", "AR", "BR")
}

export function CiudadAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = "Escribe tu ciudad y elige una sugerencia (si existe)",
  disabled = false,
  id,
  className,
  pais = "PY", // Por defecto Paraguay
}: CiudadAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")

  // Determinar si mostrar sugerencias (solo para Paraguay)
  const mostrarSugerencias = pais === "PY"

  // Sincronizar inputValue con value cuando cambia externamente
  React.useEffect(() => {
    setInputValue(value || "")
  }, [value])

  // Filtrar ciudades basado en el input (solo si es Paraguay)
  const filteredCities = React.useMemo(() => {
    if (!mostrarSugerencias) {
      return []
    }
    if (!inputValue.trim()) {
      return CIUDADES_PARAGUAY.slice(0, 10) // Mostrar primeras 10 si no hay input
    }
    const searchLower = inputValue.toLowerCase().trim()
    return CIUDADES_PARAGUAY.filter((city) =>
      city.toLowerCase().includes(searchLower)
    )
  }, [inputValue, mostrarSugerencias])

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue)
    onChange(selectedValue)
    setOpen(false)
  }

  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue) // Permitir cualquier valor libre
    // Abrir popover solo si es Paraguay y hay sugerencias
    if (mostrarSugerencias && newValue.trim() && filteredCities.length > 0) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mostrarSugerencias && e.key === "ArrowDown" && filteredCities.length > 0) {
      setOpen(true)
      e.preventDefault()
    } else if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    } else if (mostrarSugerencias && e.key === "Enter" && filteredCities.length === 1) {
      // Si hay una sola sugerencia, seleccionarla
      handleSelect(filteredCities[0])
      e.preventDefault()
    }
  }

  // Placeholder dinámico según el país
  const dynamicPlaceholder = mostrarSugerencias
    ? placeholder
    : "Escribe el nombre de tu ciudad"

  return (
    <Popover open={open && mostrarSugerencias && filteredCities.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            id={id}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={() => {
              // Delay para permitir clicks en sugerencias
              setTimeout(() => {
                onBlur?.()
                setOpen(false)
              }, 200)
            }}
            onFocus={() => {
              if (mostrarSugerencias && inputValue.trim() && filteredCities.length > 0) {
                setOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={dynamicPlaceholder}
            className={cn("pr-10", className)}
            autoComplete="address-level2"
          />
          {mostrarSugerencias && (
            <ChevronsUpDown
              className={cn(
                "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none",
                open && "opacity-50"
              )}
            />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandEmpty>
              {inputValue.trim()
                ? `No se encontraron ciudades. Puedes escribir "${inputValue}" libremente.`
                : "Escribe para buscar ciudades..."}
            </CommandEmpty>
            {filteredCities.length > 0 && (
              <CommandGroup heading="Ciudades sugeridas">
                {filteredCities.slice(0, 10).map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => handleSelect(city)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        inputValue.toLowerCase() === city.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

