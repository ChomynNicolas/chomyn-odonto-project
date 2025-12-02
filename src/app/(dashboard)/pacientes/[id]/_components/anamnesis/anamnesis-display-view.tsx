"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import type { PatientAnamnesisDTO } from "@/types/patient"
import { extractPayloadData } from "./utils/payload-helpers"
import { AnamnesisSummaryCards } from "./components/AnamnesisSummaryCards"
import { AnamnesisCriticalAlerts } from "./components/AnamnesisCriticalAlerts"
import { AnamnesisMedicalHistory } from "./components/AnamnesisMedicalHistory"
import { AnamnesisMedicationsList } from "./components/AnamnesisMedicationsList"
import { AnamnesisAllergiesList } from "./components/AnamnesisAllergiesList"
import { AnamnesisDentalHealth } from "./components/AnamnesisDentalHealth"
import { AnamnesisWomenSpecific } from "./components/AnamnesisWomenSpecific"
import { AnamnesisPediatricInfo } from "./components/AnamnesisPediatricInfo"
import { AnamnesisMetadata } from "./components/AnamnesisMetadata"

// Extended type to include payload, allergies, and antecedents from API response
type AnamnesisWithRelations = PatientAnamnesisDTO & {
  payload?: Record<string, unknown> | null
  allergies?: Array<{
    idAnamnesisAllergy: number
    allergyId: number | null
    allergy: {
      idPatientAllergy: number
      label: string
      allergyCatalog: {
        idAllergyCatalog: number
        name: string
      } | null
      severity: string
      reaction: string | null
      isActive: boolean
    }
  }>
  antecedents?: Array<{
    idAnamnesisAntecedent: number
    anamnesisId: number
    antecedentId: number | null
    antecedentCatalog: {
      idAntecedentCatalog: number
      code: string
      name: string
      category: string
      description: string | null
    } | null
    customName: string | null
    customCategory: string | null
    notes: string | null
    diagnosedAt: string | null
    isActive: boolean
    resolvedAt: string | null
  }>
}

interface AnamnesisDisplayViewProps {
  anamnesis: AnamnesisWithRelations
  canEdit: boolean
  onEdit: () => void
  patientGender?: "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
}

export function AnamnesisDisplayView({
  anamnesis,
  canEdit,
  onEdit,
  patientGender = "NO_ESPECIFICADO",
}: AnamnesisDisplayViewProps) {
  // Extract payload data with type safety
  const payloadData = useMemo(
    () =>
      extractPayloadData({
        payload: anamnesis.payload,
        tipo: anamnesis.tipo,
        patientGender,
      }),
    [anamnesis.payload, anamnesis.tipo, patientGender]
  )


  const activeAllergiesCount = anamnesis.allergies?.filter((a) => a.allergy.isActive).length || 0
  const activeAntecedentsCount = anamnesis.antecedents?.filter((a) => a.isActive).length || 0

  // Determine if we should show women-specific section
  const shouldShowWomenSpecific =
    patientGender === "FEMENINO" && payloadData.womenSpecific !== null && anamnesis.tipo === "ADULTO"

  // Determine if we should show pediatric section
  const shouldShowPediatric = anamnesis.tipo === "PEDIATRICO"

  return (
    <div className="space-y-6">
      {/* Executive Summary Panel */}
      <AnamnesisSummaryCards anamnesis={anamnesis} canEdit={canEdit} onEdit={onEdit} />

      {/* Critical Alerts Section */}
      <AnamnesisCriticalAlerts
        anamnesis={anamnesis}
        activeAllergiesCount={activeAllergiesCount}
        activeAntecedentsCount={activeAntecedentsCount}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical History */}
        <AnamnesisMedicalHistory anamnesis={anamnesis} />

        {/* Current Medications */}
        <AnamnesisMedicationsList anamnesis={anamnesis} />

        {/* Allergies */}
        <AnamnesisAllergiesList anamnesis={anamnesis} activeAllergiesCount={activeAllergiesCount} />

        {/* Dental Health */}
        <AnamnesisDentalHealth anamnesis={anamnesis} />

        {/* Women-Specific Section */}
        {shouldShowWomenSpecific && payloadData.womenSpecific && (
          <AnamnesisWomenSpecific womenSpecific={payloadData.womenSpecific} />
        )}

        {/* Pediatric Section */}
        {shouldShowPediatric && (
          <AnamnesisPediatricInfo
            pediatricSpecific={payloadData.pediatricSpecific}
            anamnesis={anamnesis}
          />
        )}

        {/* Additional Notes */}
        {payloadData.customNotes && (
          <Card className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Notas Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{payloadData.customNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Metadata Footer */}
      <AnamnesisMetadata anamnesis={anamnesis} metadata={payloadData.metadata} />
    </div>
  )
}
