// src/components/consulta-clinica/modules/anamnesis/hooks/useChangeTracking.ts
// Hook for tracking and categorizing changes between form values and initial data

"use client"

import { useMemo, useCallback } from "react"
import type {  AnamnesisResponse } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AnamnesisCreateUpdateBodySchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"

export type ChangeSeverity = "critical" | "medium" | "low"
export type ChangeType = "added" | "removed" | "modified"

export interface FieldChange {
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  changeType: ChangeType
  severity: ChangeSeverity
  section: string
}

// Field configuration with labels, sections, and severity levels
const FIELD_CONFIG: Record<string, { label: string; section: string; severity: ChangeSeverity }> = {
  // General fields (low severity)
  // motivoConsulta removed - it's now in consulta, not anamnesis
  tieneDolorActual: { label: "Tiene dolor actual", section: "general", severity: "low" },
  dolorIntensidad: { label: "Intensidad del dolor", section: "general", severity: "low" },
  urgenciaPercibida: { label: "Urgencia percibida", section: "general", severity: "low" },
  ultimaVisitaDental: { label: "Última visita dental", section: "general", severity: "low" },
  customNotes: { label: "Notas adicionales", section: "general", severity: "low" },

  // Critical fields (allergies and medications)
  tieneAlergias: { label: "Tiene alergias", section: "allergies", severity: "critical" },
  allergies: { label: "Lista de alergias", section: "allergies", severity: "critical" },
  tieneMedicacionActual: { label: "Tiene medicación actual", section: "medications", severity: "critical" },
  medications: { label: "Lista de medicaciones", section: "medications", severity: "critical" },

  // Medium severity (medical history)
  tieneEnfermedadesCronicas: { label: "Tiene enfermedades crónicas", section: "medical_history", severity: "medium" },
  antecedents: { label: "Antecedentes médicos", section: "medical_history", severity: "medium" },

  // Habits (low to medium severity)
  expuestoHumoTabaco: { label: "Expuesto a humo de tabaco", section: "habits", severity: "low" },
  bruxismo: { label: "Bruxismo", section: "habits", severity: "low" },
  higieneCepilladosDia: { label: "Cepillados por día", section: "habits", severity: "low" },
  usaHiloDental: { label: "Usa hilo dental", section: "habits", severity: "low" },

  // Women-specific (medium severity)
  "womenSpecific.embarazada": { label: "Embarazada", section: "women_specific", severity: "medium" },
  "womenSpecific.semanasEmbarazo": { label: "Semanas de embarazo", section: "women_specific", severity: "medium" },
  "womenSpecific.ultimaMenstruacion": { label: "Última menstruación", section: "women_specific", severity: "low" },
  "womenSpecific.planificacionFamiliar": { label: "Planificación familiar", section: "women_specific", severity: "low" },

  // Pediatric (low severity)
  tieneHabitosSuccion: { label: "Tiene hábitos de succión", section: "pediatric", severity: "low" },
  lactanciaRegistrada: { label: "Tipo de lactancia", section: "pediatric", severity: "low" },
}

function getFieldConfig(fieldPath: string) {
  return FIELD_CONFIG[fieldPath] || {
    label: fieldPath,
    section: "other",
    severity: "low" as ChangeSeverity,
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined) return b === null || b === undefined
  if (b === null || b === undefined) return false
  
  if (typeof a !== typeof b) return false
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    // For arrays, we do a deep comparison
    return JSON.stringify(a) === JSON.stringify(b)
  }
  
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  
  return false
}

function getChangeType(oldValue: unknown, newValue: unknown): ChangeType {
  const oldEmpty = oldValue === null || oldValue === undefined || 
    (Array.isArray(oldValue) && oldValue.length === 0) ||
    oldValue === ""
  const newEmpty = newValue === null || newValue === undefined || 
    (Array.isArray(newValue) && newValue.length === 0) ||
    newValue === ""

  if (oldEmpty && !newEmpty) return "added"
  if (!oldEmpty && newEmpty) return "removed"
  return "modified"
}

function extractValue(obj: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!obj) return undefined
  
  const parts = path.split(".")
  let current: unknown = obj
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  
  return current
}

