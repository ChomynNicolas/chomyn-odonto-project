// src/components/consulta-clinica/modules/anamnesis/AnamnesisForm.tsx
"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Save, FileText, ArrowUp, Info, AlertCircle, RotateCcw, CircleDot } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AnamnesisCreateUpdateBodySchema,
  type AnamnesisCreateUpdateBody,
  type AnamnesisResponse,
  type AnamnesisMedicationLink,
  type AnamnesisAllergyLink,
} from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { useAnamnesisConfig } from "@/hooks/useAnamnesisConfig"
import { AnamnesisContext } from "@/lib/services/anamnesis-context.service"
import { AnamnesisFormSkeleton } from "./components/AnamnesisFormSkeleton"
import { AllergiesSection } from "./sections/AllergiesSection"
import { GeneralInformationSection } from "./sections/GeneralInformationSection"
import { MedicalHistorySection } from "./sections/MedicalHistorySection"
import { MedicationsSection } from "./sections/MedicationsSection"
import { WomenSpecificSection } from "./sections/WomenSpecificSection"
import { PediatricSection } from "./sections/PediatricSection"
import { ProgressTracker } from "./components/ProgressTracker"
import { calculateAge, getAnamnesisRulesByAge, getAgeContextMessage } from "@/lib/utils/age-utils"
import { useUnsavedChanges } from "./hooks/useUnsavedChanges"
import type { AnamnesisPayload } from "@/app/(dashboard)/pacientes/[id]/_components/anamnesis/types/anamnesis-display.types"

interface AnamnesisFormProps {
  pacienteId: number
  consultaId?: number
  initialData?: AnamnesisResponse | null
  onSave?: () => void
  canEdit?: boolean
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  patientBirthDate?: Date | string | null // Nueva prop
  anamnesisContext?: AnamnesisContext | null
  isLoadingAnamnesis?: boolean
}

