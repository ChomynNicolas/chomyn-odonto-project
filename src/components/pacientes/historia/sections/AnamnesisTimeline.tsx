// src/components/pacientes/historia/sections/AnamnesisTimeline.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, FileText, Calendar, User } from "lucide-react"
import { AnamnesisView, type AnamnesisData } from "./AnamnesisView"
import { formatDate } from "@/lib/utils/patient-helpers"

interface ClinicalNote {
  id: number
  title: string | null
  notes: string
  fecha: string
  createdBy: {
    id: number
    nombre: string
  }
  createdAt: string
}

interface AnamnesisTimelineProps {
  patientId: string
  patientAge?: number | null
}

/**
 * Componente que muestra todas las anamnesis del paciente en formato timeline
 * Detecta automáticamente las anamnesis (title === "Anamnesis Completa") y las parsea
 */
export function AnamnesisTimeline({ patientId, patientAge }: AnamnesisTimelineProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(`/api/pacientes/${patientId}/historia/notas`)
        if (res.ok) {
          const data = await res.json()
          setNotes(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching clinical notes:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotes()
  }, [patientId])

  // Filtrar y parsear anamnesis
  const anamnesisEntries = useMemo(() => {
    return notes
      .filter((note) => note.title === "Anamnesis Completa" || note.title?.includes("Anamnesis"))
      .map((note) => {
        try {
          const parsed = JSON.parse(note.notes) as AnamnesisData
          return {
            ...note,
            anamnesisData: parsed,
          }
        } catch (e) {
          console.error("Error parsing anamnesis JSON:", e)
          return null
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  }, [notes])

  // Determinar si es paciente pediátrico
  const isPediatric = patientAge !== null && patientAge !== undefined && patientAge < 18

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (anamnesisEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Anamnesis Odontológica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-16 w-16 text-muted-foreground/50" />
            <p className="mb-1 text-sm font-medium">No hay anamnesis registradas</p>
            <p className="text-xs text-muted-foreground">
              La anamnesis se completa durante la consulta clínica
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con resumen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Anamnesis Odontológica
            </CardTitle>
            <Badge variant="secondary">{anamnesisEntries.length} registro(s)</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline de anamnesis */}
      <div className="relative space-y-6">
        {anamnesisEntries.map((entry, index) => (
          <div key={entry.id} className="relative">
            {/* Timeline line */}
            {index < anamnesisEntries.length - 1 && (
              <div className="absolute left-6 top-16 h-full w-0.5 bg-border" />
            )}

            {/* Timeline dot */}
            <div className="relative z-10 mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Anamnesis del {formatDate(entry.fecha)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Registrada por {entry.createdBy.nombre}
                </p>
              </div>
            </div>

            {/* Anamnesis content */}
            <div className="ml-16">
              <AnamnesisView
                anamnesisData={entry.anamnesisData}
                fecha={entry.fecha}
                createdBy={entry.createdBy.nombre}
                isPediatric={isPediatric}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

