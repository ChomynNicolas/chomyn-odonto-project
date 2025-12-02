// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisWomenSpecific.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, Calendar, Baby, Info } from "lucide-react"
import type { WomenSpecificPayload } from "../types/anamnesis-display.types"
import { formatPregnancyWeeks, formatLastMenstruation } from "../utils/payload-helpers"

interface AnamnesisWomenSpecificProps {
  womenSpecific: WomenSpecificPayload
  className?: string
}

export function AnamnesisWomenSpecific({ womenSpecific, className }: AnamnesisWomenSpecificProps) {
  const isPregnant = womenSpecific.embarazada === true
  const hasMenstrualInfo = womenSpecific.ultimaMenstruacion !== null
  const hasFamilyPlanning = womenSpecific.planificacionFamiliar !== null && womenSpecific.planificacionFamiliar.trim().length > 0

  return (
    <Card className={`border-l-4 border-l-pink-500 ${className || ""}`}>
      <CardHeader className="bg-pink-50/50 dark:bg-pink-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-950">
            <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          </div>
          Información Específica para Mujeres
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Pregnancy Status */}
        {isPregnant && (
          <Alert className="border-pink-300 bg-pink-50 dark:bg-pink-950/20">
            <Baby className="h-4 w-4 text-pink-600" />
            <AlertDescription className="font-medium text-pink-800 dark:text-pink-200">
              <div className="flex items-center justify-between">
                <span>Paciente embarazada</span>
                {womenSpecific.semanasEmbarazo && (
                  <Badge variant="default" className="ml-2">
                    {formatPregnancyWeeks(womenSpecific.semanasEmbarazo)}
                  </Badge>
                )}
              </div>
              {womenSpecific.ultimaMenstruacion && (
                <p className="text-sm mt-1 text-pink-700 dark:text-pink-300">
                  FUM: {formatLastMenstruation(womenSpecific.ultimaMenstruacion)}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Last Menstrual Period (if not pregnant) */}
        {!isPregnant && hasMenstrualInfo && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Última Menstruación (FUM)
            </div>
            <p className="text-base font-semibold">{formatLastMenstruation(womenSpecific.ultimaMenstruacion)}</p>
          </div>
        )}

        {/* Family Planning */}
        {hasFamilyPlanning && (
          <>
            {(!isPregnant || hasMenstrualInfo) && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Info className="h-4 w-4" />
                Planificación Familiar
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{womenSpecific.planificacionFamiliar}</p>
            </div>
          </>
        )}

        {/* No information available */}
        {!isPregnant && !hasMenstrualInfo && !hasFamilyPlanning && (
          <p className="text-sm text-muted-foreground italic">No hay información específica registrada</p>
        )}
      </CardContent>
    </Card>
  )
}

