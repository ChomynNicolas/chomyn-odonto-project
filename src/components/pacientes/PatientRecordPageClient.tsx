"use client"

import { useState,useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePatientData } from "@/lib/hooks/use-patient-data"
import type { UserRole } from "@/lib/types/patient"
import { Skeleton } from "@/components/ui/skeleton"
import { AllergiesSection } from "@/components/pacientes/AllergiesSection"
import { AppointmentsSection } from "@/components/pacientes/AppointmentsSection"
import { AttachmentsGallery } from "@/components/pacientes/AttachmentsGallery"
import { ContactsSection } from "@/components/pacientes/ContactsSection"
import { DiagnosesSection } from "@/components/pacientes/DiagnosesSection"
import { MedicationsSection } from "@/components/pacientes/MedicationsSection"
import { OdontogramPreview } from "@/components/pacientes/OdontogramPreview"
import { PatientHeader } from "@/components/pacientes/PatientHeader"
import { PatientKPIsCard } from "@/components/pacientes/PatientKpis"
import { PeriodontogramPreview } from "@/components/pacientes/PeriodontogramPreview"
import { PersonalDataSection } from "@/components/pacientes/PersonalDataSection"
import { ResponsiblePartiesSection } from "@/components/pacientes/ResponsiblePartiesSection"
import { TreatmentPlanSection } from "@/components/pacientes/TreatmentPlanSection"
import { VitalSignsSection } from "@/components/pacientes/VitalSignsSection"
import { toast } from "sonner"
import { NuevaCitaSheet } from "@/components/agenda/NuevaCitaSheet";

function nextQuarterHour(base = new Date()) {
  const d = new Date(base);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m + (15 - (m % 15 || 15)));
  return d;
}

export default function PatientRecordPage({ patientId }: { patientId: string }) {
  const router = useRouter()
  const { patient, kpis, isLoading, error } = usePatientData(patientId)
  const [openNuevaCita, setOpenNuevaCita] = useState(false);
  const [userRole] = useState<UserRole>("ADMIN")

  // Sugerir hora inicio: próximo cuarto de hora
  const defaultInicio = useMemo(() => nextQuarterHour(new Date()), []);

  // Simula el currentUser mínimo; reemplaza con lo que tengas de auth
  const currentUser = { rol: userRole, profesionalId: undefined } as const;

  console.log({kpis})



  if (isLoading) {
    return <PatientRecordSkeleton />
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">Error al cargar paciente</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message || "No se pudo cargar la información del paciente"}
          </p>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    router.push(`/pacientes/${patientId}/print`)
  }

  const handleExportPDF = () => {
    toast("Exportando PDF", { description: "La exportación comenzará en breve..." })
    // Implement PDF export logic
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <PatientHeader
        patient={patient}
        userRole={userRole}
        onNewAppointment={() => setOpenNuevaCita(true)}
        onEditPatient={() => toast("Editar Paciente", { description: "Funcionalidad en desarrollo" })}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
        onViewAudit={() => toast("Auditoría", { description: "Funcionalidad en desarrollo" })}
      />

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* KPIs */}
            {kpis && <PatientKPIsCard kpis={kpis} />}

            {/* Recent events timeline */}

            {/* Appointments */}
            <AppointmentsSection
              appointments={patient.appointments || []}
              userRole={userRole}
              onNewAppointment={() => toast("Nueva cita")}
              onViewInAgenda={(id) => toast("Ver en agenda", { description: `Cita ${id}` })}
              onReschedule={(id) => toast("Reprogramar", { description: `Cita ${id}` })}
            />

            {/* Treatment plan */}
            <TreatmentPlanSection
              treatmentPlans={patient.treatmentPlans || []}
              userRole={userRole}
              onMarkProgress={(id) => toast("Progreso marcado", { description: `Paso ${id}` })}
            />

            {/* Diagnoses */}
            <DiagnosesSection
              diagnoses={patient.diagnoses || []}
              userRole={userRole}
              onAddDiagnosis={() => toast("Agregar diagnóstico")}
            />

            {/* Allergies */}
            <AllergiesSection
              allergies={patient.allergies || []}
              userRole={userRole}
              onAddAllergy={() => toast("Agregar alergia")}
            />

            {/* Medications */}
            <MedicationsSection
              medications={patient.medications || []}
              userRole={userRole}
              onAddMedication={() => toast("Agregar medicación")}
              onSuspendMedication={(id) => toast("Medicación suspendida", { description: `ID: ${id}` })}
            />

            {/* Vital signs */}
            <VitalSignsSection
              vitalSigns={patient.vitalSigns || []}
              userRole={userRole}
              onAddVitalSigns={() => toast("Registrar signos vitales")}
            />

            {/* Odontogram */}
            <OdontogramPreview
              snapshots={patient.odontogramSnapshots || []}
              userRole={userRole}
              onAddSnapshot={() => toast("Registrar odontograma")}
            />

            {/* Periodontogram */}
            <PeriodontogramPreview
              snapshots={patient.periodontogramSnapshots || []}
              userRole={userRole}
              onAddSnapshot={() => toast("Registrar periodontograma")}
            />

            {/* Attachments */}
            <AttachmentsGallery
              attachments={patient.attachments || []}
              userRole={userRole}
              onUpload={() => toast("Subir adjunto")}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PersonalDataSection
              patient={patient}
              userRole={userRole}
              onEdit={() => toast("Editar datos personales")}
            />

            <ContactsSection
              contacts={patient.contacts || []}
              userRole={userRole}
              onAdd={() => toast("Agregar contacto")}
              onEdit={(id) => toast("Editar contacto", { description: `ID: ${id}` })}
            />

            <ResponsiblePartiesSection
              responsibleParties={patient.responsibleParties || []}
              userRole={userRole}
              onAdd={() => toast("Agregar responsable")}
            />
          </div>
        </div>
      </div>
      <NuevaCitaSheet
        open={openNuevaCita}
        onOpenChange={setOpenNuevaCita}
        defaults={{ inicio: defaultInicio }}
        currentUser={currentUser}
        prefill={{
          pacienteId: Number(patient.id),
          lockPaciente: true,           // 👈 bloquear selector de paciente
          motivo: "Consulta desde ficha",
          tipo: "CONSULTA",
        }}
        onSuccess={() => {
          toast.success("Cita creada", { description: "Se actualizó la ficha." })
          router.refresh()
        }}
      />
    </div>
  )
}

function PatientRecordSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
      
    </div>
  )
}
