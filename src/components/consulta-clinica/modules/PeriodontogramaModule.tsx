// src/components/consulta-clinica/modules/PeriodontogramaModule.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity } from "lucide-react"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface PeriodontogramaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function PeriodontogramaModule({ citaId, consulta, canEdit, onUpdate }: PeriodontogramaModuleProps) {
  // Nota: Este módulo requiere un componente visual completo de periodontograma
  // Por ahora mostramos solo la información básica

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Periodontograma</h3>
        {canEdit && (
          <Button size="sm" disabled>
            <Activity className="h-4 w-4 mr-2" />
            Editar Periodontograma
          </Button>
        )}
      </div>

      {!consulta.periodontograma ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay periodontograma registrado</p>
            {canEdit && (
              <p className="text-sm mt-2">Use el componente de periodontograma para registrar medidas periodontales</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Periodontograma</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registrado: {new Date(consulta.periodontograma.takenAt).toLocaleString()} • Por: {consulta.periodontograma.createdBy.nombre}
            </p>
          </CardHeader>
          <CardContent>
            {consulta.periodontograma.notes && (
              <p className="text-sm mb-4">{consulta.periodontograma.notes}</p>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Medidas registradas: {consulta.periodontograma.measures.length}</p>
              {/* Aquí iría el componente visual del periodontograma */}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