// Map AnamnesisResponse to comparable form values
function mapResponseToComparable(response: AnamnesisResponse | null): Record<string, unknown> {
  if (!response) return {}

  const payload = response.payload as Record<string, unknown> | null

  return {
    // motivoConsulta removed - it's now in consulta, not anamnesis
    tieneDolorActual: response.tieneDolorActual,
    dolorIntensidad: response.dolorIntensidad,
    urgenciaPercibida: response.urgenciaPercibida,
    tieneEnfermedadesCronicas: response.tieneEnfermedadesCronicas,
    tieneAlergias: response.tieneAlergias,
    tieneMedicacionActual: response.tieneMedicacionActual,
    expuestoHumoTabaco: response.expuestoHumoTabaco,
    bruxismo: response.bruxismo,
    higieneCepilladosDia: response.higieneCepilladosDia,
    usaHiloDental: response.usaHiloDental,
    ultimaVisitaDental: response.ultimaVisitaDental,
    tieneHabitosSuccion: response.tieneHabitosSuccion,
    lactanciaRegistrada: response.lactanciaRegistrada,
    antecedents: response.antecedents || [],
    medications: response.medications || [],
    allergies: response.allergies || [],
    womenSpecific: payload?.womenSpecific || null,
    customNotes: payload?.customNotes || "",
  }
}

interface UseChangeTrackingOptions {
  initialData: AnamnesisResponse | null
  currentValues: Partial<z.input<typeof AnamnesisCreateUpdateBodySchema>>
}

interface UseChangeTrackingResult {
  changes: FieldChange[]
  hasChanges: boolean
  hasCriticalChanges: boolean
  changeCounts: {
    total: number
    critical: number
    medium: number
    low: number
  }
  getFieldChange: (fieldPath: string) => FieldChange | undefined
  isFieldChanged: (fieldPath: string) => boolean
}

export function useChangeTracking({
  initialData,
  currentValues,
}: UseChangeTrackingOptions): UseChangeTrackingResult {
  
  const initialComparable = useMemo(
    () => mapResponseToComparable(initialData),
    [initialData]
  )

  const changes = useMemo(() => {
    const changeList: FieldChange[] = []
    
    // Fields to compare
    const fieldsToCheck = [
      // motivoConsulta removed - it's now in consulta, not anamnesis
      "tieneDolorActual",
      "dolorIntensidad",
      "urgenciaPercibida",
      "tieneEnfermedadesCronicas",
      "tieneAlergias",
      "tieneMedicacionActual",
      "expuestoHumoTabaco",
      "bruxismo",
      "higieneCepilladosDia",
      "usaHiloDental",
      "ultimaVisitaDental",
      "tieneHabitosSuccion",
      "lactanciaRegistrada",
      "antecedents",
      "medications",
      "allergies",
      "customNotes",
    ]

    // Check regular fields
    for (const field of fieldsToCheck) {
      const oldValue = extractValue(initialComparable, field)
      const newValue = extractValue(currentValues as Record<string, unknown>, field)
      
      if (!isEqual(oldValue, newValue)) {
        const config = getFieldConfig(field)
        changeList.push({
          fieldPath: field,
          fieldLabel: config.label,
          oldValue,
          newValue,
          changeType: getChangeType(oldValue, newValue),
          severity: config.severity,
          section: config.section,
        })
      }
    }

    // Check womenSpecific nested fields
    const womenSpecificFields = [
      "womenSpecific.embarazada",
      "womenSpecific.semanasEmbarazo",
      "womenSpecific.ultimaMenstruacion",
      "womenSpecific.planificacionFamiliar",
    ]

    for (const field of womenSpecificFields) {
      const oldValue = extractValue(initialComparable, field)
      const newValue = extractValue(currentValues as Record<string, unknown>, field)
      
      if (!isEqual(oldValue, newValue)) {
        const config = getFieldConfig(field)
        changeList.push({
          fieldPath: field,
          fieldLabel: config.label,
          oldValue,
          newValue,
          changeType: getChangeType(oldValue, newValue),
          severity: config.severity,
          section: config.section,
        })
      }
    }

    return changeList
  }, [initialComparable, currentValues])

  const changeCounts = useMemo(() => {
    const counts = { total: 0, critical: 0, medium: 0, low: 0 }
    
    for (const change of changes) {
      counts.total++
      counts[change.severity]++
    }
    
    return counts
  }, [changes])

  const getFieldChange = useCallback(
    (fieldPath: string) => changes.find((c) => c.fieldPath === fieldPath),
    [changes]
  )

  const isFieldChanged = useCallback(
    (fieldPath: string) => changes.some((c) => c.fieldPath === fieldPath),
    [changes]
  )

  return {
    changes,
    hasChanges: changes.length > 0,
    hasCriticalChanges: changeCounts.critical > 0,
    changeCounts,
    getFieldChange,
    isFieldChanged,
  }
}

