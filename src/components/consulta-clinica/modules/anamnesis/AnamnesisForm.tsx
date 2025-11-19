// src/components/consulta-clinica/modules/anamnesis/AnamnesisForm.tsx
// Main anamnesis form component with normalized structure

"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Save, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnamnesisCreateUpdateBodySchema, type AnamnesisCreateUpdateBody, type AnamnesisResponse } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { GeneralInformationSection } from "./sections/GeneralInformationSection"
import { MedicalHistorySection } from "./sections/MedicalHistorySection"
import { MedicationsSection } from "./sections/MedicationsSection"
import { AllergiesSection } from "./sections/AllergiesSection"
import { WomenSpecificSection } from "./sections/WomenSpecificSection"
import { useAnamnesisConfig } from "@/hooks/useAnamnesisConfig"
import { AnamnesisFormSkeleton } from "./components/AnamnesisFormSkeleton"
import type { AnamnesisContext } from "@/lib/services/anamnesis-context.service"

interface AnamnesisFormProps {
  pacienteId: number
  consultaId?: number
  initialData?: AnamnesisResponse | null
  onSave?: () => void
  canEdit?: boolean
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  anamnesisContext?: AnamnesisContext | null
  isLoadingAnamnesis?: boolean
}

// Helper function to map anamnesis response to form values (moved outside component to avoid re-creation)
function mapAnamnesisToFormValues(
  anamnesis: AnamnesisResponse,
  consultaId?: number
): AnamnesisCreateUpdateBody {
  return {
    motivoConsulta: anamnesis.motivoConsulta || "",
    tieneDolorActual: anamnesis.tieneDolorActual,
    dolorIntensidad: anamnesis.dolorIntensidad ?? undefined,
    urgenciaPercibida: anamnesis.urgenciaPercibida ?? undefined,
    tieneEnfermedadesCronicas: anamnesis.tieneEnfermedadesCronicas,
    tieneAlergias: anamnesis.tieneAlergias,
    tieneMedicacionActual: anamnesis.tieneMedicacionActual,
    expuestoHumoTabaco: anamnesis.expuestoHumoTabaco ?? undefined,
    bruxismo: anamnesis.bruxismo ?? undefined,
    higieneCepilladosDia: anamnesis.higieneCepilladosDia ?? undefined,
    usaHiloDental: anamnesis.usaHiloDental ?? undefined,
    ultimaVisitaDental: anamnesis.ultimaVisitaDental ?? undefined,
    tieneHabitosSuccion: anamnesis.tieneHabitosSuccion ?? undefined,
    lactanciaRegistrada: anamnesis.lactanciaRegistrada ?? undefined,
    antecedents: (anamnesis.antecedents || []).map((ant) => ({
      antecedentId: ant.antecedentId ?? undefined,
      customName: ant.customName ?? undefined,
      customCategory: ant.customCategory ?? undefined,
      notes: ant.notes ?? undefined,
      diagnosedAt: ant.diagnosedAt ?? undefined,
      isActive: ant.isActive,
      resolvedAt: ant.resolvedAt ?? undefined,
    })),
    medications: (anamnesis.medications || []).map((m) => ({
      id: m.idAnamnesisMedication,
      medicationId: m.medicationId,
      isActive: m.medication.isActive,
      notes: undefined,
      // Include display fields from medication relation
      label: m.medication.label || m.medication.medicationCatalog?.name || null,
      dose: m.medication.dose,
      freq: m.medication.freq,
      route: m.medication.route,
    })),
    allergies: (anamnesis.allergies || []).map((a) => ({
      id: a.idAnamnesisAllergy,
      allergyId: a.allergyId,
      severity: a.allergy.severity,
      reaction: a.allergy.reaction ?? undefined,
      isActive: a.allergy.isActive,
      notes: undefined,
      // Include display field from allergy relation
      label: a.allergy.label || a.allergy.allergyCatalog?.name || null,
    })),
    womenSpecific: anamnesis.embarazada !== null && anamnesis.embarazada !== undefined ? {
      embarazada: anamnesis.embarazada,
      semanasEmbarazo: null,
      ultimaMenstruacion: null,
      planificacionFamiliar: "",
    } : undefined,
    customNotes: (anamnesis.payload as Record<string, unknown>)?.customNotes as string | undefined ?? "",
    consultaId: consultaId,
  }
}