// Helper function to map anamnesis response to form values
function mapAnamnesisToFormValues(
  anamnesis: AnamnesisResponse,
  consultaId?: number
): AnamnesisCreateUpdateBody {
  // Extract payload with type safety
  const payload = anamnesis.payload as AnamnesisPayload | null
  const womenSpecificPayload = payload?.womenSpecific as
    | {
        embarazada?: boolean | null
        semanasEmbarazo?: number | null
        ultimaMenstruacion?: string | null
        planificacionFamiliar?: string | null
      }
    | undefined
  const pediatricPayload = payload?.pediatricSpecific as
    | {
        tieneHabitosSuccion?: boolean | null
        lactanciaRegistrada?: string | boolean | null
      }
    | undefined

  // Women-specific: prioritize payload, then direct field (backward compatibility)
  const womenSpecific = womenSpecificPayload
    ? {
        embarazada: womenSpecificPayload.embarazada ?? anamnesis.embarazada ?? null,
        semanasEmbarazo: womenSpecificPayload.semanasEmbarazo ?? null,
        ultimaMenstruacion: womenSpecificPayload.ultimaMenstruacion ?? null,
        planificacionFamiliar: womenSpecificPayload.planificacionFamiliar ?? "",
      }
    : anamnesis.embarazada !== null && anamnesis.embarazada !== undefined
    ? {
        embarazada: anamnesis.embarazada,
        semanasEmbarazo: null,
        ultimaMenstruacion: null,
        planificacionFamiliar: "",
      }
    : undefined

  // Pediatric-specific: prioritize payload, then direct field (backward compatibility)
  // For lactanciaRegistrada: validate it's either a valid enum string or boolean
  const rawLactancia = pediatricPayload?.lactanciaRegistrada
  const lactanciaRegistrada =
    rawLactancia !== undefined && rawLactancia !== null
      ? typeof rawLactancia === "string" &&
        ["EXCLUSIVA", "MIXTA", "FORMULA", "NO_APLICA"].includes(rawLactancia)
        ? (rawLactancia as "EXCLUSIVA" | "MIXTA" | "FORMULA" | "NO_APLICA")
        : typeof rawLactancia === "boolean"
        ? rawLactancia
        : undefined // Invalid string value, set to undefined
      : undefined // Don't convert old boolean to enum, let user select

  const tieneHabitosSuccion =
    pediatricPayload?.tieneHabitosSuccion !== undefined
      ? pediatricPayload.tieneHabitosSuccion
      : anamnesis.tieneHabitosSuccion ?? undefined

  const mappedData = {
    // motivoConsulta removed - it's now in consulta, not anamnesis
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
    tieneHabitosSuccion,
    lactanciaRegistrada,
    antecedents: (anamnesis.antecedents || []).map((ant) => ({
      antecedentId: ant.antecedentId ?? undefined,
      customName: ant.customName ?? undefined,
      customCategory: ant.customCategory ?? undefined,
      notes: ant.notes ?? undefined,
      diagnosedAt: ant.diagnosedAt ?? undefined,
      isActive: ant.isActive,
      resolvedAt: ant.resolvedAt ?? undefined,
    })),
    medications: (anamnesis.medications || []).map((m) => {
      const isFromCatalog = !!m.medication.medicationCatalog
      const isCustom = !m.medication.medicationCatalog && !!m.medication.label
      
      return {
        id: m.idAnamnesisMedication,
        medicationId: m.medicationId,
        catalogId: isFromCatalog ? m.medication.medicationCatalog?.idMedicationCatalog : undefined,
        customLabel: isCustom ? m.medication.label : undefined,
        customDescription: isCustom && m.notes ? m.notes : undefined,
        isActive: m.medication.isActive,
        notes: isFromCatalog ? m.notes : undefined, // Notes only for catalog medications (not customDescription)
        label: m.medication.label || m.medication.medicationCatalog?.name || null,
        description: m.medication.medicationCatalog?.description || null,
        dose: m.medication.dose,
        freq: m.medication.freq,
        route: m.medication.route,
      }
    }),
    allergies: (anamnesis.allergies || []).map((a) => ({
      id: a.idAnamnesisAllergy,
      allergyId: a.allergyId,
      // Include catalogId if the allergy comes from catalog
      catalogId: a.allergy.allergyCatalog?.idAllergyCatalog ?? undefined,
      severity: a.allergy.severity,
      reaction: a.allergy.reaction ?? undefined,
      isActive: a.allergy.isActive,
      notes: undefined,
      label: a.allergy.label || a.allergy.allergyCatalog?.name || null,
    })),
    womenSpecific,
    customNotes: (payload?.customNotes as string | undefined) ?? "",
    consultaId: consultaId,
  }

  console.log("🔍 Mapped data from DB:", mappedData)
  return mappedData
}

