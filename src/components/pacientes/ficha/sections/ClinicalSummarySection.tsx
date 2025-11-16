// src/components/pacientes/ficha/sections/ClinicalSummarySection.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, AlertTriangle, Pill, Heart, Activity, FileText, Link as LinkIcon } from "lucide-react"
import { useState } from "react"
import { ClinicalAlertBadge } from "../components/ClinicalAlertBadge"
import { formatDate } from "@/lib/utils/patient-helpers"
import type { PatientRecord } from "@/lib/types/patient"

interface ClinicalSummarySectionProps {
  patient: PatientRecord
}

export function ClinicalSummarySection({ patient }: ClinicalSummarySectionProps) {
  const [activeProblemsOpen, setActiveProblemsOpen] = useState(true)
  const [medicationsOpen, setMedicationsOpen] = useState(true)
  const [allergiesOpen, setAllergiesOpen] = useState(true)
  const [vitalsOpen, setVitalsOpen] = useState(false)

  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []
  const activeMedications = patient.medications?.filter((m) => m.status === "ACTIVE") || []
  const activeAllergies = patient.allergies?.filter((a) => a.isActive) || []
  const severeAllergies = activeAllergies.filter((a) => a.severity === "SEVERE")
  const latestVitals = patient.vitalSigns?.[0] || null

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Resumen Clínico
        </CardTitle>
        <CardDescription>Vista rápida de información clínica relevante</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clinical Alerts Banner */}
        {(severeAllergies.length > 0 || activeMedications.length > 0 || activeDiagnoses.length > 0) && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
            {severeAllergies.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-semibold text-red-600 dark:text-red-400">
                  ⚠️ ALERGIAS SEVERAS: {severeAllergies.map((a) => a.label || a.allergen).join(", ")}
                </span>
              </div>
            )}
            {activeMedications.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Pill className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>
                  <span className="font-semibold">Medicación activa:</span> {activeMedications.length}{" "}
                  {activeMedications.length === 1 ? "medicamento" : "medicamentos"}
                </span>
              </div>
            )}
            {activeDiagnoses.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  <span className="font-semibold">Diagnósticos activos:</span> {activeDiagnoses.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Active Problems */}
        <Collapsible open={activeProblemsOpen} onOpenChange={setActiveProblemsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Problemas Activos</span>
                {activeDiagnoses.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeDiagnoses.length}
                  </Badge>
                )}
              </div>
              {activeProblemsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {activeDiagnoses.length > 0 ? (
              <div className="space-y-2">
                {activeDiagnoses.slice(0, 5).map((diagnosis) => (
                  <div key={diagnosis.id} className="flex items-start justify-between p-2 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {diagnosis.code && (
                          <Badge variant="outline" className="text-xs">
                            {diagnosis.code}
                          </Badge>
                        )}
                        <span className="text-sm font-medium">{diagnosis.label}</span>
                      </div>
                      {diagnosis.diagnosedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Notado: {formatDate(diagnosis.diagnosedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activeDiagnoses.length > 5 && (
                  <p className="text-xs text-muted-foreground italic text-center">
                    +{activeDiagnoses.length - 5} más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No hay problemas activos registrados</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Current Medications */}
        <Collapsible open={medicationsOpen} onOpenChange={setMedicationsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Medicación Actual</span>
                {activeMedications.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeMedications.length}
                  </Badge>
                )}
              </div>
              {medicationsOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {activeMedications.length > 0 ? (
              <div className="space-y-2">
                {activeMedications.slice(0, 5).map((med) => (
                  <div key={med.id} className="flex items-start justify-between p-2 rounded border">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{med.label || med.name}</p>
                      {(med.dose || med.frequency || med.route) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {[med.dose, med.frequency, med.route].filter(Boolean).join(" • ")}
                        </p>
                      )}
                      {med.startedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Iniciado: {formatDate(med.startedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activeMedications.length > 5 && (
                  <p className="text-xs text-muted-foreground italic text-center">
                    +{activeMedications.length - 5} más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No hay medicación activa registrada</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Active Allergies */}
        <Collapsible open={allergiesOpen} onOpenChange={setAllergiesOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Alergias Activas</span>
                {activeAllergies.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeAllergies.length}
                  </Badge>
                )}
              </div>
              {allergiesOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            {activeAllergies.length > 0 ? (
              <div className="space-y-2">
                {activeAllergies.map((allergy) => (
                  <div key={allergy.id} className="flex items-start justify-between p-2 rounded border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{allergy.label || allergy.allergen}</span>
                        <Badge
                          variant={allergy.severity === "SEVERE" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {allergy.severity}
                        </Badge>
                      </div>
                      {allergy.reaction && (
                        <p className="text-xs text-muted-foreground mt-1">Reacción: {allergy.reaction}</p>
                      )}
                      {allergy.notedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Notado: {formatDate(allergy.notedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No hay alergias registradas</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Latest Vital Signs */}
        {latestVitals && (
          <Collapsible open={vitalsOpen} onOpenChange={setVitalsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg -mx-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Signos Vitales</span>
                  {latestVitals.recordedAt && (
                    <Badge variant="outline" className="text-xs">
                      {formatDate(latestVitals.recordedAt)}
                    </Badge>
                  )}
                </div>
                {vitalsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="grid grid-cols-2 gap-3 p-2 rounded border">
                {latestVitals.height && (
                  <div>
                    <p className="text-xs text-muted-foreground">Altura</p>
                    <p className="text-sm font-medium">{latestVitals.height} cm</p>
                  </div>
                )}
                {latestVitals.weight && (
                  <div>
                    <p className="text-xs text-muted-foreground">Peso</p>
                    <p className="text-sm font-medium">{latestVitals.weight} kg</p>
                  </div>
                )}
                {latestVitals.bmi && (
                  <div>
                    <p className="text-xs text-muted-foreground">IMC</p>
                    <p className="text-sm font-medium">{latestVitals.bmi.toFixed(1)}</p>
                  </div>
                )}
                {(latestVitals.systolicBP || latestVitals.diastolicBP) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Presión Arterial</p>
                    <p className="text-sm font-medium">
                      {latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg
                    </p>
                  </div>
                )}
                {latestVitals.heartRate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Frecuencia Cardíaca</p>
                    <p className="text-sm font-medium">{latestVitals.heartRate} bpm</p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

