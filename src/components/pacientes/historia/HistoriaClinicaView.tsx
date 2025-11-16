// src/components/pacientes/historia/HistoriaClinicaView.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, FileText, Stethoscope, Clock } from "lucide-react"
import { usePatientContext } from "@/context/PatientDataContext"
import { calculateAge } from "@/lib/utils/patient-helpers"
import { QuickSummaryCard } from "./sections/QuickSummaryCard"
import { AnamnesisSummarySection } from "./sections/AnamnesisSummarySection"
import { MedicalBackgroundSection } from "./sections/MedicalBackgroundSection"
import { ClinicalNotesTimeline } from "./sections/ClinicalNotesTimeline"
import { AnamnesisTimeline } from "./sections/AnamnesisTimeline"
import { AddDiagnosisDialog } from "./AddDiagnosisDialog"
import { AddAllergyDialog } from "./AddAllergyDialog"
import { AddMedicationDialog } from "./AddMedicationDialog"
import { AddVitalSignsDialog } from "./AddVitalSignsDialog"
import { AddClinicalNoteDialog } from "./AddClinicalNoteDialog"
import { toast } from "sonner"

interface HistoriaClinicaViewProps {
  patientId: string
}

/**
 * Vista rediseñada de Historia Clínica
 * 
 * Características:
 * - Vista unificada que integra anamnesis, alergias, medicaciones y signos vitales
 * - Diseño responsive con tabs y acordeones
 * - Resumen rápido en la parte superior
 * - Navegación clara entre secciones
 * - Estados vacíos informativos
 */
export function HistoriaClinicaView({ patientId }: HistoriaClinicaViewProps) {
  const { patient, isLoading, error, mutate } = usePatientContext()
  const [activeTab, setActiveTab] = useState("resumen")
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false)
  const [showAddAllergy, setShowAddAllergy] = useState(false)
  const [showAddMedication, setShowAddMedication] = useState(false)
  const [showAddVitals, setShowAddVitals] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)

  const handleSuccess = () => {
    mutate()
    toast.success("Registro agregado exitosamente")
  }

  if (isLoading) {
    return <HistoriaClinicaSkeleton />
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Error al cargar historia clínica</h3>
              <p className="text-sm text-muted-foreground">
                {error?.message || "No se pudo cargar la información del paciente"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Historia Clínica</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <p className="text-lg">
            {patient.firstName} {patient.lastName}
          </p>
          {patient.dateOfBirth && (
            <>
              <span>•</span>
              <span className="text-sm">
                {new Date(patient.dateOfBirth).toLocaleDateString("es-PY")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Resumen Rápido - Siempre visible */}
      <QuickSummaryCard patient={patient} />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4">
          <TabsTrigger value="resumen" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="anamnesis" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Anamnesis</span>
          </TabsTrigger>
          <TabsTrigger value="antecedentes" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Antecedentes</span>
          </TabsTrigger>
          <TabsTrigger value="evolucion" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Evolución</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen General */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Anamnesis Resumida */}
            <AnamnesisSummarySection
              patient={patient}
              onAddAllergy={() => setShowAddAllergy(true)}
              onAddMedication={() => setShowAddMedication(true)}
              onAddVitalSigns={() => setShowAddVitals(true)}
              onAddNote={() => setShowAddNote(true)}
            />

            {/* Antecedentes Médicos */}
            <MedicalBackgroundSection patient={patient} />
          </div>
        </TabsContent>

        {/* Tab: Anamnesis Completa */}
        <TabsContent value="anamnesis" className="space-y-6">
          {/* Anamnesis completa desde evolución */}
          <AnamnesisTimeline
            patientId={patientId}
            patientAge={patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null}
          />
          
          {/* Resumen de anamnesis (alergias, medicaciones, etc.) */}
          <AnamnesisSummarySection
            patient={patient}
            onAddAllergy={() => setShowAddAllergy(true)}
            onAddMedication={() => setShowAddMedication(true)}
            onAddVitalSigns={() => setShowAddVitals(true)}
            onAddNote={() => setShowAddNote(true)}
          />
        </TabsContent>

        {/* Tab: Antecedentes Médicos Detallados */}
        <TabsContent value="antecedentes" className="space-y-6">
          <MedicalBackgroundSection patient={patient} />
        </TabsContent>

        {/* Tab: Evolución y Notas Clínicas */}
        <TabsContent value="evolucion" className="space-y-6">
          <ClinicalNotesTimeline patientId={patientId} onAddNote={() => setShowAddNote(true)} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddDiagnosisDialog
        open={showAddDiagnosis}
        onOpenChange={setShowAddDiagnosis}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
      <AddAllergyDialog
        open={showAddAllergy}
        onOpenChange={setShowAddAllergy}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
      <AddMedicationDialog
        open={showAddMedication}
        onOpenChange={setShowAddMedication}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
      <AddVitalSignsDialog
        open={showAddVitals}
        onOpenChange={setShowAddVitals}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
      <AddClinicalNoteDialog
        open={showAddNote}
        onOpenChange={setShowAddNote}
        patientId={patientId}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

function HistoriaClinicaSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-48" />
      </div>
      
      {/* Quick Summary Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <Skeleton className="h-12 w-full" />
      
      {/* Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}
