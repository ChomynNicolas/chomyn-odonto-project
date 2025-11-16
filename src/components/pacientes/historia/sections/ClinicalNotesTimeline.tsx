// src/components/pacientes/historia/sections/ClinicalNotesTimeline.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, FileText, Calendar, User } from "lucide-react"
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

interface ClinicalNotesTimelineProps {
  patientId: string
  onAddNote?: () => void
}

export function ClinicalNotesTimeline({ patientId, onAddNote }: ClinicalNotesTimelineProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true)
        // Buscar anamnesis desde las consultas del paciente
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

  // Filtrar notas (excluir anamnesis, que se muestran en otro componente)
  const clinicalNotesOnly = useMemo(() => {
    return notes.filter(
      (note) => note.title !== "Anamnesis Completa" && !note.title?.includes("Anamnesis")
    )
  }, [notes])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Notas Clínicas y Evolución
        </CardTitle>
        {onAddNote && (
          <Button onClick={onAddNote} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Nota
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {clinicalNotesOnly.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-3 h-16 w-16 text-muted-foreground/50" />
            <p className="mb-1 text-sm font-medium">No hay notas clínicas registradas</p>
            <p className="text-xs text-muted-foreground">
              Las notas clínicas se registran durante las consultas
            </p>
            {onAddNote && (
              <Button onClick={onAddNote} variant="outline" size="sm" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Primera Nota
              </Button>
            )}
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Timeline */}
            {clinicalNotesOnly.map((note, index) => (
              <div key={note.id} className="relative flex gap-4">
                {/* Timeline line */}
                {index < clinicalNotesOnly.length - 1 && (
                  <div className="absolute left-3 top-8 h-full w-0.5 bg-border" />
                )}
                
                {/* Timeline dot */}
                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>

                {/* Note content */}
                <div className="flex-1 space-y-2 pb-6">
                  <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {note.title && (
                          <h4 className="mb-2 font-semibold">{note.title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {note.notes}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(note.fecha)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {note.createdBy.nombre}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

