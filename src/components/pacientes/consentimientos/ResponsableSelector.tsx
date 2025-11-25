"use client"

import { useState, useEffect, useCallback } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { AddResponsableDialog } from "./AddResponsableDialog"

interface Responsable {
  id: number
  nombre: string
  tipoVinculo: string
}

interface ResponsableSelectorProps {
  pacienteId: number
  value?: number
  onChange: (id: number) => void
  allowSelfForSurgery?: boolean // Permitir que el paciente se seleccione a sí mismo (para cirugías de adultos)
}

export function ResponsableSelector({ pacienteId, value, onChange, allowSelfForSurgery = false }: ResponsableSelectorProps) {
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const loadResponsables = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const promises = [
        fetch(`/api/pacientes/${pacienteId}/responsables`)
      ]
      
      // Si se permite auto-selección para cirugía, también cargar datos del paciente
      if (allowSelfForSurgery) {
        promises.push(fetch(`/api/pacientes/${pacienteId}`))
      }
      
      const responses = await Promise.all(promises)
      
      // Procesar responsables
      const responsablesResponse = responses[0]
      if (!responsablesResponse.ok) {
        const errorData = await responsablesResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al cargar responsables")
      }
      const responsablesData = await responsablesResponse.json()
      let responsablesList: Responsable[] = []
      if (responsablesData.ok && Array.isArray(responsablesData.data)) {
        responsablesList = responsablesData.data
      }
      
      // Si se permite auto-selección para cirugía, agregar al paciente como opción
      if (allowSelfForSurgery && responses[1]) {
        const pacienteResponse = responses[1]
        if (pacienteResponse.ok) {
          const pacienteData = await pacienteResponse.json()
          if (pacienteData.ok && pacienteData.data?.persona) {
            const persona = pacienteData.data.persona
            // Agregar al paciente como primera opción con indicador claro
            responsablesList.unshift({
              id: persona.idPersona,
              nombre: `${persona.nombres} ${persona.apellidos} (Paciente)`.trim(),
              tipoVinculo: "PACIENTE_ADULTO"
            })
          }
        }
      }
      
      setResponsables(responsablesList)
    } catch (error: unknown) {
      console.error("[v0] Error loading responsables:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al cargar responsables"
      setError(errorMessage)
      setResponsables([])
    } finally {
      setLoading(false)
    }
  }, [pacienteId, allowSelfForSurgery])

  useEffect(() => {
    loadResponsables()
  }, [loadResponsables])

  const getVinculoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      PADRE: "Padre",
      MADRE: "Madre",
      TUTOR: "Tutor",
      AUTORIZADO: "Autorizado",
      PACIENTE_ADULTO: "Paciente adulto",
      PACIENTE: "Paciente",
    }
    return labels[tipo] || tipo
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando responsables...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={loadResponsables}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2">
        <Select value={value?.toString()} onValueChange={(v) => onChange(Number.parseInt(v))}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecciona un responsable" />
          </SelectTrigger>
          <SelectContent>
            {responsables.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {allowSelfForSurgery ? "No se pudo cargar la información del paciente" : "No hay responsables registrados"}
              </div>
            ) : (
              responsables.map((resp) => (
                <SelectItem key={resp.id} value={resp.id.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>{resp.nombre}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({getVinculoLabel(resp.tipoVinculo)})
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <AddResponsableDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        pacienteId={pacienteId}
        onSuccess={() => {
          loadResponsables()
          setAddDialogOpen(false)
        }}
      />
    </>
  )
}
