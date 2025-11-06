"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronRight, Clock, User } from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface Consulta {
  citaId: number
  performedById: number
  status: "DRAFT" | "FINAL"
  startedAt: string | null
  finishedAt: string | null
  reason: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  createdAt: string
  cita: {
    inicio: string
    tipo: string
    profesional: {
      usuario: {
        nombreApellido: string
      }
    }
  }
  _count: {
    procedimientos: number
  }
}

interface ConsultasListProps {
  pacienteId: string
}

export function ConsultasList({ pacienteId }: ConsultasListProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConsultas() {
      try {
        const res = await fetch(`/api/pacientes/${pacienteId}/consultas`)
        if (!res.ok) throw new Error("Error al cargar consultas")
        const data = await res.json()
        setConsultas(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    fetchConsultas()
  }, [pacienteId])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
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

  if (consultas.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No hay consultas registradas para este paciente</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {consultas.map((consulta) => (
        <Card key={consulta.citaId} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(consulta.cita.inicio, true)}
                  <Badge variant={consulta.status === "FINAL" ? "default" : "secondary"}>
                    {consulta.status === "FINAL" ? "Finalizada" : "Borrador"}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {consulta.cita.profesional.usuario.nombreApellido}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {consulta.cita.tipo}
                  </span>
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/pacientes/${pacienteId}/consultas/${consulta.citaId}`}>
                  Ver detalles
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {consulta.reason && (
                <div>
                  <p className="text-sm font-medium">Motivo:</p>
                  <p className="text-sm text-muted-foreground">{consulta.reason}</p>
                </div>
              )}
              {consulta.diagnosis && (
                <div>
                  <p className="text-sm font-medium">Diagnóstico:</p>
                  <p className="text-sm text-muted-foreground">{consulta.diagnosis}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="outline">{consulta._count.procedimientos} procedimiento(s)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
