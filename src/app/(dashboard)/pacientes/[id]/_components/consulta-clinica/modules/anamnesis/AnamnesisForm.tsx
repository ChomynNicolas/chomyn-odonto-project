"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface AnamnesisFormProps {
  pacienteId: number
  initialData: Record<string, unknown> | null
  onSave: () => void
  canEdit: boolean
  patientGender?: string
}

// Mock form component for demo purposes
export function AnamnesisForm({ onSave }: AnamnesisFormProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Este es un formulario de demostración. En producción, aquí se mostraría el formulario completo de anamnesis
            con todos los campos necesarios.
          </p>
          <div className="flex gap-2">
            <Button onClick={onSave}>Guardar Cambios</Button>
            <Button variant="outline" onClick={onSave}>
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
