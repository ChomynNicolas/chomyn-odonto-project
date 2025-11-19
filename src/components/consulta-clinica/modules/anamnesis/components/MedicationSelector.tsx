// src/components/consulta-clinica/modules/anamnesis/components/MedicationSelector.tsx
// Enhanced medication selector with autocomplete, catalog search, and custom entry support

"use client"

import { useState, useEffect, useCallback } from "react"
import { useFieldArray, UseFormReturn } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Pill, Loader2 } from "lucide-react"
import { AutocompleteSearch, type SearchResult } from "./AutocompleteSearch"
import { MedicationEntryCard, type MedicationEntry } from "./MedicationEntryCard"
import type { AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface MedicationSelectorProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
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
    dose: "",
    freq: "",
    route: "",
  })

  // Search catalog medications
  const searchCatalog = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return []
      setIsLoadingCatalog(true)
      try {
        const res = await fetch(
          `/api/anamnesis/medications/catalog?search=${encodeURIComponent(query)}&limit=20`
        )
        if (!res.ok) throw new Error("Error al buscar en catálogo")
        const data = await res.json()
        return (data.data as CatalogMedication[]).map((item) => ({
          id: `catalog-${item.idMedicationCatalog}`,
          label: item.name,
          description: item.description || undefined,
          metadata: { catalogId: item.idMedicationCatalog, type: "catalog" },
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

  // Search patient medications
  const searchPatientMedications = useCallback(
    async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return []
      setIsLoadingPatient(true)
      try {
        const res = await fetch(`/api/pacientes/${pacienteId}/medicacion`)
        if (!res.ok) throw new Error("Error al buscar medicaciones del paciente")
        const data = await res.json()
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
        searchPatientMedications(query),
      ])
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
      // Link existing PatientMedication
      append({
        medicationId: metadata.medicationId,
        isActive: true,
      })
    } else if (metadata.type === "catalog" && metadata.catalogId) {
      // Create from catalog
      append({
        catalogId: metadata.catalogId,
        customLabel: result.label,
        isActive: true,
      })
    }
  }

  const handleCustomEntry = (query: string) => {
    setCustomForm({
      label: query,
      dose: "",
      freq: "",
      route: "",
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
      customDose: customForm.dose.trim() || undefined,
      customFreq: customForm.freq.trim() || undefined,
      customRoute: customForm.route.trim() || undefined,
      isActive: true,
    })

    setIsCustomDialogOpen(false)
    setCustomForm({ label: "", dose: "", freq: "", route: "" })
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
    const value = form.watch(`medications.${index}`)
    return {
      id: value.id,
      medicationId: value.medicationId,
      catalogId: value.catalogId,
      customLabel: value.customLabel,
      customDose: value.customDose,
      customFreq: value.customFreq,
      customRoute: value.customRoute,
      notes: value.notes,
      isActive: value.isActive ?? true,
      // Include display fields if available (from loaded anamnesis)
      label: value.label ?? undefined,
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-dose">Dosis</Label>
                <Input
                  id="custom-dose"
                  value={customForm.dose}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, dose: e.target.value })
                  }
                  placeholder="Ej: 500mg"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-freq">Frecuencia</Label>
                <Input
                  id="custom-freq"
                  value={customForm.freq}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, freq: e.target.value })
                  }
                  placeholder="Ej: Cada 8h"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-route">Vía</Label>
                <Input
                  id="custom-route"
                  value={customForm.route}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, route: e.target.value })
                  }
                  placeholder="Ej: Oral"
                  maxLength={100}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCustomDialogOpen(false)
                setCustomForm({ label: "", dose: "", freq: "", route: "" })
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

