"use client"

import * as React from "react"
import { useAllergyCatalogs } from "@/hooks/useAllergyCatalog"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AllergyCatalogSelectorProps {
  value?: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Read-only selector component for selecting allergies from the catalog.
 * Used by ODONT role when assigning allergies to patients.
 * Only shows active allergies.
 */
export function AllergyCatalogSelector({
  value,
  onChange,
  placeholder = "Seleccionar alergia...",
  disabled = false,
}: AllergyCatalogSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Fetch active allergies only
  const { data, isLoading } = useAllergyCatalogs({
    page: 1,
    limit: 100,
    search: searchQuery || undefined,
    isActive: "true",
    sortBy: "name",
    sortOrder: "asc",
  })

  const allergies = data?.data || []
  const selectedAllergy = allergies.find((a) => a.idAllergyCatalog === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className="w-full justify-between"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedAllergy ? selectedAllergy.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar alergia..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            autoFocus
          />
          <CommandList>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            {!isLoading && allergies.length === 0 && (
              <CommandEmpty>No se encontraron alergias activas.</CommandEmpty>
            )}
            <CommandGroup>
              <ScrollArea className="max-h-72">
                {allergies.map((allergy) => (
                  <CommandItem
                    key={allergy.idAllergyCatalog}
                    value={String(allergy.idAllergyCatalog)}
                    onSelect={() => {
                      const newValue =
                        value === allergy.idAllergyCatalog ? null : allergy.idAllergyCatalog
                      onChange(newValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === allergy.idAllergyCatalog ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{allergy.name}</div>
                      {allergy.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {allergy.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

