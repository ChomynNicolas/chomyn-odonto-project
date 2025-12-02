// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisMedicationsList.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Pill } from "lucide-react"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { memo } from "react"

// Extended type to include medications from API response
type AnamnesisWithMedications = PatientAnamnesisDTO & {
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
}

interface AnamnesisMedicationsListProps {
  anamnesis: AnamnesisWithMedications
}

export const AnamnesisMedicationsList = memo(function AnamnesisMedicationsList({
  anamnesis,
}: AnamnesisMedicationsListProps) {
  const activeMedications = anamnesis.medications?.filter((m) => m.medication.isActive) || []

  return (
    <Card className="animate-in fade-in slide-in-from-right-2 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Medicación Actual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeMedications.length > 0 ? (
          activeMedications.map((med) => (
            <div
              key={med.idAnamnesisMedication}
              className="p-3 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70 space-y-1"
            >
              <div className="font-medium">{med.medication.medicationCatalog?.name || med.medication.label}</div>
              {med.medication.dose && (
                <p className="text-sm text-muted-foreground">Dosis: {med.medication.dose}</p>
              )}
              {med.medication.freq && (
                <p className="text-sm text-muted-foreground">Frecuencia: {med.medication.freq}</p>
              )}
              {med.medication.route && (
                <Badge variant="outline" className="text-xs mt-1">
                  {med.medication.route}
                </Badge>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No hay medicamentos actuales registrados</p>
        )}
      </CardContent>
    </Card>
  )
})

