// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisCriticalAlerts.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, AlertTriangle, Heart } from "lucide-react"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { memo } from "react"

interface AnamnesisCriticalAlertsProps {
  anamnesis: PatientAnamnesisDTO
  activeAllergiesCount: number
  activeAntecedentsCount: number
}

export const AnamnesisCriticalAlerts = memo(function AnamnesisCriticalAlerts({
  anamnesis,
  activeAllergiesCount,
  activeAntecedentsCount,
}: AnamnesisCriticalAlertsProps) {
  const hasHighUrgency = anamnesis.urgenciaPercibida === "URGENCIA" || anamnesis.urgenciaPercibida === "PRIORITARIO"
  const hasCurrentPain = anamnesis.tieneDolorActual
  const hasCriticalConditions = activeAllergiesCount > 0 || activeAntecedentsCount > 0
  const isPregnant = anamnesis.embarazada === true

  // Only show if there are critical alerts
  if (!hasHighUrgency && !hasCurrentPain && !hasCriticalConditions && !isPregnant) {
    return null
  }

  return (
    <Card className="border-2 border-destructive animate-in fade-in slide-in-from-top-2 duration-300">
      <CardHeader className="bg-destructive/5">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Alertas Críticas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-3">
        {hasCurrentPain && (
          <Alert variant="destructive" className="animate-in fade-in duration-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Dolor actual reportado: Intensidad {anamnesis.dolorIntensidad}/10
              {anamnesis.urgenciaPercibida && (
                <span className="ml-2">
                  - Urgencia:{" "}
                  {anamnesis.urgenciaPercibida === "URGENCIA"
                    ? "Urgencia"
                    : anamnesis.urgenciaPercibida === "PRIORITARIO"
                    ? "Prioritario"
                    : anamnesis.urgenciaPercibida}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {isPregnant && (
          <Alert className="border-pink-300 bg-pink-50 dark:bg-pink-950/20 animate-in fade-in duration-300">
            <Heart className="h-4 w-4 text-pink-600" />
            <AlertDescription className="font-medium text-pink-800 dark:text-pink-200">
              Paciente embarazada - Considerar precauciones especiales
            </AlertDescription>
          </Alert>
        )}

        {activeAllergiesCount > 0 && (
          <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20 animate-in fade-in duration-300">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="font-medium text-red-800 dark:text-red-200">
              {activeAllergiesCount} alergia{activeAllergiesCount > 1 ? "s" : ""} activa
              {activeAllergiesCount > 1 ? "s" : ""} registrada{activeAllergiesCount > 1 ? "s" : ""}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
})

