// src/components/consulta-clinica/modules/anamnesis/components/AntecedentSelector.tsx
// Component for selecting antecedents with autocomplete

"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { type AntecedentCategory } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { toast } from "sonner"

interface AntecedentCatalogItem {
  idAntecedentCatalog: number
  code: string
  name: string
  category: AntecedentCategory
  description: string | null
  isActive: boolean
}

type AntecedentValue = {
  antecedentId?: number
  customName?: string
  customCategory?: AntecedentCategory
  notes?: string
  diagnosedAt?: string
  isActive: boolean
  resolvedAt?: string
}[]

interface AntecedentSelectorProps {
  value: AntecedentValue
  onChange: (value: AntecedentValue) => void
  disabled?: boolean
}

const CATEGORY_LABELS: Record<AntecedentCategory, string> = {
  CARDIOVASCULAR: "Cardiovascular",
  ENDOCRINE: "Endocrino",
  RESPIRATORY: "Respiratorio",
  GASTROINTESTINAL: "Gastrointestinal",
  NEUROLOGICAL: "Neurológico",
  SURGICAL_HISTORY: "Historial Quirúrgico",
  SMOKING: "Tabaquismo",
  ALCOHOL: "Alcohol",
  OTHER: "Otro",
}

export function AntecedentSelector({ value, onChange, disabled }: AntecedentSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [catalog, setCatalog] = useState<AntecedentCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customCategory, setCustomCategory] = useState<AntecedentCategory>("OTHER")

  useEffect(() => {
    if (open) {
      setIsLoading(true)
      fetch("/api/anamnesis/antecedents/catalog?activeOnly=true")
        .then((res) => res.json())
        .then((data) => {
          setCatalog(data.data?.items || [])
          setIsLoading(false)
        })
        .catch((error) => {
          console.error("Error loading catalog:", error)
          setIsLoading(false)
        })
    }
  }, [open])

  const handleAddFromCatalog = (item: AntecedentCatalogItem) => {
    if (value.some((v) => v.antecedentId === item.idAntecedentCatalog)) {
      toast.info("Este antecedente ya está agregado")
      return
    }
    onChange([
      ...value,
      {
        antecedentId: item.idAntecedentCatalog,
        isActive: true,
      },
    ])
    setOpen(false)
    setSearchQuery("")
  }

  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast.error("Ingrese un nombre para el antecedente")
      return
    }
    if (value.some((v) => v.customName === customName.trim())) {
      toast.info("Este antecedente ya está agregado")
      return
    }
    onChange([
      ...value,
      {
        customName: customName.trim(),
        customCategory: customCategory,
        isActive: true,
      },
    ])
    setCustomName("")
    setCustomCategory("OTHER")
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const filteredCatalog = catalog.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled} className="w-full justify-start">
              <Plus className="mr-2 h-4 w-4" />
              Agregar antecedente
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar antecedente..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No se encontraron antecedentes.</CommandEmpty>
                <CommandGroup heading="Del catálogo">
                  {filteredCatalog.map((item) => (
                    <CommandItem
                      key={item.idAntecedentCatalog}
                      onSelect={() => handleAddFromCatalog(item)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nombre personalizado"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          disabled={disabled}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              handleAddCustom()
            }
          }}
        />
        <select
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value as AntecedentCategory)}
          disabled={disabled}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <Button type="button" onClick={handleAddCustom} disabled={disabled || !customName.trim()}>
          Agregar
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => {
            const name = item.customName || catalog.find((c) => c.idAntecedentCatalog === item.antecedentId)?.name || "Desconocido"
            const category = item.customCategory || catalog.find((c) => c.idAntecedentCatalog === item.antecedentId)?.category
            return (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <span>{name}</span>
                {category && <span className="text-xs">({CATEGORY_LABELS[category]})</span>}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
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

