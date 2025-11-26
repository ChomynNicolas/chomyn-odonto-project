// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/OutsideConsultationAnamnesisForm.tsx
// Full anamnesis edit form optimized for outside-consultation context

"use client"

import { useState, useMemo, useCallback } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Loader2,
  Save,
  FileText,
  AlertTriangle,
  Pill,
  Heart,
  RotateCcw,
  Eye,
  CircleDot,
  Baby,
} from "lucide-react"
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
} from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AllergiesSection } from "@/components/consulta-clinica/modules/anamnesis/sections/AllergiesSection"
import { GeneralInformationSection } from "@/components/consulta-clinica/modules/anamnesis/sections/GeneralInformationSection"
import { MedicalHistorySection } from "@/components/consulta-clinica/modules/anamnesis/sections/MedicalHistorySection"
import { MedicationsSection } from "@/components/consulta-clinica/modules/anamnesis/sections/MedicationsSection"
import { WomenSpecificSection } from "@/components/consulta-clinica/modules/anamnesis/sections/WomenSpecificSection"
import { PediatricSection } from "@/components/consulta-clinica/modules/anamnesis/sections/PediatricSection"
import { useChangeTracking } from "@/components/consulta-clinica/modules/anamnesis/hooks/useChangeTracking"
import { useUnsavedChanges } from "@/components/consulta-clinica/modules/anamnesis/hooks/useUnsavedChanges"
import { OutsideConsultationBanner } from "./components/OutsideConsultationBanner"
import { ConfirmChangesDialog, type EditContext } from "./components/ConfirmChangesDialog"
import { calculateAge, getAnamnesisRulesByAge } from "@/lib/utils/age-utils"
import { cn } from "@/lib/utils"

interface OutsideConsultationAnamnesisFormProps {
  patientId: number
  initialData: AnamnesisResponse | null
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
  patientBirthDate?: Date | string | null
  onSave?: () => void
  onCancel?: () => void
  /** Whether the form is rendered inside a modal (adjusts styling) */
  isInModal?: boolean
}

// Helper function to map anamnesis response to form values
function mapAnamnesisToFormValues(
  anamnesis: AnamnesisResponse | null
): AnamnesisCreateUpdateBody {
  if (!anamnesis) {
    return {
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
    }
  }

  const payload = anamnesis.payload as Record<string, unknown> | null

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
        medications: (anamnesis.medications || []).map((m) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { label, dose, freq, route, ...rest } = {
            id: m.idAnamnesisMedication,
            medicationId: m.medicationId,
            isActive: m.medication.isActive,
            notes: undefined,
            label: m.medication.label || m.medication.medicationCatalog?.name || null,
            dose: m.medication.dose,
            freq: m.medication.freq,
            route: m.medication.route,
          }
          return rest
        }),
        allergies: (anamnesis.allergies || []).map((a) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { label, ...rest } = {
            id: a.idAnamnesisAllergy,
            allergyId: a.allergyId,
            severity: a.allergy.severity,
            reaction: a.allergy.reaction ?? undefined,
            isActive: a.allergy.isActive,
            notes: undefined,
            label: a.allergy.label || a.allergy.allergyCatalog?.name || null,
          }
          return rest
        }),
    womenSpecific: payload?.womenSpecific as AnamnesisCreateUpdateBody["womenSpecific"] ?? undefined,
    customNotes: (payload?.customNotes as string) ?? "",
  }
}

