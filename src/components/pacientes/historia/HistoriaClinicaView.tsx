"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, AlertCircle, Pill, Activity, Stethoscope } from "lucide-react"
import { DiagnosesSection } from "@/components/pacientes/DiagnosesSection"
import { AllergiesSection } from "@/components/pacientes/AllergiesSection"
import { MedicationsSection } from "@/components/pacientes/MedicationsSection"
import { VitalSignsSection } from "@/components/pacientes/VitalSignsSection"
import { ClinicalNotesSection } from "./ClinicalNotesSection"
import { MedicalHistorySection } from "./MedicalHistorySection"
import { AddDiagnosisDialog } from "./AddDiagnosisDialog"
import { AddAllergyDialog } from "./AddAllergyDialog"
import { AddMedicationDialog } from "./AddMedicationDialog"
import { AddVitalSignsDialog } from "./AddVitalSignsDialog"
import { AddClinicalNoteDialog } from "./AddClinicalNoteDialog"
import { toast } from "sonner"
import { usePatientContext } from "@/context/PatientDataContext"

interface HistoriaClinicaViewProps {
  patientId: string
}

export function HistoriaClinicaView({ patientId }: HistoriaClinicaViewProps) {
  const { patient, isLoading, error, mutate } = usePatientContext()
  const [activeTab, setActiveTab] = useState("resumen")
  const [showAddDiagnosis, setShowAddDiagnosis] = useState(false)
  const [showAddAllergy, setShowAddAllergy] = useState(false)
  const [showAddMedication, setShowAddMedication] = useState(false)
  const [showAddVitals, setShowAddVitals] = useState(false)
  const [showAddNote, setShowAddNote] = useState(false)

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

  const handleSuccess = () => {
    mutate()
    toast.success("Registro agregado exitosamente")
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Historia Clínica</h1>
        <p className="text-muted-foreground">
          {patient.firstName} {patient.lastName}
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen">
            <FileText className="mr-2 h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="diagnosticos">
            <Stethoscope className="mr-2 h-4 w-4" />
            Diagnósticos
          </TabsTrigger>
          <TabsTrigger value="alergias">
            <AlertCircle className="mr-2 h-4 w-4" />
            Alergias
          </TabsTrigger>
          <TabsTrigger value="medicacion">
            <Pill className="mr-2 h-4 w-4" />
            Medicación
          </TabsTrigger>
          <TabsTrigger value="vitales">
            <Activity className="mr-2 h-4 w-4" />
            Signos Vitales
          </TabsTrigger>
        </TabsList>

        {/* Resumen Tab */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MedicalHistorySection patient={patient} />
            <ClinicalNotesSection patientId={patientId} onAddNote={() => setShowAddNote(true)} />
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Diagnósticos Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {patient.diagnoses?.filter((d) => d.status === "ACTIVE").length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Alergias Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{patient.allergies?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Medicación Activa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {patient.medications?.filter((m) => m.status === "ACTIVE").length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Últimos Signos Vitales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {patient.vitalSigns && patient.vitalSigns.length > 0
                    ? new Date(patient.vitalSigns[0].recordedAt).toLocaleDateString()
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diagnósticos Tab */}
        <TabsContent value="diagnosticos">
          <DiagnosesSection
            diagnoses={patient.diagnoses || []}
            userRole="ADMIN"
            onAddDiagnosis={() => setShowAddDiagnosis(true)}
          />
        </TabsContent>

        {/* Alergias Tab */}
        <TabsContent value="alergias">
          <AllergiesSection
            allergies={patient.allergies || []}
            userRole="ADMIN"
            onAddAllergy={() => setShowAddAllergy(true)}
          />
        </TabsContent>

        {/* Medicación Tab */}
        <TabsContent value="medicacion">
          <MedicationsSection
            medications={patient.medications || []}
            userRole="ADMIN"
            onAddMedication={() => setShowAddMedication(true)}
            onSuspendMedication={(id) => {
              toast.info("Suspendiendo medicación", { description: `ID: ${id}` })
            }}
          />
        </TabsContent>

        {/* Signos Vitales Tab */}
        <TabsContent value="vitales">
          <VitalSignsSection
            vitalSigns={patient.vitalSigns || []}
            userRole="ADMIN"
            onAddVitalSigns={() => setShowAddVitals(true)}
          />
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
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
