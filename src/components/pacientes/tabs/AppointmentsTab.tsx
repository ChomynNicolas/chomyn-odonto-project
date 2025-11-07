"use client"

import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { AppointmentsSection } from "@/components/pacientes/AppointmentsSection"
import { TreatmentPlanSection } from "@/components/pacientes/TreatmentPlanSection"
import { toast } from "sonner"

interface AppointmentsTabProps {
  patient: PatientRecord
  userRole: UserRole
  onNewAppointment: () => void
  onUpdate: () => void
}

export function AppointmentsTab({ patient, userRole, onNewAppointment, onUpdate }: AppointmentsTabProps) {
  return (
    <div className="space-y-6">
      {/* Appointments */}
      <AppointmentsSection
        appointments={patient.appointments || []}
        userRole={userRole}
        onNewAppointment={onNewAppointment}
        onViewInAgenda={(id) => toast("Ver en agenda", { description: `Cita ${id}` })}
        onReschedule={(id) => toast("Reprogramar", { description: `Cita ${id}` })}
      />

      {/* Treatment plan */}
      <TreatmentPlanSection
        treatmentPlans={patient.treatmentPlans || []}
        userRole={userRole}
        onMarkProgress={(id) => toast("Progreso marcado", { description: `Paso ${id}` })}
      />
    </div>
  )
}
