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
import { Plus, AlertTriangle } from "lucide-react"
import { AutocompleteSearch, type SearchResult } from "./AutocompleteSearch"
import { AllergyEntryCard, type AllergyEntry } from "./AllergyEntryCard"
import { AnamnesisCreateUpdateBodySchema, type AnamnesisAllergyLink } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface AllergySelectorProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
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
  allergyCatalog: {
    idAllergyCatalog: number
    name: string
    description: string | null
  } | null
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

  // Search catalog allergies (also loads all if query is empty)
  const searchCatalog = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      console.log("🔍 [AllergySelector] Searching catalog with query:", query)
      setIsLoadingCatalog(true)
      try {
        const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : ""
        const url = `/api/allergies?limit=20&isActive=true&sortBy=name&sortOrder=asc${searchParam}`
        console.log("🔍 [AllergySelector] Fetching from:", url)
        
        const res = await fetch(url)
        console.log("🔍 [AllergySelector] Response status:", res.status, res.ok)
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("❌ [AllergySelector] API error:", errorData)
          throw new Error(errorData.error || "Error al buscar en catálogo")
        }
        const data = await res.json()
        console.log("🔍 [AllergySelector] Response data:", data)
        
        if (!data.ok) {
          console.error("❌ [AllergySelector] Response not ok:", data.error)
          throw new Error(data.error || "Error al buscar en catálogo")
        }
        
        const results = (data.data as CatalogAllergy[]).map((item) => ({
          id: `catalog-${item.idAllergyCatalog}`,
          label: item.name,
          description: item.description || undefined,
          metadata: { catalogId: item.idAllergyCatalog, type: "catalog" },
        }))
        
        console.log("✅ [AllergySelector] Mapped results:", results.length, "items")
        return results
      } catch (error) {
        console.error("❌ [AllergySelector] Error searching catalog:", error)
        toast.error(error instanceof Error ? error.message : "Error al buscar en catálogo")
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
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || "Error al buscar alergias del paciente")
        }
        const data = await res.json()
        if (!data.ok) {
          throw new Error(data.error || "Error al buscar alergias del paciente")
        }
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
        // Don't show toast for patient allergies search errors, just return empty
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
      console.log("🔍 [AllergySelector] handleSearch called with query:", query)
      
      // If query is empty, load initial catalog items only
      if (!query.trim()) {
        console.log("🔍 [AllergySelector] Empty query, loading initial catalog items")
        const results = await searchCatalog("")
        console.log("✅ [AllergySelector] Initial catalog results:", results.length)
        return results
      }
      
      // Otherwise, search both catalog and patient allergies
      console.log("🔍 [AllergySelector] Searching both catalog and patient allergies")
      const [catalogResults, patientResults] = await Promise.all([
        searchCatalog(query),
        searchPatientAllergies(query),
      ])
      const combined = [...patientResults, ...catalogResults]
      console.log("✅ [AllergySelector] Combined results:", combined.length, "items")
      return combined
    },
    [searchCatalog, searchPatientAllergies]
  )

  const handleSelect = (result: SearchResult) => {
    console.log("✅ [AllergySelector] Item selected:", result)
    const metadata = result.metadata as {
      type: "catalog" | "patient"
      catalogId?: number
      allergyId?: number
      severity?: "MILD" | "MODERATE" | "SEVERE"
      reaction?: string | null
    }

    if (metadata.type === "patient" && metadata.allergyId) {
      // Link existing PatientAllergy
      console.log("🔗 [AllergySelector] Linking existing PatientAllergy:", metadata.allergyId)
      append({
        allergyId: metadata.allergyId,
        severity: metadata.severity || "MODERATE",
        reaction: metadata.reaction || undefined,
        isActive: true,
      })
    } else if (metadata.type === "catalog" && metadata.catalogId) {
      // Create from catalog - include label for display purposes
      console.log("📦 [AllergySelector] Adding from catalog:", metadata.catalogId, result.label)
      append({
        catalogId: metadata.catalogId,
        label: result.label, // Include label for display (from catalog name)
        severity: "MODERATE",
        isActive: true,
      })
      toast.success(`Alergia "${result.label}" agregada del catálogo`)
    } else {
      console.warn("⚠️ [AllergySelector] Unknown metadata type or missing ID:", metadata)
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
    const value = form.watch(`allergies.${index}`) as AnamnesisAllergyLink | undefined
    if (!value) {
      // Fallback for undefined values
      return {
        id: undefined,
        allergyId: undefined,
        catalogId: undefined,
        customLabel: undefined,
        severity: "MODERATE" as const,
        reaction: undefined,
        notes: undefined,
        isActive: true,
        label: undefined,
      }
    }
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

