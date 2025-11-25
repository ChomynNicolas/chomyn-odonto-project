// src/components/consulta-clinica/modules/anamnesis/AnamnesisForm.tsx
"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Save, FileText, ArrowUp, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AnamnesisCreateUpdateBodySchema,
  type AnamnesisCreateUpdateBody,
  type AnamnesisResponse,
} from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { useAnamnesisConfig } from "@/hooks/useAnamnesisConfig"
import { AnamnesisContext } from "@/lib/services/anamnesis-context.service"
import { AnamnesisFormSkeleton } from "./components/AnamnesisFormSkeleton"
import { AllergiesSection } from "./sections/AllergiesSection"
import { GeneralInformationSection } from "./sections/GeneralInformationSection"
import { MedicalHistorySection } from "./sections/MedicalHistorySection"
import { MedicationsSection } from "./sections/MedicationsSection"
import { WomenSpecificSection } from "./sections/WomenSpecificSection"
import { PediatricSection } from "./sections/PediatricSection" // Nueva sección
import { ProgressTracker } from "./components/ProgressTracker"
import { calculateAge, getAnamnesisRulesByAge, getAgeContextMessage } from "@/lib/utils/age-utils"

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
  const payload = anamnesis.payload as Record<string, any> | null
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
  // For lactanciaRegistrada: if it comes as enum string from payload, use it; if boolean from DB, leave undefined
  const lactanciaRegistrada =
    pediatricPayload?.lactanciaRegistrada !== undefined && pediatricPayload?.lactanciaRegistrada !== null
      ? pediatricPayload.lactanciaRegistrada
      : undefined // Don't convert old boolean to enum, let user select

  const tieneHabitosSuccion =
    pediatricPayload?.tieneHabitosSuccion !== undefined
      ? pediatricPayload.tieneHabitosSuccion
      : anamnesis.tieneHabitosSuccion ?? undefined

  const mappedData = {
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
    medications: (anamnesis.medications || []).map((m) => ({
      id: m.idAnamnesisMedication,
      medicationId: m.medicationId,
      isActive: m.medication.isActive,
      notes: undefined,
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
  const { config } = useAnamnesisConfig()

  const generalRef = useRef<HTMLDivElement>(null)
  const medicalRef = useRef<HTMLDivElement>(null)
  const medicationsRef = useRef<HTMLDivElement>(null)
  const allergiesRef = useRef<HTMLDivElement>(null)
  const womenRef = useRef<HTMLDivElement>(null)
  const pediatricRef = useRef<HTMLDivElement>(null)

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

  // Load initial data
  useEffect(() => {
    if (initialData) {
      form.reset(mapAnamnesisToFormValues(initialData, consultaId))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId, consultaId, initialData])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const motivoConsulta = form.watch("motivoConsulta")
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
        isComplete:
          !!motivoConsulta &&
          (!tieneDolorActual || (tieneDolorActual && dolorIntensidad !== null && dolorIntensidad !== undefined)),
        ref: generalRef,
      },
      {
        id: "medical",
        label: "Antecedentes Médicos",
        isComplete: !tieneEnfermedadesCronicas || (tieneEnfermedadesCronicas && antecedents && antecedents.length > 0),
        ref: medicalRef,
      },
      {
        id: "medications",
        label: "Medicación Actual",
        isComplete: !tieneMedicacionActual || (tieneMedicacionActual && medications && medications.length > 0),
        ref: medicationsRef,
      },
      {
        id: "allergies",
        label: "Alergias",
        isComplete: !tieneAlergias || (tieneAlergias && allergies && allergies.length > 0),
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
        isComplete: womenSpecific?.embarazada !== null && womenSpecific?.embarazada !== undefined,
        ref: womenRef,
      })
    }

    return baseSections
  }, [
    motivoConsulta,
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

  const onSubmit = async (data: AnamnesisCreateUpdateBody) => {
    if (!canEdit) {
      toast.error("No tiene permisos para editar la anamnesis")
      return
    }

    setIsSaving(true)
    try {
      console.log("📤 Submitting data:", data)

      // Limpiar campos según edad/género antes de enviar
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
  const canEditForm =
    canEdit &&
    (isFirstConsultation || editMode === "FULL" || (editMode === "PARTIAL" && config?.EDITABLE_SECTIONS?.length))

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

                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div ref={generalRef}>
                      <GeneralInformationSection
                        form={form}
                        canEdit={canEditForm}
                        ageRules={ageRules}
                        simplifiedLanguage={ageRules.simplifiedLanguage}
                      />
                    </div>

                    <div ref={medicalRef}>
                      <MedicalHistorySection
                        form={form}
                        canEdit={canEditForm}
                        pacienteId={pacienteId}
                        ageRules={ageRules}
                      />
                    </div>

                    <div ref={medicationsRef}>
                      <MedicationsSection
                        form={form}
                        canEdit={canEditForm}
                        pacienteId={pacienteId}
                        ageRules={ageRules}
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
                        <Button type="submit" disabled={isSaving} size="lg" className="min-w-[160px]">
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
    </div>
  )
}
