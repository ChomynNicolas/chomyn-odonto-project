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

interface AnamnesisFormProps {
  pacienteId: number
  consultaId?: number
  initialData?: AnamnesisResponse | null
  onSave?: () => void
  canEdit?: boolean
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
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
    medicationIds: (anamnesis.medications || []).map((m) => m.medicationId),
    allergyIds: (anamnesis.allergies || []).map((a) => a.allergyId),
    womenSpecific: anamnesis.embarazada !== null && anamnesis.embarazada !== undefined ? {
      embarazada: anamnesis.embarazada,
      semanasEmbarazo: null,
      ultimaMenstruacion: null,
      planificacionFamiliar: "",
    } : undefined,
    customNotes: (anamnesis.payload as Record<string, unknown>)?.customNotes as string | undefined ?? undefined,
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
}: AnamnesisFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { config, isLoading: isLoadingConfig } = useAnamnesisConfig()

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
      medicationIds: [],
      allergyIds: [],
      womenSpecific: undefined,
      customNotes: undefined,
      consultaId: undefined,
    },
  })

  // Load initial data
  useEffect(() => {
    // If initialData is provided, use it directly
    if (initialData) {
      form.reset(mapAnamnesisToFormValues(initialData, consultaId))
      setIsLoading(false)
      return
    }

    // Otherwise, fetch from API
    let cancelled = false
    
    fetch(`/api/pacientes/${pacienteId}/anamnesis`)
      .then((res) => {
        if (cancelled) return null
        
        if (res.status === 404) {
          // No anamnesis exists yet - that's okay, form will be empty
          setIsLoading(false)
          return null
        }
        if (!res.ok) {
          throw new Error("Error al cargar anamnesis")
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        
        if (data?.data) {
          const anamnesis = data.data as AnamnesisResponse
          form.reset(mapAnamnesisToFormValues(anamnesis, consultaId))
        }
        setIsLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        
        console.error("Error loading anamnesis:", error)
        // Don't show toast for 404 - it's normal if no anamnesis exists yet
        if (error.message !== "Error al cargar anamnesis") {
          toast.error("Error al cargar anamnesis")
        }
        setIsLoading(false)
      })
    
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, consultaId, initialData])

  const onSubmit = async (data: AnamnesisCreateUpdateBody) => {
    if (!canEdit) {
      toast.error("No tiene permisos para editar la anamnesis")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          consultaId,
        }),
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
  const isFirstConsultation = !initialData
  const editMode = config?.ALLOW_EDIT_SUBSEQUENT || "FULL"
  const canEditForm = canEdit && (
    isFirstConsultation || 
    editMode === "FULL" || 
    (editMode === "PARTIAL" && config?.EDITABLE_SECTIONS?.length)
  )

  // Show loader only if we're actually loading data, not if config fails
  // Config can fail gracefully and use defaults
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando anamnesis...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const showWomenSection = patientGender === "FEMENINO"

  return (
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
      <CardContent>
        {!canEditForm && (
          <Alert className="mb-4">
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
  )
}

