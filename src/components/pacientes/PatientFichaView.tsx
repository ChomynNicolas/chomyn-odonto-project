"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils/patient-helpers"
import { usePatientContext } from "@/context/PatientDataContext"
import {
  Calendar,
  Activity,
  Clock,
  TrendingUp,
} from "lucide-react"

// Import new section components
import { DemographicsSection } from "./ficha/sections/DemographicsSection"
import { ContactSection } from "./ficha/sections/ContactSection"
import { AddressSection } from "./ficha/sections/AddressSection"
import { EmergencyContactSection } from "./ficha/sections/EmergencyContactSection"
import { ResponsiblePartiesSection } from "./ficha/sections/ResponsiblePartiesSection"
import { ClinicalSummarySection } from "./ficha/sections/ClinicalSummarySection"

interface PatientFichaViewProps {
  patient: PatientRecord
}

export function PatientFichaView({ patient: initialPatient }: PatientFichaViewProps) {
  const { patient, mutate } = usePatientContext()
  const [userRole] = useState<UserRole>("ADMIN")
  const router = useRouter()

  // Use context patient if available, otherwise fallback to initial
  const currentPatient = patient || initialPatient

  const handleUpdate = () => {
    mutate()
    router.refresh()
  }

  const now = new Date()
  const upcomingAppointments =
    currentPatient.appointments?.filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED").length || 0

  const recentAppointments =
    currentPatient.appointments?.filter((apt) => new Date(apt.scheduledAt) <= now && apt.status === "COMPLETED").length || 0

  const activeTreatments = currentPatient.treatmentPlans?.filter((tp) => tp.status === "ACTIVE").length || 0

  const lastVisitDate = currentPatient.appointments && currentPatient.appointments.length > 0
    ? currentPatient.appointments
        .filter((apt) => new Date(apt.scheduledAt) <= now)
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]
        ?.scheduledAt
    : null

  return (
    <div className="space-y-6">
      {/* KPIs Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Citas agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAppointments}</div>
            <p className="text-xs text-muted-foreground">Historial completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tratamientos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTreatments}</div>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Visita</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastVisitDate ? formatDate(lastVisitDate) : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Fecha de última consulta</p>
          </CardContent>
        </Card>
      </div>

      {/* Clinical Summary Section - Prominent placement */}
      <ClinicalSummarySection patient={currentPatient} />

      {/* Demographics Section */}
      <DemographicsSection patient={currentPatient} userRole={userRole} onUpdate={handleUpdate} />

      {/* Contact and Address Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ContactSection patient={currentPatient} userRole={userRole} onUpdate={handleUpdate} />
        <AddressSection patient={currentPatient} userRole={userRole} onUpdate={handleUpdate} />
      </div>

      {/* Emergency Contact Section */}
      <EmergencyContactSection patient={currentPatient} userRole={userRole} onUpdate={handleUpdate} />

      {/* Responsible Parties Section */}
      <ResponsiblePartiesSection patient={currentPatient} />
    </div>
  )
}
