"use client"

import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { DiagnosesSection } from "@/components/pacientes/DiagnosesSection"
import { AllergiesSection } from "@/components/pacientes/AllergiesSection"
import { MedicationsSection } from "@/components/pacientes/MedicationsSection"
import { VitalSignsSection } from "@/components/pacientes/VitalSignsSection"
import { OdontogramPreview } from "@/components/pacientes/OdontogramPreview"
import { PeriodontogramPreview } from "@/components/pacientes/PeriodontogramPreview"
import { toast } from "sonner"

interface ClinicalInfoTabProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function ClinicalInfoTab({ patient, userRole, onUpdate }: ClinicalInfoTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  )
}
