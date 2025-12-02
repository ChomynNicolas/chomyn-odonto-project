"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { getAllergySevertiyLabel } from "@/lib/translations/allergy"
import { memo } from "react"

// Extended type to include allergies from API response
type AnamnesisWithAllergies = PatientAnamnesisDTO & {
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
}

interface AnamnesisAllergiesListProps {
  anamnesis: AnamnesisWithAllergies
  activeAllergiesCount: number
}

export const AnamnesisAllergiesList = memo(function AnamnesisAllergiesList({
  anamnesis,
  activeAllergiesCount,
}: AnamnesisAllergiesListProps) {
  const activeAllergies =
    anamnesis.allergies?.filter(
      (a) => a.allergy.isActive
    ) || []

  return (
    <Card
      className={`animate-in fade-in slide-in-from-left-2 duration-300 ${
        activeAllergiesCount > 0 ? "border-red-200 dark:border-red-900" : ""
      }`}
    >
      <CardHeader className={activeAllergiesCount > 0 ? "bg-red-50 dark:bg-red-950/20" : ""}>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle
            className={`h-5 w-5 ${activeAllergiesCount > 0 ? "text-red-600" : "text-primary"}`}
          />
          Alergias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAllergies.length > 0 ? (
          activeAllergies.map((allergy) => (
            <div
              key={allergy.idAnamnesisAllergy}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 transition-colors hover:bg-red-100 dark:hover:bg-red-950/30 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-red-800 dark:text-red-200">
                  {allergy.allergy.allergyCatalog?.name || allergy.allergy.label}
                </div>
                {allergy.allergy.severity && (
                  <Badge variant="destructive" className="text-xs">
                    {getAllergySevertiyLabel(allergy.allergy.severity)}
                  </Badge>
                )}
              </div>
              {allergy.allergy.reaction && (
                <p className="text-sm text-red-700 dark:text-red-300">Reacción: {allergy.allergy.reaction}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No hay alergias registradas</p>
        )}
      </CardContent>
    </Card>
  )
})
