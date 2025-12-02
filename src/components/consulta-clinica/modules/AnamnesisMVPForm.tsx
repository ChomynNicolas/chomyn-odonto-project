// src/components/consulta-clinica/modules/AnamnesisMVPForm.tsx
// MVP: Simple anamnesis form component
// Reference: ANAMNESIS_MVP_IMPLEMENTATION.md lines 200-400

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Loader2, Save, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AnamnesisMVPFormProps {
  pacienteId: number
  consultaId?: number
  initialData?: {
    motivoConsulta?: string | null
    payload?: Record<string, unknown>
  } | null
  onSave?: () => void
  canEdit?: boolean
}

/**
 * AnamnesisMVPForm Component
 * 
 * Simple single-page form for entering basic anamnesis information.
 * Satisfies requirement: "Single-page, vertically stacked fields" (line 199)
 * 
 * Fields:
 * - motivoConsulta (required): Chief complaint / Reason for visit
 * - historyOfPresentIllness: Brief history of present illness
 * - pastMedicalHistory: Relevant past medical history
 * - currentMedications: Current medications
 * - allergies: Allergies (with "no known allergies" checkbox)
 * - doctorNotes: Doctor notes / plan
 */
export function AnamnesisMVPForm({
  pacienteId,
  consultaId,
  initialData,
  onSave,
  canEdit = true,
}: AnamnesisMVPFormProps) {
  const [formData, setFormData] = useState({
    motivoConsulta: "",
    historyOfPresentIllness: "",
    pastMedicalHistory: "",
    currentMedications: "",
    allergies: "",
    noKnownAllergies: false,
    doctorNotes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load existing anamnesis data
  useEffect(() => {
    if (initialData) {
      // Use provided initial data
      setFormData({
        motivoConsulta: initialData.motivoConsulta || "",
        historyOfPresentIllness: typeof initialData.payload?.historyOfPresentIllness === "string" ? initialData.payload.historyOfPresentIllness : "",
        pastMedicalHistory: typeof initialData.payload?.pastMedicalHistory === "string" ? initialData.payload.pastMedicalHistory : "",
        currentMedications: typeof initialData.payload?.currentMedications === "string" ? initialData.payload.currentMedications : "",
        allergies: typeof initialData.payload?.allergies === "string" ? initialData.payload.allergies : "",
        noKnownAllergies: typeof initialData.payload?.noKnownAllergies === "boolean" ? initialData.payload.noKnownAllergies : false,
        doctorNotes: typeof initialData.payload?.doctorNotes === "string" ? initialData.payload.doctorNotes : "",
      })
    } else {
      // Fetch existing anamnesis from API
      setIsLoading(true)
      fetch(`/api/pacientes/${pacienteId}/anamnesis`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 404) {
              // No anamnesis exists yet, keep empty form
              return { data: null }
            }
            throw new Error("Error al cargar anamnesis")
          }
          return res.json()
        })
        .then((data) => {
          if (data.data) {
            setFormData({
              motivoConsulta: data.data.motivoConsulta || "",
              historyOfPresentIllness: data.data.payload?.historyOfPresentIllness || "",
              pastMedicalHistory: data.data.payload?.pastMedicalHistory || "",
              currentMedications: data.data.payload?.currentMedications || "",
              allergies: data.data.payload?.allergies || "",
              noKnownAllergies: data.data.payload?.noKnownAllergies || false,
              doctorNotes: data.data.payload?.doctorNotes || "",
            })
          }
        })
        .catch((error) => {
          console.error("Error loading anamnesis:", error)
          toast.error("Error al cargar anamnesis")
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [pacienteId, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required field
    if (!formData.motivoConsulta.trim()) {
      toast.error("El motivo de consulta es requerido")
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          consultaId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      
      toast.success("Anamnesis guardada correctamente")
      onSave?.()
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar anamnesis")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle "no known allergies" checkbox
  const handleNoKnownAllergiesChange = (checked: boolean) => {
    setFormData({
      ...formData,
      noKnownAllergies: checked,
      allergies: checked ? "" : formData.allergies, // Clear allergies if checked
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando anamnesis...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Anamnesis
        </CardTitle>
        <CardDescription>
          Información clínica básica del paciente. Los campos marcados con * son obligatorios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canEdit && (
          <Alert className="mb-4">
            <AlertDescription>
              No tienes permisos para editar la anamnesis. Solo lectura.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chief complaint - Required */}
          <div>
            <Label htmlFor="motivoConsulta">
              Motivo de consulta <span className="text-destructive">*</span>
            </Label>
            <Input
              id="motivoConsulta"
              value={formData.motivoConsulta}
              onChange={(e) => setFormData({ ...formData, motivoConsulta: e.target.value })}
              required
              maxLength={200}
              placeholder="Ej: Dolor en muela superior derecha"
              disabled={!canEdit}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.motivoConsulta.length}/200 caracteres
            </p>
          </div>

          {/* History of present illness */}
          <div>
            <Label htmlFor="historyOfPresentIllness">Historia de la enfermedad actual</Label>
            <Textarea
              id="historyOfPresentIllness"
              value={formData.historyOfPresentIllness}
              onChange={(e) =>
                setFormData({ ...formData, historyOfPresentIllness: e.target.value })
              }
              rows={3}
              placeholder="Describa el problema actual, síntomas, duración..."
              disabled={!canEdit}
              className="mt-1"
            />
          </div>

          {/* Past medical history */}
          <div>
            <Label htmlFor="pastMedicalHistory">Antecedentes médicos relevantes</Label>
            <Textarea
              id="pastMedicalHistory"
              value={formData.pastMedicalHistory}
              onChange={(e) =>
                setFormData({ ...formData, pastMedicalHistory: e.target.value })
              }
              rows={3}
              placeholder="Enfermedades, cirugías previas, condiciones crónicas..."
              disabled={!canEdit}
              className="mt-1"
            />
          </div>

          {/* Current medications */}
          <div>
            <Label htmlFor="currentMedications">Medicación actual</Label>
            <Textarea
              id="currentMedications"
              value={formData.currentMedications}
              onChange={(e) =>
                setFormData({ ...formData, currentMedications: e.target.value })
              }
              rows={2}
              placeholder="Medicamentos que toma actualmente, dosis, frecuencia..."
              disabled={!canEdit}
              className="mt-1"
            />
          </div>

          {/* Allergies */}
          <div>
            <Label htmlFor="allergies">Alergias</Label>
            <div className="flex items-center space-x-2 mb-2 mt-1">
              <Checkbox
                id="noKnownAllergies"
                checked={formData.noKnownAllergies}
                onCheckedChange={handleNoKnownAllergiesChange}
                disabled={!canEdit}
              />
              <Label
                htmlFor="noKnownAllergies"
                className="font-normal cursor-pointer text-sm"
              >
                Sin alergias conocidas
              </Label>
            </div>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              rows={2}
              placeholder="Liste las alergias conocidas (medicamentos, alimentos, etc.)..."
              disabled={!canEdit || formData.noKnownAllergies}
              className="mt-1"
            />
          </div>

          {/* Doctor notes / plan */}
          <div>
            <Label htmlFor="doctorNotes">Notas del médico / Plan</Label>
            <Textarea
              id="doctorNotes"
              value={formData.doctorNotes}
              onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales, plan de tratamiento, observaciones..."
              disabled={!canEdit}
              className="mt-1"
            />
          </div>

          {canEdit && (
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Anamnesis
                </>
              )}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

