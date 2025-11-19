// src/components/consulta-clinica/modules/anamnesis/components/AllergySelector.tsx
// Enhanced allergy selector with autocomplete, catalog search, and custom entry support

"use client"

import { useState, useCallback } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, AlertTriangle, Loader2 } from "lucide-react"
import { AutocompleteSearch, type SearchResult } from "./AutocompleteSearch"
import { AllergyEntryCard, type AllergyEntry } from "./AllergyEntryCard"
import type { AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AllergySelectorProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  pacienteId: number
  disabled?: boolean
}

interface CatalogAllergy {
  idAllergyCatalog: number
  name: string
  description: string | null
}

interface PatientAllergyItem {
  idPatientAllergy: number
  label: string | null
  allergyCatalog: { name: string } | null
  severity: "MILD" | "MODERATE" | "SEVERE"
  reaction: string | null
  isActive: boolean
}

export function AllergySelector({
  form,
  pacienteId,
  disabled = false,
}: AllergySelectorProps) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "allergies",
  })

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
  const [customForm, setCustomForm] = useState({
    label: "",
    severity: "MODERATE" as "MILD" | "MODERATE" | "SEVERE",
    reaction: "",
  })

  // Search catalog allergies
  const searchCatalog = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return []
      setIsLoadingCatalog(true)
      try {
        const res = await fetch(
          `/api/anamnesis/allergies/catalog?search=${encodeURIComponent(query)}&limit=20`
        )
        if (!res.ok) throw new Error("Error al buscar en catálogo")
        const data = await res.json()
        return (data.data as CatalogAllergy[]).map((item) => ({
          id: `catalog-${item.idAllergyCatalog}`,
          label: item.name,
          description: item.description || undefined,
          metadata: { catalogId: item.idAllergyCatalog, type: "catalog" },
        }))
      } catch (error) {
        console.error("Error searching catalog:", error)
        toast.error("Error al buscar en catálogo")
        return []
      } finally {
        setIsLoadingCatalog(false)
      }
    },
    []
  )

  // Search patient allergies
  const searchPatientAllergies = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return []
      setIsLoadingPatient(true)
      try {
        const res = await fetch(`/api/pacientes/${pacienteId}/alergias`)
        if (!res.ok) throw new Error("Error al buscar alergias del paciente")
        const data = await res.json()
        const allergies = (data.data as PatientAllergyItem[]) || []
        const queryLower = query.toLowerCase()
        const filtered = allergies
          .filter(
            (all) =>
              (all.label || all.allergyCatalog?.name || "")
                .toLowerCase()
                .includes(queryLower) && all.isActive
          )
          .slice(0, 10)
        return filtered.map((all) => ({
          id: `patient-${all.idPatientAllergy}`,
          label: all.label || all.allergyCatalog?.name || "Sin nombre",
          description: all.reaction || undefined,
          metadata: {
            allergyId: all.idPatientAllergy,
            type: "patient",
            severity: all.severity,
            reaction: all.reaction,
          },
        }))
      } catch (error) {
        console.error("Error searching patient allergies:", error)
        return []
      } finally {
        setIsLoadingPatient(false)
      }
    },
    [pacienteId]
  )

  // Combined search function
  const handleSearch = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      const [catalogResults, patientResults] = await Promise.all([
        searchCatalog(query),
        searchPatientAllergies(query),
      ])
      return [...patientResults, ...catalogResults]
    },
    [searchCatalog, searchPatientAllergies]
  )

  const handleSelect = (result: SearchResult) => {
    const metadata = result.metadata as {
      type: "catalog" | "patient"
      catalogId?: number
      allergyId?: number
      severity?: "MILD" | "MODERATE" | "SEVERE"
      reaction?: string | null
    }

    if (metadata.type === "patient" && metadata.allergyId) {
      // Link existing PatientAllergy
      append({
        allergyId: metadata.allergyId,
        severity: metadata.severity || "MODERATE",
        reaction: metadata.reaction || undefined,
        isActive: true,
      })
    } else if (metadata.type === "catalog" && metadata.catalogId) {
      // Create from catalog
      append({
        catalogId: metadata.catalogId,
        customLabel: result.label,
        severity: "MODERATE",
        isActive: true,
      })
    }
  }

  const handleCustomEntry = (query: string) => {
    setCustomForm({
      label: query,
      severity: "MODERATE",
      reaction: "",
    })
    setIsCustomDialogOpen(true)
  }

  const handleAddCustom = () => {
    if (!customForm.label.trim()) {
      toast.error("El nombre de la alergia es requerido")
      return
    }

    append({
      customLabel: customForm.label.trim(),
      severity: customForm.severity,
      reaction: customForm.reaction.trim() || undefined,
      isActive: true,
    })

    setIsCustomDialogOpen(false)
    setCustomForm({ label: "", severity: "MODERATE", reaction: "" })
    toast.success("Alergia personalizada agregada")
  }

  const handleUpdate = (index: number, entry: AllergyEntry) => {
    update(index, entry)
  }

  const handleRemove = (index: number) => {
    remove(index)
    toast.success("Alergia removida")
  }

  // Map form fields to AllergyEntry format for display
  const entries: AllergyEntry[] = fields.map((field, index) => {
    const value = form.watch(`allergies.${index}`)
    return {
      id: value.id,
      allergyId: value.allergyId,
      catalogId: value.catalogId,
      customLabel: value.customLabel,
      severity: value.severity || "MODERATE",
      reaction: value.reaction,
      notes: value.notes,
      isActive: value.isActive ?? true,
      // Include display field if available (from loaded anamnesis)
      label: value.label ?? undefined,
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <AutocompleteSearch
          items={[]}
          onSelect={handleSelect}
          onCustomEntry={handleCustomEntry}
          searchFn={handleSearch}
          isLoading={isLoadingCatalog || isLoadingPatient}
          disabled={disabled}
          placeholder="Buscar alergia existente o del catálogo..."
          emptyMessage="No se encontraron alergias. Use 'Agregar personalizada' para crear una nueva."
          showCustomOption={true}
          customOptionLabel="Agregar como alergia personalizada"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCustomDialogOpen(true)}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Personalizada
        </Button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-3">
          <Label>Alergias seleccionadas ({entries.length})</Label>
          {entries.map((entry, index) => (
            <AllergyEntryCard
              key={fields[index].id}
              entry={entry}
              onUpdate={(updated) => handleUpdate(index, updated)}
              onRemove={() => handleRemove(index)}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay alergias agregadas</p>
          <p className="text-xs mt-1">
            Use la búsqueda para agregar alergias existentes o del catálogo
          </p>
        </div>
      )}

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Alergia Personalizada</DialogTitle>
            <DialogDescription>
              Ingrese los detalles de una alergia que no está en el catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-label">
                Nombre de la alergia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-label"
                value={customForm.label}
                onChange={(e) =>
                  setCustomForm({ ...customForm, label: e.target.value })
                }
                placeholder="Ej: Alergia a medicamento específico"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-severity">Severidad</Label>
              <Select
                value={customForm.severity}
                onValueChange={(value) =>
                  setCustomForm({
                    ...customForm,
                    severity: value as "MILD" | "MODERATE" | "SEVERE",
                  })
                }
              >
                <SelectTrigger id="custom-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILD">Leve</SelectItem>
                  <SelectItem value="MODERATE">Moderada</SelectItem>
                  <SelectItem value="SEVERE">Severa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-reaction">Reacción</Label>
              <Input
                id="custom-reaction"
                value={customForm.reaction}
                onChange={(e) =>
                  setCustomForm({ ...customForm, reaction: e.target.value })
                }
                placeholder="Ej: Urticaria, dificultad respiratoria..."
                maxLength={500}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCustomDialogOpen(false)
                setCustomForm({ label: "", severity: "MODERATE", reaction: "" })
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddCustom} disabled={!customForm.label.trim()}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

