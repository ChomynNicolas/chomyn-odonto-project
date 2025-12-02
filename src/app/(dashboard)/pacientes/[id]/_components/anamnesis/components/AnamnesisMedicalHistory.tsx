// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/components/AnamnesisMedicalHistory.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { memo } from "react"

// Extended type to include antecedents from API response
type AnamnesisWithAntecedents = PatientAnamnesisDTO & {
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
}

interface AnamnesisMedicalHistoryProps {
  anamnesis: AnamnesisWithAntecedents
}

export const AnamnesisMedicalHistory = memo(function AnamnesisMedicalHistory({
  anamnesis,
}: AnamnesisMedicalHistoryProps) {
  const activeAntecedents = anamnesis.antecedents?.filter((a) => a.isActive) || []

  return (
    <Card className="animate-in fade-in slide-in-from-left-2 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Historia Médica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* motivoConsulta removed - it's now in consulta, not anamnesis */}

        {activeAntecedents.length > 0 ? (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Enfermedades Crónicas</h4>
            <div className="space-y-2">
              {activeAntecedents.map((ant) => (
                <div
                  key={ant.idAnamnesisAntecedent}
                  className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70"
                >
                  <div className="flex-1">
                    <div className="font-medium">{ant.antecedentCatalog?.name || ant.customName}</div>
                    {ant.notes && <p className="text-sm text-muted-foreground mt-1">{ant.notes}</p>}
                    {ant.diagnosedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Diagnosticado: {format(new Date(ant.diagnosedAt), "MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {ant.antecedentCatalog?.category || ant.customCategory || "Otro"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay enfermedades crónicas registradas</p>
        )}
      </CardContent>
    </Card>
  )
})

