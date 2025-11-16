// src/components/pacientes/historia/sections/QuickSummaryCard.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Pill, Activity, FileText, Calendar } from "lucide-react"
import type { PatientRecord } from "@/lib/types/patient"
import { formatDate } from "@/lib/utils/patient-helpers"

interface QuickSummaryCardProps {
  patient: PatientRecord
}

export function QuickSummaryCard({ patient }: QuickSummaryCardProps) {
  const activeAllergies = patient.allergies?.filter((a) => a.isActive !== false) || []
  const activeMedications = patient.medications?.filter(
    (m) => m.status === "ACTIVE" || m.status === "active"
  ) || []
  const latestVitals = patient.vitalSigns?.[0] || null
  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Alergias */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Alergias Activas</p>
              <p className="text-2xl font-bold">{activeAllergies.length}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          {activeAllergies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {activeAllergies.slice(0, 2).map((allergy) => (
                <Badge key={allergy.id} variant="destructive" className="text-xs">
                  {allergy.label || allergy.allergen || "Alergia"}
                </Badge>
              ))}
              {activeAllergies.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{activeAllergies.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medicación */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Medicación Activa</p>
              <p className="text-2xl font-bold">{activeMedications.length}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          {activeMedications.length > 0 && (
            <div className="mt-3 space-y-1">
              {activeMedications.slice(0, 2).map((med) => (
                <p key={med.id} className="text-xs text-muted-foreground truncate">
                  {med.label || med.name || "Medicación"}
                </p>
              ))}
              {activeMedications.length > 2 && (
                <p className="text-xs text-muted-foreground">+{activeMedications.length - 2} más</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signos Vitales */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Últimos Signos Vitales</p>
              {latestVitals ? (
                <p className="text-2xl font-bold">
                  {latestVitals.systolicBP && latestVitals.diastolicBP
                    ? `${latestVitals.systolicBP}/${latestVitals.diastolicBP}`
                    : latestVitals.heartRate
                      ? `${latestVitals.heartRate} bpm`
                      : "—"}
                </p>
              ) : (
                <p className="text-2xl font-bold">—</p>
              )}
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          {latestVitals && (
            <p className="mt-3 text-xs text-muted-foreground">
              {formatDate(latestVitals.recordedAt)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Diagnósticos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Diagnósticos Activos</p>
              <p className="text-2xl font-bold">{activeDiagnoses.length}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          {activeDiagnoses.length > 0 && (
            <div className="mt-3 space-y-1">
              {activeDiagnoses.slice(0, 2).map((diag) => (
                <p key={diag.id} className="text-xs text-muted-foreground truncate">
                  {diag.label}
                </p>
              ))}
              {activeDiagnoses.length > 2 && (
                <p className="text-xs text-muted-foreground">+{activeDiagnoses.length - 2} más</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

