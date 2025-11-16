// src/components/pacientes/historia/sections/MedicalBackgroundSection.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, User } from "lucide-react"
import type { PatientRecord } from "@/lib/types/patient"
import { formatDate } from "@/lib/utils/patient-helpers"

interface MedicalBackgroundSectionProps {
  patient: PatientRecord
}

export function MedicalBackgroundSection({ patient }: MedicalBackgroundSectionProps) {
  const diagnoses = patient.diagnoses || []
  const resolvedDiagnoses = diagnoses.filter((d) => d.status === "RESOLVED")
  const activeDiagnoses = diagnoses.filter((d) => d.status === "ACTIVE")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Antecedentes Médicos y Diagnósticos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Diagnósticos Activos */}
        {activeDiagnoses.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Diagnósticos Activos</h4>
            <div className="space-y-3">
              {activeDiagnoses.map((diag) => (
                <div
                  key={diag.id}
                  className="rounded-lg border-l-4 border-purple-500 bg-purple-50 p-4 dark:bg-purple-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{diag.label}</p>
                        {diag.code && (
                          <Badge variant="outline" className="text-xs">
                            {diag.code}
                          </Badge>
                        )}
                        <Badge variant="default" className="text-xs">
                          Activo
                        </Badge>
                      </div>
                      {diag.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{diag.notes}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Diagnosticado: {formatDate(diag.diagnosedAt)}
                        </span>
                        {diag.professional && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {diag.professional.firstName} {diag.professional.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diagnósticos Resueltos */}
        {resolvedDiagnoses.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Diagnósticos Resueltos</h4>
            <div className="space-y-2">
              {resolvedDiagnoses.map((diag) => (
                <div
                  key={diag.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{diag.label}</p>
                      {diag.code && (
                        <Badge variant="outline" className="text-xs">
                          {diag.code}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Resuelto
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Diagnosticado: {formatDate(diag.diagnosedAt)}</span>
                      {diag.resolvedAt && <span>Resuelto: {formatDate(diag.resolvedAt)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {diagnoses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay diagnósticos registrados</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

