"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePatientData } from "@/lib/hooks/use-patient-data"
import type { UserRole } from "@/lib/types/patient"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PatientHeader } from "@/components/pacientes/PatientHeader"
import { PatientKPIsCard } from "@/components/pacientes/PatientKpis"
import { NuevaCitaSheet } from "@/components/agenda/NuevaCitaSheet"
import { toast } from "sonner"
import { PersonalInfoTab } from "@/components/pacientes/tabs/PersonalInfoTab"
import { ClinicalInfoTab } from "@/components/pacientes/tabs/ClinicalInfoTab"
import { AppointmentsTab } from "@/components/pacientes/tabs/AppointmentsTab"
import { AttachmentsTab } from "@/components/pacientes/tabs/AttachmentsTab"
import { FileText, Activity, Calendar, Paperclip } from "lucide-react"

function nextQuarterHour(base = new Date()) {
  const d = new Date(base)
  d.setSeconds(0, 0)
  const m = d.getMinutes()
  d.setMinutes(m + (15 - (m % 15 || 15)))
  return d
}

export default function PatientRecordPage({ patientId }: { patientId: string }) {
  const router = useRouter()
  const { patient, kpis, isLoading, error } = usePatientData(patientId)
  const [openNuevaCita, setOpenNuevaCita] = useState(false)
  const [userRole] = useState<UserRole>("ADMIN")
  const [activeTab, setActiveTab] = useState("personal")

  const defaultInicio = useMemo(() => nextQuarterHour(new Date()), [])
  const currentUser = { rol: userRole, profesionalId: undefined } as const

  console.log({ kpis })

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
        onEditPatient={() => {}}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
        onViewAudit={() => toast("Auditoría", { description: "Funcionalidad en desarrollo" })}
      />

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {/* KPIs */}
        {kpis && <PatientKPIsCard kpis={kpis} />}

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Información Personal</span>
                <span className="sm:hidden">Personal</span>
              </TabsTrigger>
              <TabsTrigger value="clinical" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Información Clínica</span>
                <span className="sm:hidden">Clínica</span>
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Citas y Tratamientos</span>
                <span className="sm:hidden">Citas</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">Adjuntos</span>
                <span className="sm:hidden">Archivos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-6">
              <PersonalInfoTab patient={patient} userRole={userRole} onUpdate={() => router.refresh()} />
            </TabsContent>

            <TabsContent value="clinical" className="mt-6">
              <ClinicalInfoTab patient={patient} userRole={userRole} onUpdate={() => router.refresh()} />
            </TabsContent>

            <TabsContent value="appointments" className="mt-6">
              <AppointmentsTab
                patient={patient}
                userRole={userRole}
                onNewAppointment={() => setOpenNuevaCita(true)}
                onUpdate={() => router.refresh()}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-6">
              <AttachmentsTab patient={patient} userRole={userRole} onUpdate={() => router.refresh()} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <NuevaCitaSheet
        open={openNuevaCita}
        onOpenChange={setOpenNuevaCita}
        defaults={{ inicio: defaultInicio }}
        currentUser={currentUser}
        prefill={{
          pacienteId: Number(patient.id),
          lockPaciente: true,
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
        <Skeleton className="h-32 w-full" />
        <div className="mt-6 space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}