export function AnamnesisForm({
  pacienteId,
  consultaId,
  initialData,
  onSave,
  canEdit = true,
  patientGender = "NO_ESPECIFICADO",
  patientBirthDate,
  anamnesisContext,
  isLoadingAnamnesis = false,
}: AnamnesisFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [showErrorSummary, setShowErrorSummary] = useState(false)
  const { config } = useAnamnesisConfig()

  const generalRef = useRef<HTMLDivElement>(null)
  const medicalRef = useRef<HTMLDivElement>(null)
  const medicationsRef = useRef<HTMLDivElement>(null)
  const allergiesRef = useRef<HTMLDivElement>(null)
  const womenRef = useRef<HTMLDivElement>(null)
  const pediatricRef = useRef<HTMLDivElement>(null)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  // Calcular edad y reglas de visualización
  const ageInfo = useMemo(() => {
    return calculateAge(patientBirthDate ?? null)
  }, [patientBirthDate])

  const ageRules = useMemo(() => {
    return getAnamnesisRulesByAge(ageInfo, patientGender)
  }, [ageInfo, patientGender])

  const ageContextMessage = useMemo(() => {
    return getAgeContextMessage(ageInfo)
  }, [ageInfo])

  const form = useForm<z.input<typeof AnamnesisCreateUpdateBodySchema>>({
    resolver: zodResolver(AnamnesisCreateUpdateBodySchema),
    defaultValues: {
      motivoConsulta: undefined, // Optional - moved to consulta
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

  // Track form dirty state and errors
  const { isDirty, errors } = form.formState
  const hasErrors = Object.keys(errors).length > 0

  // Unsaved changes warning
  const { hasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges({
    isDirty,
    enabled: canEdit,
    warningMessage: "Tiene cambios sin guardar en la anamnesis. ¿Está seguro que desea salir?",
  })

  // Load initial data
  useEffect(() => {
    if (initialData) {
      const mappedData = mapAnamnesisToFormValues(initialData, consultaId)
      // Remove motivoConsulta from form data (it's now in consulta)
      const {  ...formData } = mappedData
      form.reset(formData)
      resetUnsavedChanges()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, consultaId, initialData])

  // Get error messages for display
  const getErrorMessages = useCallback(() => {
    const messages: { field: string; message: string }[] = []
    
    // motivoConsulta removed - it's now in consulta
    if (errors.dolorIntensidad) {
      messages.push({ field: "Intensidad del dolor", message: errors.dolorIntensidad.message || "Valor inválido" })
    }
    if (errors.antecedents) {
      messages.push({ field: "Antecedentes", message: "Revise los antecedentes médicos" })
    }
    if (errors.medications) {
      messages.push({ field: "Medicaciones", message: "Revise las medicaciones" })
    }
    if (errors.allergies) {
      messages.push({ field: "Alergias", message: "Revise las alergias" })
    }
    if (errors.womenSpecific) {
      messages.push({ field: "Información para mujeres", message: "Revise la información específica" })
    }
    
    return messages
  }, [errors])

  // Scroll to first error field
  const scrollToFirstError = useCallback(() => {
    const firstErrorKey = Object.keys(errors)[0]
    if (!firstErrorKey) return

    // Map error keys to section refs
    const errorToRef: Record<string, React.RefObject<HTMLDivElement | null>> = {
      // motivoConsulta removed - it's now in consulta
      tieneDolorActual: generalRef,
      dolorIntensidad: generalRef,
      urgenciaPercibida: generalRef,
      tieneEnfermedadesCronicas: medicalRef,
      antecedents: medicalRef,
      expuestoHumoTabaco: medicalRef,
      bruxismo: medicalRef,
      tieneMedicacionActual: medicationsRef,
      medications: medicationsRef,
      tieneAlergias: allergiesRef,
      allergies: allergiesRef,
      womenSpecific: womenRef,
    }

    const targetRef = errorToRef[firstErrorKey]
    if (targetRef?.current) {
      targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [errors])

  // Handle form validation errors
  const handleInvalidSubmit = useCallback(() => {
    setShowErrorSummary(true)
    scrollToFirstError()
    
    // Scroll to error summary first
    setTimeout(() => {
      errorSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }, [scrollToFirstError])

  // Handle discard changes
  const handleDiscardChanges = useCallback(() => {
    if (initialData) {
      form.reset(mapAnamnesisToFormValues(initialData, consultaId))
    } else {
      form.reset()
    }
    resetUnsavedChanges()
    setShowDiscardDialog(false)
    setShowErrorSummary(false)
    toast.info("Cambios descartados")
  }, [form, initialData, consultaId, resetUnsavedChanges])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // motivoConsulta removed - it's now in consulta
  const tieneDolorActual = form.watch("tieneDolorActual")
  const dolorIntensidad = form.watch("dolorIntensidad")
  const tieneEnfermedadesCronicas = form.watch("tieneEnfermedadesCronicas")
  const antecedents = form.watch("antecedents")
  const tieneMedicacionActual = form.watch("tieneMedicacionActual")
  const medications = form.watch("medications")
  const tieneAlergias = form.watch("tieneAlergias")
  const allergies = form.watch("allergies")
  const womenSpecific = form.watch("womenSpecific")

  // Secciones dinámicas según edad y género
  const sections = useMemo(() => {
    const baseSections = [
      {
        id: "general",
        label: "Información General",
        isComplete: Boolean(
          !tieneDolorActual || (tieneDolorActual && dolorIntensidad !== null && dolorIntensidad !== undefined)
        ),
        ref: generalRef,
      },
      {
        id: "medical",
        label: "Antecedentes Médicos",
        isComplete: Boolean(
          !tieneEnfermedadesCronicas || (tieneEnfermedadesCronicas && antecedents && antecedents.length > 0)
        ),
        ref: medicalRef,
      },
      {
        id: "medications",
        label: "Medicación Actual",
        isComplete: Boolean(
          !tieneMedicacionActual || (tieneMedicacionActual && medications && medications.length > 0)
        ),
        ref: medicationsRef,
      },
      {
        id: "allergies",
        label: "Alergias",
        isComplete: Boolean(!tieneAlergias || (tieneAlergias && allergies && allergies.length > 0)),
        ref: allergiesRef,
      },
    ]

    // Agregar sección pediátrica si aplica
    if (ageRules.showPediatricQuestions) {
      baseSections.push({
        id: "pediatric",
        label: "Información Pediátrica",
        isComplete: true, // Ajustar según campos requeridos
        ref: pediatricRef,
      })
    }

    // Agregar sección de mujeres si aplica
    if (ageRules.canShowWomenSpecific) {
      baseSections.push({
        id: "women",
        label: "Información para Mujeres",
        isComplete: Boolean(
          womenSpecific?.embarazada !== null && womenSpecific?.embarazada !== undefined
        ),
        ref: womenRef,
      })
    }

    return baseSections
  }, [
    // motivoConsulta removed - it's now in consulta
    tieneDolorActual,
    dolorIntensidad,
    tieneEnfermedadesCronicas,
    antecedents,
    tieneMedicacionActual,
    medications,
    tieneAlergias,
    allergies,
    womenSpecific,
    ageRules,
  ])

  const handleSectionClick = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (section?.ref.current) {
      section.ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSubmit = async (data: z.input<typeof AnamnesisCreateUpdateBodySchema>) => {
    if (!canEdit) {
      toast.error("No tiene permisos para editar la anamnesis")
      return
    }

    setIsSaving(true)
    setShowErrorSummary(false)
    
    try {
      console.log("📤 Submitting data:", data)

      // Limpiar campos según edad/género antes de enviar
      const cleanedData = {
        ...data,
        // Remove motivoConsulta - it's now in consulta, not anamnesis
        motivoConsulta: undefined,
        // Si tieneMedicacionActual es false, limpiar el array de medicaciones
        medications: data.tieneMedicacionActual
          ? data.medications?.map((med) => {
              // Type assertion: medications are AnamnesisMedicationLink in practice
              const medication = med as AnamnesisMedicationLink
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { label, dose, freq, route, ...rest } = medication
              return rest
            })
          : [],
        // Si tieneAlergias es false, limpiar el array de alergias
        allergies: data.tieneAlergias
          ? data.allergies?.map((all) => {
              // Type assertion: allergies are AnamnesisAllergyLink in practice
              const allergy = all as AnamnesisAllergyLink
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { label, ...rest } = allergy
              return rest
            })
          : [],
        // Si tieneEnfermedadesCronicas es false, limpiar el array de antecedentes
        antecedents: data.tieneEnfermedadesCronicas ? data.antecedents : [],
        // Eliminar womenSpecific si no aplica por edad
        womenSpecific: ageRules.canShowWomenSpecific ? data.womenSpecific : undefined,
        consultaId,
      }

      console.log("📦 Cleaned data to send:", cleanedData)

      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      const responseData = await res.json()
      console.log("✅ Response from server:", responseData)

      // Reset form state after successful save
      form.reset(data)
      resetUnsavedChanges()
      
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
  const canEditForm: boolean = Boolean(
    canEdit &&
    (isFirstConsultation || editMode === "FULL" || (editMode === "PARTIAL" && Boolean(config?.EDITABLE_SECTIONS?.length)))
  )

  // Show skeleton loader if data is still loading
  if (isLoadingAnamnesis) {
    return <AnamnesisFormSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 shrink-0">
            <ProgressTracker sections={sections} onSectionClick={handleSectionClick} />
          </aside>

          {/* Main form content */}
          <div className="flex-1 space-y-6 max-w-4xl">
            <Card className="border-2 shadow-lg">
              <CardHeader className="space-y-3 pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-semibold">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  Anamnesis
                  {ageInfo && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({ageInfo.years} año{ageInfo.years !== 1 ? "s" : ""})
                    </span>
                  )}
                  {hasUnsavedChanges && (
                    <Badge variant="secondary" className="ml-2 gap-1 animate-pulse">
                      <CircleDot className="h-3 w-3" />
                      Sin guardar
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Información clínica completa del paciente. Los campos marcados con{" "}
                  <span className="text-destructive font-semibold">*</span> son obligatorios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pb-8">
                {/* Alerta contextual por edad */}
                {ageContextMessage && (
                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Información Contextual</AlertTitle>
                    <AlertDescription>{ageContextMessage}</AlertDescription>
                  </Alert>
                )}

                {!canEditForm && (
                  <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
                    <AlertDescription className="text-amber-900 dark:text-amber-100">
                      No tienes permisos para editar la anamnesis. Solo lectura.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Summary */}
                {showErrorSummary && hasErrors && (
                  <div ref={errorSummaryRef}>
                    <Alert variant="destructive" className="border-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error de validación</AlertTitle>
                      <AlertDescription>
                        <p className="mb-2">Por favor corrija los siguientes errores antes de guardar:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {getErrorMessages().map((error, index) => (
                            <li key={index} className="text-sm">
                              <strong>{error.field}:</strong> {error.message}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)} className="space-y-8">
                    <div ref={generalRef}>
                      <GeneralInformationSection
                        form={form}
                        canEdit={canEditForm}
                      />
                    </div>

                    <div ref={medicalRef}>
                      <MedicalHistorySection
                        form={form}
                        canEdit={canEditForm}
                        pacienteId={pacienteId}
                      />
                    </div>

                    <div ref={medicationsRef}>
                      <MedicationsSection
                        form={form}
                        canEdit={canEditForm}
                        pacienteId={pacienteId}
                      />
                    </div>

                    <div ref={allergiesRef}>
                      <AllergiesSection form={form} canEdit={canEditForm} pacienteId={pacienteId} />
                    </div>

                    {ageRules.showPediatricQuestions && (
                      <div ref={pediatricRef}>
                        <PediatricSection form={form} canEdit={canEditForm} ageRules={ageRules} />
                      </div>
                    )}

                    {ageRules.canShowWomenSpecific && (
                      <div ref={womenRef}>
                        <WomenSpecificSection form={form} canEdit={canEditForm} ageRules={ageRules} />
                      </div>
                    )}

                    {canEditForm && (
                      <div className="flex justify-end gap-3 pt-6 border-t-2">
                        {hasUnsavedChanges && (
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => setShowDiscardDialog(true)}
                            disabled={isSaving}
                            className="min-w-[140px]"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Descartar
                          </Button>
                        )}
                        <Button 
                          type="submit" 
                          disabled={isSaving} 
                          size="lg" 
                          className="min-w-[160px]"
                        >
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
        </div>
      </div>

      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg z-50"
          aria-label="Volver arriba"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Discard Changes Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiene cambios sin guardar en la anamnesis. Si descarta los cambios, se perderán
              todas las modificaciones realizadas desde la última vez que guardó.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
