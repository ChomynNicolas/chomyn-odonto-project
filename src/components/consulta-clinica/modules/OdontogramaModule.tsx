// src/components/consulta-clinica/modules/OdontogramaModule.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity } from "lucide-react"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface OdontogramaModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function OdontogramaModule({ citaId, consulta, canEdit, onUpdate }: OdontogramaModuleProps) {
  // Nota: Este módulo requiere un componente visual completo de odontograma
  // Por ahora mostramos solo la información básica

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Odontograma</h3>
        {canEdit && (
          <Button size="sm" disabled>
            <Activity className="h-4 w-4 mr-2" />
            Editar Odontograma
          </Button>
        )}
      </div>

      {!consulta.odontograma ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay odontograma registrado</p>
            {canEdit && (
              <p className="text-sm mt-2">Use el componente de odontograma para registrar el estado dental</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odontograma</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registrado: {new Date(consulta.odontograma.takenAt).toLocaleString()} • Por: {consulta.odontograma.createdBy.nombre}
            </p>
          </CardHeader>
          <CardContent>
            {consulta.odontograma.notes && (
              <p className="text-sm mb-4">{consulta.odontograma.notes}</p>
            )}
            <div className="text-sm text-muted-foreground">
              <p>Entradas registradas: {consulta.odontograma.entries.length}</p>
              {/* Aquí iría el componente visual del odontograma */}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

