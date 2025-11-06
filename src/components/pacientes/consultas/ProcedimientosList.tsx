"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Calendar, DollarSign, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"
import { Skeleton } from "@/components/ui/skeleton"

interface Procedimiento {
  idConsultaProcedimiento: number
  consultaId: number
  procedureId: number | null
  serviceType: string | null
  toothNumber: number | null
  toothSurface: string | null
  quantity: number
  unitPriceCents: number | null
  totalCents: number | null
  resultNotes: string | null
  createdAt: string
  catalogo: {
    id: number
    code: string | null
    nombre: string | null
  } | null
  adjuntosCount: number
}

interface ProcedimientosListProps {
  pacienteId: string
}

export function ProcedimientosList({ pacienteId }: ProcedimientosListProps) {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProcedimientos() {
      try {
        const res = await fetch(`/api/pacientes/${pacienteId}/procedimientos`)
        if (!res.ok) throw new Error("Error al cargar procedimientos")
        const data = await res.json()
        setProcedimientos(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    fetchProcedimientos()
  }, [pacienteId])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (procedimientos.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No hay procedimientos registrados para este paciente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {procedimientos.map((proc) => (
        <Card key={proc.idConsultaProcedimiento}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {proc.catalogo?.nombre || proc.serviceType || "Procedimiento sin nombre"}
                  {proc.catalogo?.code && (
                    <Badge variant="outline" className="text-xs">
                      {proc.catalogo.code}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {formatDate(proc.createdAt, true)}
                </CardDescription>
              </div>
              {proc.totalCents !== null && (
                <div className="text-right">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />${(proc.totalCents / 100).toFixed(2)}
                  </p>
                  {proc.quantity > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {proc.quantity} x ${((proc.unitPriceCents || 0) / 100).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(proc.toothNumber || proc.toothSurface) && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {proc.toothNumber && `Diente ${proc.toothNumber}`}
                    {proc.toothSurface && ` - ${proc.toothSurface}`}
                  </Badge>
                </div>
              )}
              {proc.resultNotes && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Notas:
                  </p>
                  <p className="text-sm text-muted-foreground">{proc.resultNotes}</p>
                </div>
              )}
              {proc.adjuntosCount > 0 && <Badge variant="outline">{proc.adjuntosCount} adjunto(s)</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