export function OutsideConsultationAnamnesisForm({
  patientId,
  initialData,
  patientGender = "NO_ESPECIFICADO",
  patientBirthDate,
  onSave,
  onCancel,
  isInModal = false,
}: OutsideConsultationAnamnesisFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  // Calculate age rules for conditional sections
  const ageInfo = useMemo(() => calculateAge(patientBirthDate ?? null), [patientBirthDate])
  const ageRules = useMemo(() => getAnamnesisRulesByAge(ageInfo, patientGender), [ageInfo, patientGender])

  // Initialize form with initial data
  const form = useForm<AnamnesisCreateUpdateBody>({
    resolver: zodResolver(AnamnesisCreateUpdateBodySchema),
    defaultValues: mapAnamnesisToFormValues(initialData),
  })

  const { isDirty } = form.formState
  const currentValues = form.watch()

  // Track changes between initial and current values
  const { changes, hasChanges, hasCriticalChanges, changeCounts } = useChangeTracking({
    initialData,
    currentValues,
  })

  // Unsaved changes warning
  const { hasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges({
    isDirty,
    enabled: true,
    warningMessage: "Tiene cambios sin guardar en la anamnesis. ¿Está seguro que desea salir?",
  })

  // Handle form submission
  const handleSubmit = useCallback(() => {
    // Trigger form validation
    form.trigger().then((isValid) => {
      if (isValid && hasChanges) {
        setShowConfirmDialog(true)
      } else if (!hasChanges) {
        toast.info("No hay cambios para guardar")
      }
    })
  }, [form, hasChanges])

  // Handle confirmed save with edit context
  const handleConfirmedSave = useCallback(async (context: EditContext) => {
    setIsSaving(true)

    try {
      const data = form.getValues()

      // Clean up the data for submission
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
        womenSpecific: ageRules.canShowWomenSpecific ? data.womenSpecific : undefined,
        // Include edit context for outside-consultation
        editContext: {
          isOutsideConsultation: true,
          informationSource: context.informationSource,
          verifiedWithPatient: context.verifiedWithPatient,
          reason: context.reason,
        },
      }

      const res = await fetch(`/api/pacientes/${patientId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      // Reset form state after successful save
      form.reset(data)
      resetUnsavedChanges()
      setShowConfirmDialog(false)

      toast.success("Anamnesis actualizada correctamente", {
        description: hasCriticalChanges
          ? "Los cambios críticos serán revisados en la próxima consulta"
          : undefined,
      })

      onSave?.()
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      throw error // Re-throw to let the dialog handle it
    } finally {
      setIsSaving(false)
    }
  }, [form, patientId, ageRules, hasCriticalChanges, resetUnsavedChanges, onSave])

  // Handle discard
  const handleDiscard = useCallback(() => {
    form.reset(mapAnamnesisToFormValues(initialData))
    resetUnsavedChanges()
    setShowDiscardDialog(false)
    toast.info("Cambios descartados")
  }, [form, initialData, resetUnsavedChanges])

  // Tab configuration with change indicators
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: "general", label: "General", icon: FileText },
      { id: "allergies", label: "Alergias", icon: AlertTriangle, critical: true },
      { id: "medications", label: "Medicaciones", icon: Pill, critical: true },
      { id: "medical", label: "Antecedentes", icon: Heart },
    ]

    // Add conditional tabs based on age rules
    if (ageRules.showPediatricQuestions) {
      baseTabs.push({ id: "pediatric", label: "Pediátrico", icon: Baby })
    }
    if (ageRules.canShowWomenSpecific) {
      baseTabs.push({ id: "women", label: "Mujeres", icon: Heart })
    }

    // Add section change counts
    return baseTabs.map((tab) => {
      const sectionChanges = changes.filter((c) => {
        const sectionLower = c.section.toLowerCase()
        const tabIdLower = tab.id.toLowerCase()
        
        // Match exact section or handle special cases
        if (sectionLower === tabIdLower) return true
        if (tab.id === "medical" && (c.section === "medical_history" || sectionLower === "medical")) return true
        if (tab.id === "general" && (c.section === "general" || c.section === "habits")) return true
        if (tab.id === "women" && (c.section === "women_specific" || sectionLower === "women")) return true
        if (tab.id === "pediatric" && (c.section === "pediatric" || sectionLower === "pediatric")) return true
        
        return false
      })
      return {
        ...tab,
        changeCount: sectionChanges.length,
        hasCriticalChanges: sectionChanges.some((c) => c.severity === "critical"),
      }
    })
  }, [changes, ageRules])

  return (
    <>
      <div className={cn("space-y-4", !isInModal && "space-y-6")}>
        {/* Outside Consultation Banner - Compact in modal */}
        <OutsideConsultationBanner
          hasCriticalChanges={hasCriticalChanges}
          variant={isInModal ? "compact" : "default"}
        />

        {/* Change Summary Header - More compact */}
        {hasChanges && (
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
              <CircleDot className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
              <span className="text-sm font-medium">
                {changeCounts.total} cambio{changeCounts.total > 1 ? "s" : ""}
              </span>
              {changeCounts.critical > 0 && (
                <Badge variant="destructive" className="text-xs h-5">
                  {changeCounts.critical} crítico{changeCounts.critical > 1 ? "s" : ""}
                </Badge>
              )}
              {changeCounts.medium > 0 && (
                <Badge variant="secondary" className="text-xs h-5 bg-amber-100 text-amber-800">
                  {changeCounts.medium} medio{changeCounts.medium > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmDialog(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver
            </Button>
          </div>
        )}

        {/* Form Content with Tabs */}
        <FormProvider {...form}>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Tab List - Responsive with dynamic columns */}
              <TabsList className={cn(
                "grid w-full gap-1 h-auto bg-muted/50 p-1 mb-4",
                // Dynamic grid columns based on number of tabs
                isInModal 
                  ? tabs.length === 4 ? "grid-cols-4" 
                    : tabs.length === 5 ? "grid-cols-5" 
                    : "grid-cols-6"
                  : tabs.length === 4 ? "grid-cols-2 sm:grid-cols-4"
                    : tabs.length === 5 ? "grid-cols-2 sm:grid-cols-5"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
              )}>
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-1.5 py-2 px-2 data-[state=active]:bg-background relative text-xs sm:text-sm"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                      {tab.changeCount > 0 && (
                        <Badge
                          variant={tab.hasCriticalChanges ? "destructive" : "secondary"}
                          className="text-[10px] h-4 min-w-4 px-1 flex items-center justify-center"
                        >
                          {tab.changeCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {/* Tab Content - No extra padding */}
              <div className={cn(
                "border rounded-lg p-4",
                isInModal ? "min-h-[300px]" : "min-h-[400px]"
              )}>
                <TabsContent value="general" className="mt-0 space-y-4">
                  <GeneralInformationSection
                    form={form}
                    canEdit={true}
                    ageRules={ageRules}
                    simplifiedLanguage={ageRules.simplifiedLanguage}
                  />
                </TabsContent>

                <TabsContent value="allergies" className="mt-0 space-y-4">
                  <AllergiesSection
                    form={form}
                    canEdit={true}
                    pacienteId={patientId}
                  />
                </TabsContent>

                <TabsContent value="medications" className="mt-0 space-y-4">
                  <MedicationsSection
                    form={form}
                    canEdit={true}
                    pacienteId={patientId}
                    ageRules={ageRules}
                  />
                </TabsContent>

                <TabsContent value="medical" className="mt-0 space-y-4">
                  <MedicalHistorySection
                    form={form}
                    canEdit={true}
                    pacienteId={patientId}
                    ageRules={ageRules}
                  />
                </TabsContent>

                {ageRules.canShowWomenSpecific && (
                  <TabsContent value="women" className="mt-0 space-y-4">
                    <WomenSpecificSection
                      form={form}
                      canEdit={true}
                      ageRules={ageRules}
                    />
                  </TabsContent>
                )}

                {ageRules.showPediatricQuestions && (
                  <TabsContent value="pediatric" className="mt-0 space-y-4">
                    <PediatricSection
                      form={form}
                      canEdit={true}
                      ageRules={ageRules}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>

            {/* Action Buttons - Sticky at bottom in modal */}
            <div className={cn(
              "flex items-center justify-between gap-3 pt-4 border-t mt-4",
              isInModal && "sticky bottom-0 bg-background pb-1"
            )}>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CircleDot className="h-2.5 w-2.5" />
                    Sin guardar
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiscardDialog(true)}
                    disabled={isSaving}
                    className="text-muted-foreground"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Descartar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || !hasChanges}
                  className="min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* Confirm Changes Dialog */}
      <ConfirmChangesDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={handleConfirmedSave}
        changes={changes}
        isSubmitting={isSaving}
      />

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tiene {changeCounts.total} cambio{changeCounts.total > 1 ? "s" : ""} sin guardar.
              Si descarta los cambios, se perderán todas las modificaciones realizadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
