// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisDentalHealth.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Smile } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { memo } from "react"

interface AnamnesisDentalHealthProps {
  anamnesis: PatientAnamnesisDTO
}

export const AnamnesisDentalHealth = memo(function AnamnesisDentalHealth({
  anamnesis,
}: AnamnesisDentalHealthProps) {
  return (
    <Card className="animate-in fade-in slide-in-from-right-2 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-5 w-5 text-primary" />
          Salud Dental
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <dt className="text-sm font-medium text-muted-foreground">Cepillados por día</dt>
            <dd className="text-sm font-semibold">{anamnesis.higieneCepilladosDia || "No especificado"}</dd>
          </div>
          <Separator />
          <div className="flex justify-between items-center py-2">
            <dt className="text-sm font-medium text-muted-foreground">Usa hilo dental</dt>
            <dd className="text-sm font-semibold">
              <Badge variant={anamnesis.usaHiloDental ? "default" : "secondary"}>
                {anamnesis.usaHiloDental ? "Sí" : "No"}
              </Badge>
            </dd>
          </div>
          <Separator />
          <div className="flex justify-between items-center py-2">
            <dt className="text-sm font-medium text-muted-foreground">Bruxismo</dt>
            <dd className="text-sm font-semibold">
              <Badge variant={anamnesis.bruxismo ? "destructive" : "secondary"}>
                {anamnesis.bruxismo ? "Sí" : "No"}
              </Badge>
            </dd>
          </div>
          {anamnesis.ultimaVisitaDental && (
            <>
              <Separator />
              <div className="flex justify-between items-center py-2">
                <dt className="text-sm font-medium text-muted-foreground">Última visita dental</dt>
                <dd className="text-sm font-semibold">
                  {format(new Date(anamnesis.ultimaVisitaDental), "dd/MM/yyyy", { locale: es })}
                </dd>
              </div>
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  )
})

