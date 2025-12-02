// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisSummaryCards.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Activity, Pill, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { memo } from "react"

// Extended type to include all relations from API response
type AnamnesisWithAllRelations = PatientAnamnesisDTO & {
  medications?: Array<{
    idAnamnesisMedication: number
    medicationId: number | null
    medication: {
      idPatientMedication: number
      label: string
      medicationCatalog: {
        idMedicationCatalog: number
        name: string
        description: string | null
      } | null
      dose: string | null
      freq: string | null
      route: string | null
      isActive: boolean
    }
    notes: string | null
  }>
  allergies?: Array<{
    idAnamnesisAllergy: number
    allergyId: number | null
    allergy: {
      idPatientAllergy: number
      label: string
      allergyCatalog: {
        idAllergyCatalog: number
        name: string
      } | null
      severity: string
      reaction: string | null
      isActive: boolean
    }
  }>
  antecedents?: Array<{
    idAnamnesisAntecedent: number
    anamnesisId: number
    antecedentId: number | null
    antecedentCatalog: {
      idAntecedentCatalog: number
      code: string
      name: string
      category: string
      description: string | null
    } | null
    customName: string | null
    customCategory: string | null
    notes: string | null
    diagnosedAt: string | null
    isActive: boolean
    resolvedAt: string | null
  }>
  actualizadoPor?: {
    idUsuario: number
    nombreApellido: string
  } | null
}

interface AnamnesisSummaryCardsProps {
  anamnesis: AnamnesisWithAllRelations
  canEdit: boolean
  onEdit: () => void
}

export const AnamnesisSummaryCards = memo(function AnamnesisSummaryCards({
  anamnesis,
}: AnamnesisSummaryCardsProps) {
  const activeMedicationsCount = anamnesis.medications?.filter((m) => m.medication.isActive).length || 0
  const activeAllergiesCount = anamnesis.allergies?.filter((a) => a.allergy.isActive).length || 0
  const activeAntecedentsCount = anamnesis.antecedents?.filter((a) => a.isActive).length || 0
  const hasCurrentPain = anamnesis.tieneDolorActual

  return (
    <Card className="border-l-4 border-l-primary animate-in fade-in slide-in-from-top-2 duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl font-semibold">Resumen Ejecutivo</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Última actualización:{" "}
              {format(new Date(anamnesis.updatedAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
              {anamnesis.actualizadoPor && (
                <span className="ml-1">por {anamnesis.actualizadoPor.nombreApellido}</span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pain Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70">
            <div className={`p-2 rounded-full ${hasCurrentPain ? "bg-destructive/10" : "bg-primary/10"}`}>
              <Zap className={`h-5 w-5 ${hasCurrentPain ? "text-destructive" : "text-primary"}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Dolor Actual</div>
              <div className="text-lg font-semibold">
                {hasCurrentPain ? `Sí (${anamnesis.dolorIntensidad}/10)` : "No"}
              </div>
            </div>
          </div>

          {/* Chronic Diseases */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70">
            <div
              className={`p-2 rounded-full ${activeAntecedentsCount > 0 ? "bg-amber-100 dark:bg-amber-950" : "bg-primary/10"}`}
            >
              <Activity
                className={`h-5 w-5 ${activeAntecedentsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}
              />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Enfermedades Crónicas</div>
              <div className="text-lg font-semibold">{activeAntecedentsCount}</div>
            </div>
          </div>

          {/* Medications */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70">
            <div
              className={`p-2 rounded-full ${activeMedicationsCount > 0 ? "bg-blue-100 dark:bg-blue-950" : "bg-primary/10"}`}
            >
              <Pill
                className={`h-5 w-5 ${activeMedicationsCount > 0 ? "text-blue-600 dark:text-blue-400" : "text-primary"}`}
              />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Medicamentos Actuales</div>
              <div className="text-lg font-semibold">{activeMedicationsCount}</div>
            </div>
          </div>

          {/* Allergies */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70">
            <div
              className={`p-2 rounded-full ${activeAllergiesCount > 0 ? "bg-red-100 dark:bg-red-950" : "bg-primary/10"}`}
            >
              <AlertTriangle
                className={`h-5 w-5 ${activeAllergiesCount > 0 ? "text-red-600 dark:text-red-400" : "text-primary"}`}
              />
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Alergias Activas</div>
              <div className="text-lg font-semibold">{activeAllergiesCount}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