export function AnamnesisForm({
  pacienteId,
  consultaId,
  initialData,
  onSave,
  canEdit = true,
  patientGender,
  anamnesisContext,
  isLoadingAnamnesis = false,
}: AnamnesisFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const { config } = useAnamnesisConfig()

  const form = useForm<AnamnesisCreateUpdateBody>({
    resolver: zodResolver(AnamnesisCreateUpdateBodySchema),
    defaultValues: {
      motivoConsulta: "",
      tieneDolorActual: false,
      dolorIntensidad: undefined,
      urgenciaPercibida: undefined,
      tieneEnfermedadesCronicas: false,
      tieneAlergias: false,
      tieneMedicacionActual: false,
      expuestoHumoTabaco: undefined,
      bruxismo: undefined,
      higieneCepilladosDia: undefined,
      usaHiloDental: undefined,
      ultimaVisitaDental: undefined,
      tieneHabitosSuccion: undefined,
      lactanciaRegistrada: undefined,
      antecedents: [],
      medications: [],
      allergies: [],
      womenSpecific: undefined,
      customNotes: "",
      consultaId: undefined,
    },
  })

  // Load initial data - use data passed from parent (no duplicate fetching)
  useEffect(() => {
    if (initialData) {
      form.reset(mapAnamnesisToFormValues(initialData, consultaId))
    }
    // If no initialData, form will use default values (empty form for new anamnesis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, consultaId, initialData])

  const onSubmit = async (data: AnamnesisCreateUpdateBody) => {
    if (!canEdit) {
      toast.error("No tiene permisos para editar la anamnesis")
      return
    }

    setIsSaving(true)
    try {
      // Clean display fields from medications and allergies before sending (these are UI-only)
      const cleanedData = {
        ...data,
        medications: data.medications?.map((med) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { label, dose, freq, route, ...rest } = med
          return rest
        }),
        allergies: data.allergies?.map((all) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { label, ...rest } = all
          return rest
        }),
        consultaId,
      }

      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      toast.success("Anamnesis guardada correctamente")
      onSave?.()
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar anamnesis")
    } finally {
      setIsSaving(false)
    }
  }

  // Determine editability based on config
  const isFirstConsultation = anamnesisContext?.isFirstTime ?? !initialData
  const editMode = config?.ALLOW_EDIT_SUBSEQUENT || "FULL"
  const canEditForm = canEdit && (
    isFirstConsultation || 
    editMode === "FULL" || 
    (editMode === "PARTIAL" && config?.EDITABLE_SECTIONS?.length)
  )

  // Show skeleton loader if data is still loading
  if (isLoadingAnamnesis) {
    return <AnamnesisFormSkeleton />
  }

  const showWomenSection = patientGender === "FEMENINO"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anamnesis
          </CardTitle>
          <CardDescription>
            Información clínica completa del paciente. Los campos marcados con * son obligatorios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canEditForm && (
            <Alert>
              <AlertDescription>
                No tienes permisos para editar la anamnesis. Solo lectura.
              </AlertDescription>
            </Alert>
          )}

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <GeneralInformationSection form={form} canEdit={canEditForm} />

              <MedicalHistorySection 
                form={form} 
                canEdit={canEditForm}
                pacienteId={pacienteId}
              />

              <MedicationsSection 
                form={form} 
                canEdit={canEditForm}
                pacienteId={pacienteId}
              />

              <AllergiesSection 
                form={form} 
                canEdit={canEditForm}
                pacienteId={pacienteId}
              />

              {showWomenSection && (
                <WomenSpecificSection 
                  form={form} 
                  canEdit={canEditForm}
                />
              )}

              {canEditForm && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Anamnesis
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  )
}

