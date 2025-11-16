"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"

interface ClinicalNote {
  id: number
  title: string
  notes: string
  fecha: string
  createdBy: {
    firstName: string
    lastName: string
  }
}

interface ClinicalNotesSectionProps {
  patientId: string
  onAddNote: () => void
}

export function ClinicalNotesSection({ patientId, onAddNote }: ClinicalNotesSectionProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotes = useCallback(async () => {
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
  }, [patientId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notas Clínicas</CardTitle>
        <Button onClick={onAddNote} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Agregar Nota
        </Button>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay notas clínicas registradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold">{note.title}</h4>
                    <p className="mt-2 text-sm text-muted-foreground">{note.notes}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(note.fecha)} - {note.createdBy.firstName} {note.createdBy.lastName}
                    </p>
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
