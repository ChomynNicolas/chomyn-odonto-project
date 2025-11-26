// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisPediatricInfo.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Baby, Milk, AlertTriangle } from "lucide-react"
import type { PediatricSpecificPayload } from "../types/anamnesis-display.types"
import { getLactanciaLabel, getLactanciaBadgeVariant } from "../utils/payload-helpers"
import type { PatientAnamnesisDTO } from "@/types/patient"

interface AnamnesisPediatricInfoProps {
  pediatricSpecific: PediatricSpecificPayload | null
  anamnesis: PatientAnamnesisDTO
  className?: string
}

export function AnamnesisPediatricInfo({ pediatricSpecific, anamnesis, className }: AnamnesisPediatricInfoProps) {
  // Get lactanciaRegistrada from payload or fallback to direct field
  const lactanciaRegistrada =
    pediatricSpecific?.lactanciaRegistrada !== undefined && pediatricSpecific?.lactanciaRegistrada !== null
      ? pediatricSpecific.lactanciaRegistrada
      : typeof anamnesis.lactanciaRegistrada === "boolean"
      ? anamnesis.lactanciaRegistrada
      : null

  // Get tieneHabitosSuccion from payload or fallback to direct field
  const tieneHabitosSuccion =
    pediatricSpecific?.tieneHabitosSuccion !== undefined
      ? pediatricSpecific.tieneHabitosSuccion
      : anamnesis.tieneHabitosSuccion

  const hasLactanciaInfo = lactanciaRegistrada !== null && lactanciaRegistrada !== undefined
  const hasSuccionInfo = tieneHabitosSuccion !== null && tieneHabitosSuccion !== undefined
  const hasTobaccoExposure = anamnesis.expuestoHumoTabaco !== null && anamnesis.expuestoHumoTabaco !== undefined

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <Baby className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          Información Pediátrica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {/* Lactancia */}
          {hasLactanciaInfo && (
            <>
              <div className="flex justify-between items-center py-2">
                <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Milk className="h-4 w-4" />
                  Lactancia
                </dt>
                <dd className="text-sm font-semibold">
                  <Badge variant={getLactanciaBadgeVariant(lactanciaRegistrada)}>
                    {getLactanciaLabel(lactanciaRegistrada)}
                  </Badge>
                </dd>
              </div>
              {(hasSuccionInfo || hasTobaccoExposure) && <Separator />}
            </>
          )}

          {/* Hábitos de succión */}
          {hasSuccionInfo && (
            <>
              <div className="flex justify-between items-center py-2">
                <dt className="text-sm font-medium text-muted-foreground">Hábitos de succión</dt>
                <dd className="text-sm font-semibold">
                  <Badge variant={tieneHabitosSuccion ? "secondary" : "outline"}>
                    {tieneHabitosSuccion ? "Sí" : "No"}
                  </Badge>
                </dd>
              </div>
              {hasTobaccoExposure && <Separator />}
            </>
          )}

          {/* Exposición a humo de tabaco */}
          {hasTobaccoExposure && (
            <div className="flex justify-between items-center py-2">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Exposición a humo de tabaco
              </dt>
              <dd className="text-sm font-semibold">
                <Badge variant={anamnesis.expuestoHumoTabaco ? "destructive" : "outline"}>
                  {anamnesis.expuestoHumoTabaco ? "Sí" : "No"}
                </Badge>
              </dd>
            </div>
          )}

          {/* No information available */}
          {!hasLactanciaInfo && !hasSuccionInfo && !hasTobaccoExposure && (
            <p className="text-sm text-muted-foreground italic py-2">No hay información pediátrica registrada</p>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}

