"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PatientRecord } from "@/lib/types/patient"
import { AlertTriangle, Pill, FileText } from "lucide-react"

interface MedicalHistorySectionProps {
  patient: PatientRecord
}

export function MedicalHistorySection({ patient }: MedicalHistorySectionProps) {
  const hasAllergies = patient.allergies && patient.allergies.length > 0
  const hasMedications = patient.medications && patient.medications.filter((m) => m.status === "ACTIVE").length > 0
  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Antecedentes Médicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alergias Destacadas */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h4 className="font-semibold text-sm">Alergias</h4>
          </div>
          {hasAllergies ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.slice(0, 5).map((allergy) => (
                <Badge key={allergy.id} variant="destructive" className="text-xs">
                  {allergy.allergen}
                </Badge>
              ))}
              {patient.allergies.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{patient.allergies.length - 5} más
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin alergias registradas</p>
          )}
        </div>

        {/* Medicación Actual */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Pill className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-sm">Medicación Actual</h4>
          </div>
          {hasMedications ? (
            <div className="space-y-2">
              {patient.medications
                .filter((m) => m.status === "ACTIVE")
                .slice(0, 3)
                .map((med) => (
                  <div key={med.id} className="text-sm">
                    <p className="font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {med.dosage} - {med.frequency}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin medicación activa</p>
          )}
        </div>

        {/* Diagnósticos Activos */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-purple-500" />
            <h4 className="font-semibold text-sm">Diagnósticos Activos</h4>
          </div>
          {activeDiagnoses.length > 0 ? (
            <div className="space-y-2">
              {activeDiagnoses.slice(0, 3).map((diag) => (
                <div key={diag.id} className="text-sm">
                  <p className="font-medium">{diag.label}</p>
                  {diag.code && <p className="text-xs text-muted-foreground">Código: {diag.code}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin diagnósticos activos</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
