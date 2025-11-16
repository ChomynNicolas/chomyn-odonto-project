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
}

export function ResponsableSelector({ pacienteId, value, onChange }: ResponsableSelectorProps) {
  const [responsables, setResponsables] = useState<Responsable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const loadResponsables = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/pacientes/${pacienteId}/responsables`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Error al cargar responsables")
      }
      const data = await response.json()
      if (data.ok && Array.isArray(data.data)) {
        setResponsables(data.data)
      } else {
        setResponsables([])
      }
    } catch (error: unknown) {
      console.error("[v0] Error loading responsables:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al cargar responsables"
      setError(errorMessage)
      setResponsables([])
    } finally {
      setLoading(false)
    }
  }, [pacienteId])

  useEffect(() => {
    loadResponsables()
  }, [loadResponsables])

  const getVinculoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      PADRE: "Padre",
      MADRE: "Madre",
      TUTOR: "Tutor",
      AUTORIZADO: "Autorizado",
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
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">No hay responsables registrados</div>
            ) : (
              responsables.map((resp) => (
                <SelectItem key={resp.id} value={resp.id.toString()}>
                  {resp.nombre} ({getVinculoLabel(resp.tipoVinculo)})
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
