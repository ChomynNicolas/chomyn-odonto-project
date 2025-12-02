// src/components/consulta-clinica/modules/anamnesis/components/MedicationSelector.tsx
// Enhanced medication selector with autocomplete, catalog search, and custom entry support

"use client"

import { useState, useCallback } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Pill } from "lucide-react"
import { AutocompleteSearch, type SearchResult } from "./AutocompleteSearch"
import { MedicationEntryCard, type MedicationEntry } from "./MedicationEntryCard"
import { AnamnesisCreateUpdateBodySchema, type AnamnesisMedicationLink } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface MedicationSelectorProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
  pacienteId: number
  disabled?: boolean
}

interface CatalogMedication {
  idMedicationCatalog: number
  name: string
  description: string | null
}

interface PatientMedicationItem {
  idPatientMedication: number
  label: string | null
  medicationCatalog: { name: string } | null
  dose: string | null
  freq: string | null
  route: string | null
  isActive: boolean
}

export function MedicationSelector({
  form,
  pacienteId,
  disabled = false,
}: MedicationSelectorProps) {
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "medications",
  })

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [isLoadingPatient, setIsLoadingPatient] = useState(false)
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false)
  const [customForm, setCustomForm] = useState({
    label: "",
    description: "",
  })

  // Search catalog medications (también carga todos si query está vacío)
  const searchCatalog = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      setIsLoadingCatalog(true)
      try {
        // Construir parámetros de búsqueda según el schema del endpoint
        const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : ""
        
        // Usar el endpoint correcto /api/medication-catalog con los parámetros correctos
        const res = await fetch(
          `/api/medication-catalog?limit=20&isActive=true&sortBy=name&sortOrder=asc${searchParam}`
        )
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || "Error al buscar en catálogo")
        }
        
        const data = await res.json()
        
        if (!data.ok) {
          throw new Error(data.error || "Error al buscar en catálogo")
        }
        
        // Mapear la respuesta según el schema MedicationCatalogItem
        return (data.data as CatalogMedication[]).map((item) => ({
          id: `catalog-${item.idMedicationCatalog}`,
          label: item.name,
          description: item.description || undefined,
          metadata: { catalogId: item.idMedicationCatalog, type: "catalog" },
        }))
      } catch (error) {
        console.error("Error searching catalog:", error)
        toast.error(error instanceof Error ? error.message : "Error al buscar en catálogo")
        return []
      } finally {
        setIsLoadingCatalog(false)
      }
    },
    []
  )

  // Search patient medications
  const searchPatientMedications = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return []
      setIsLoadingPatient(true)
      try {
        const res = await fetch(`/api/pacientes/${pacienteId}/medicacion`)
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || "Error al buscar medicaciones del paciente")
        }
        
        const data = await res.json()
        
        if (!data.ok) {
          throw new Error(data.error || "Error al buscar medicaciones del paciente")
        }
        
        const medications = (data.data as PatientMedicationItem[]) || []
        const queryLower = query.toLowerCase()
        const filtered = medications
          .filter(
            (med) =>
              (med.label || med.medicationCatalog?.name || "")
                .toLowerCase()
                .includes(queryLower) && med.isActive
          )
          .slice(0, 10)
          
        return filtered.map((med) => ({
          id: `patient-${med.idPatientMedication}`,
          label: med.label || med.medicationCatalog?.name || "Sin nombre",
          description: med.dose
            ? `${med.dose}${med.freq ? ` - ${med.freq}` : ""}`
            : undefined,
          metadata: {
            medicationId: med.idPatientMedication,
            type: "patient",
            dose: med.dose,
            freq: med.freq,
            route: med.route,
          },
        }))
      } catch (error) {
        console.error("Error searching patient medications:", error)
        // No mostrar toast para errores de búsqueda de paciente, solo retornar vacío
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
      // Si el query está vacío, cargar solo el catálogo inicial
      if (!query.trim()) {
        return await searchCatalog("")
      }
      
      // Si hay query, buscar en ambos: catálogo y medicaciones del paciente
      const [catalogResults, patientResults] = await Promise.all([
        searchCatalog(query),
        searchPatientMedications(query),
      ])
      
      // Priorizar medicaciones del paciente sobre el catálogo
      return [...patientResults, ...catalogResults]
    },
    [searchCatalog, searchPatientMedications]
  )

  const handleSelect = (result: SearchResult) => {
    const metadata = result.metadata as {
      type: "catalog" | "patient"
      catalogId?: number
      medicationId?: number
      dose?: string | null
      freq?: string | null
      route?: string | null
    }

    if (metadata.type === "patient" && metadata.medicationId) {
      // Vincular PatientMedication existente
      append({
        medicationId: metadata.medicationId,
        isActive: true,
        // Incluir label para display (desde PatientMedication)
        label: result.label,
        dose: metadata.dose ?? undefined,
        freq: metadata.freq ?? undefined,
        route: metadata.route ?? undefined,
      })
      toast.success(`Medicación "${result.label}" agregada`)
    } else if (metadata.type === "catalog" && metadata.catalogId) {
      // Crear desde catálogo - incluir label y description para display
      append({
        catalogId: metadata.catalogId,
        isActive: true,
        // Incluir label y description para display (desde MedicationCatalog)
        label: result.label,
        description: result.description || undefined,
      })
      toast.success(`Medicación "${result.label}" agregada del catálogo`)
    }
  }

  const handleCustomEntry = (query: string) => {
    setCustomForm({
      label: query,
      description: "",
    })
    setIsCustomDialogOpen(true)
  }

  const handleAddCustom = () => {
    if (!customForm.label.trim()) {
      toast.error("El nombre de la medicación es requerido")
      return
    }

    append({
      customLabel: customForm.label.trim(),
      customDescription: customForm.description.trim() || undefined,
      isActive: true,
    })

    setIsCustomDialogOpen(false)
    setCustomForm({ label: "", description: "" })
    toast.success("Medicación personalizada agregada")
  }

  const handleUpdate = (index: number, entry: MedicationEntry) => {
    update(index, entry)
  }

  const handleRemove = (index: number) => {
    remove(index)
    toast.success("Medicación removida")
  }

  // Map form fields to MedicationEntry format for display
  const entries: MedicationEntry[] = fields.map((field, index) => {
    const value = form.watch(`medications.${index}`) as AnamnesisMedicationLink | undefined
    if (!value) {
      // Fallback for undefined values
      return {
        id: undefined,
        medicationId: undefined,
        catalogId: undefined,
        customLabel: undefined,
        customDescription: undefined,
        customDose: undefined,
        customFreq: undefined,
        customRoute: undefined,
        notes: undefined,
        isActive: true,
        label: undefined,
        description: undefined,
        dose: undefined,
        freq: undefined,
        route: undefined,
      }
    }
    return {
      id: value.id,
      medicationId: value.medicationId,
      catalogId: value.catalogId,
      customLabel: value.customLabel,
      customDescription: value.customDescription,
      customDose: value.customDose,
      customFreq: value.customFreq,
      customRoute: value.customRoute,
      notes: value.notes,
      isActive: value.isActive ?? true,
      // Incluir campos de display si están disponibles (de anamnesis cargada)
      label: value.label ?? undefined,
      description: value.description ?? undefined,
      dose: value.dose ?? undefined,
      freq: value.freq ?? undefined,
      route: value.route ?? undefined,
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
          placeholder="Buscar medicación existente o del catálogo..."
          emptyMessage="No se encontraron medicaciones. Use 'Agregar personalizada' para crear una nueva."
          showCustomOption={true}
          customOptionLabel="Agregar como medicación personalizada"
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
          <Label>Medicaciones seleccionadas ({entries.length})</Label>
          {entries.map((entry, index) => (
            <MedicationEntryCard
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
          <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay medicaciones agregadas</p>
          <p className="text-xs mt-1">
            Use la búsqueda para agregar medicaciones existentes o del catálogo
          </p>
        </div>
      )}

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Medicación Personalizada</DialogTitle>
            <DialogDescription>
              Ingrese los detalles de una medicación que no está en el catálogo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-label">
                Nombre de la medicación <span className="text-destructive">*</span>
              </Label>
              <Input
                id="custom-label"
                value={customForm.label}
                onChange={(e) =>
                  setCustomForm({ ...customForm, label: e.target.value })
                }
                placeholder="Ej: Medicamento específico"
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-description">Descripción</Label>
              <Textarea
                id="custom-description"
                value={customForm.description}
                onChange={(e) =>
                  setCustomForm({ ...customForm, description: e.target.value })
                }
                placeholder="Descripción opcional del medicamento..."
                rows={4}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {customForm.description.length}/1000 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCustomDialogOpen(false)
                setCustomForm({ label: "", description: "" })
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
