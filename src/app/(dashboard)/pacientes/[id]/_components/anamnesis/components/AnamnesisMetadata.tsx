// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisMetadata.tsx
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, User, Info } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PatientAnamnesisDTO } from "@/types/patient"
import type { AnamnesisMetadata } from "../types/anamnesis-display.types"
import { memo } from "react"

interface AnamnesisMetadataProps {
  anamnesis: PatientAnamnesisDTO
  metadata: AnamnesisMetadata | null
}

export const AnamnesisMetadata = memo(function AnamnesisMetadata({ anamnesis, metadata }: AnamnesisMetadataProps) {
  return (
    <Card className="bg-muted/30 animate-in fade-in duration-300">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Creado por: {anamnesis.creadoPor.nombreApellido}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Creado: {format(new Date(anamnesis.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Tipo: {anamnesis.tipo}</span>
          </div>
          {metadata && (
            <>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>Versión formulario: {metadata.formVersion}</span>
              </div>
              {metadata.completedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    Completado: {format(new Date(metadata.completedAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

