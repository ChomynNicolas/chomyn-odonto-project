"use client"

import { useState, useEffect } from "react"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { DiagnosesSection } from "@/components/pacientes/DiagnosesSection"
import { AllergiesSection } from "@/components/pacientes/AllergiesSection"
import { MedicationsSection } from "@/components/pacientes/MedicationsSection"
import { VitalSignsSection } from "@/components/pacientes/VitalSignsSection"
import { OdontogramPreview } from "@/components/pacientes/OdontogramPreview"
import { PeriodontogramPreview } from "@/components/pacientes/PeriodontogramPreview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText } from "lucide-react"
import { toast } from "sonner"

interface ClinicalInfoTabProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate?: () => void
}

interface AnamnesisData {
  idPatientAnamnesis: number
  motivoConsulta: string | null
  payload: {
    historyOfPresentIllness?: string
    pastMedicalHistory?: string
    currentMedications?: string
    allergies?: string
    noKnownAllergies?: boolean
    doctorNotes?: string
  }
  updatedAt: string
  creadoPor: {
    idUsuario: number
    nombreApellido: string
  }
}

export function ClinicalInfoTab({ patient, userRole }: ClinicalInfoTabProps) {
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null)
  const [isLoadingAnamnesis, setIsLoadingAnamnesis] = useState(true)

  // Load anamnesis data
  // Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 418-460
  useEffect(() => {
    fetch(`/api/pacientes/${patient.id}/anamnesis`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            return { data: null }
          }
          throw new Error("Error al cargar anamnesis")
        }
        return res.json()
      })
      .then((data) => {
        if (data.data) {
          setAnamnesis(data.data)
        }
      })
      .catch((error) => {
        console.error("Error loading anamnesis:", error)
        // Don't show error toast, just log it
      })
      .finally(() => {
        setIsLoadingAnamnesis(false)
      })
  }, [patient.id])

  return (
    <div className="space-y-6">
      {/* Anamnesis Summary Section */}
      {/* Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 434-459 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anamnesis
          </CardTitle>
          <CardDescription>
            Información clínica básica del paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnamnesis ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : anamnesis ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Última actualización:{" "}
                  {new Date(anamnesis.updatedAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>Por: {anamnesis.creadoPor.nombreApellido}</span>
              </div>

              {anamnesis.motivoConsulta && (
                <div>
                  <strong className="text-sm font-medium">Motivo de consulta:</strong>
                  <p className="text-sm mt-1 text-muted-foreground">{anamnesis.motivoConsulta}</p>
                </div>
              )}

              {anamnesis.payload?.pastMedicalHistory && (
                <div>
                  <strong className="text-sm font-medium">Antecedentes médicos:</strong>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {anamnesis.payload.pastMedicalHistory}
                  </p>
                </div>
              )}

              {anamnesis.payload?.currentMedications && (
                <div>
                  <strong className="text-sm font-medium">Medicación actual:</strong>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {anamnesis.payload.currentMedications}
                  </p>
                </div>
              )}

              {anamnesis.payload?.allergies && (
                <div>
                  <strong className="text-sm font-medium">Alergias:</strong>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {anamnesis.payload.allergies}
                  </p>
                </div>
              )}

              {anamnesis.payload?.noKnownAllergies && (
                <div className="text-sm text-muted-foreground italic">
                  Sin alergias conocidas
                </div>
              )}

              {anamnesis.payload?.historyOfPresentIllness && (
                <div>
                  <strong className="text-sm font-medium">Historia de la enfermedad actual:</strong>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {anamnesis.payload.historyOfPresentIllness}
                  </p>
                </div>
              )}

              {anamnesis.payload?.doctorNotes && (
                <div>
                  <strong className="text-sm font-medium">Notas del médico / Plan:</strong>
                  <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                    {anamnesis.payload.doctorNotes}
                  </p>
                </div>
              )}

              {!anamnesis.motivoConsulta &&
                !anamnesis.payload?.pastMedicalHistory &&
                !anamnesis.payload?.currentMedications &&
                !anamnesis.payload?.allergies &&
                !anamnesis.payload?.noKnownAllergies &&
                !anamnesis.payload?.historyOfPresentIllness &&
                !anamnesis.payload?.doctorNotes && (
                  <p className="text-sm text-muted-foreground italic">
                    No hay información de anamnesis registrada
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No hay anamnesis registrada para este paciente
            </p>
          )}
        </CardContent>
      </Card>
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
