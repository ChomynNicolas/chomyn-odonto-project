// src/components/pacientes/historia/sections/AnamnesisSummarySection.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { 
  Stethoscope, 
  AlertTriangle, 
  Pill, 
  Activity, 
  FileText, 
  Calendar,
  Plus,
  Edit
} from "lucide-react"
import type { PatientRecord } from "@/lib/types/patient"
import { formatDate } from "@/lib/utils/patient-helpers"

interface AnamnesisSummarySectionProps {
  patient: PatientRecord
  onAddAllergy?: () => void
  onAddMedication?: () => void
  onAddVitalSigns?: () => void
  onAddNote?: () => void
}

export function AnamnesisSummarySection({
  patient,
  onAddAllergy,
  onAddMedication,
  onAddVitalSigns,
  onAddNote,
}: AnamnesisSummarySectionProps) {
  const activeAllergies = patient.allergies?.filter((a) => a.isActive !== false) || []
  const activeMedications = patient.medications?.filter(
    (m) => m.status === "ACTIVE" || m.status === "active"
  ) || []
  const latestVitals = patient.vitalSigns?.[0] || null
  const activeDiagnoses = patient.diagnoses?.filter((d) => d.status === "ACTIVE") || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Resumen de Anamnesis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={["alergias", "medicaciones"]}>
          {/* Alergias */}
          <AccordionItem value="alergias">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">Alergias</span>
                {activeAllergies.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {activeAllergies.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {activeAllergies.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {activeAllergies.map((allergy) => (
                        <div
                          key={allergy.id}
                          className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {allergy.label || allergy.allergen || "Alergia desconocida"}
                            </p>
                            {allergy.severity && (
                              <Badge
                                variant={
                                  allergy.severity === "SEVERE"
                                    ? "destructive"
                                    : allergy.severity === "MODERATE"
                                      ? "default"
                                      : "secondary"
                                }
                                className="mt-1 text-xs"
                              >
                                {allergy.severity === "SEVERE"
                                  ? "Severa"
                                  : allergy.severity === "MODERATE"
                                    ? "Moderada"
                                    : "Leve"}
                              </Badge>
                            )}
                            {allergy.reaction && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Reacción: {allergy.reaction}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {onAddAllergy && (
                      <Button onClick={onAddAllergy} variant="outline" size="sm" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Alergia
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No hay alergias registradas</p>
                    {onAddAllergy && (
                      <Button onClick={onAddAllergy} variant="outline" size="sm" className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Primera Alergia
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Medicaciones */}
          <AccordionItem value="medicaciones">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">Medicación Actual</span>
                {activeMedications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {activeMedications.length}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {activeMedications.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {activeMedications.map((med) => (
                        <div
                          key={med.id}
                          className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {med.label || med.name || "Medicación"}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {med.dose && <span>Dosis: {med.dose}</span>}
                                {med.freq && <span>Frecuencia: {med.freq}</span>}
                                {med.route && <span>Vía: {med.route}</span>}
                              </div>
                              {med.startAt && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Inicio: {formatDate(med.startAt)}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Activa
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                    {onAddMedication && (
                      <Button onClick={onAddMedication} variant="outline" size="sm" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Medicación
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Pill className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No hay medicación activa</p>
                    {onAddMedication && (
                      <Button onClick={onAddMedication} variant="outline" size="sm" className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Medicación
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Signos Vitales */}
          <AccordionItem value="vitales">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="font-semibold">Signos Vitales</span>
                {latestVitals && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {formatDate(latestVitals.recordedAt)}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {latestVitals ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/50 p-4">
                      {latestVitals.systolicBP && latestVitals.diastolicBP && (
                        <div>
                          <p className="text-xs text-muted-foreground">Presión Arterial</p>
                          <p className="text-lg font-semibold">
                            {latestVitals.systolicBP}/{latestVitals.diastolicBP} mmHg
                          </p>
                        </div>
                      )}
                      {latestVitals.heartRate && (
                        <div>
                          <p className="text-xs text-muted-foreground">Frecuencia Cardíaca</p>
                          <p className="text-lg font-semibold">{latestVitals.heartRate} bpm</p>
                        </div>
                      )}
                      {latestVitals.height && (
                        <div>
                          <p className="text-xs text-muted-foreground">Estatura</p>
                          <p className="text-lg font-semibold">{latestVitals.height} cm</p>
                        </div>
                      )}
                      {latestVitals.weight && (
                        <div>
                          <p className="text-xs text-muted-foreground">Peso</p>
                          <p className="text-lg font-semibold">{latestVitals.weight} kg</p>
                        </div>
                      )}
                      {latestVitals.bmi && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">IMC</p>
                          <p className="text-lg font-semibold">{latestVitals.bmi.toFixed(1)}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Registrado: {formatDate(latestVitals.recordedAt)}</span>
                      {latestVitals.recordedBy && (
                        <span>
                          Por: {latestVitals.recordedBy.firstName} {latestVitals.recordedBy.lastName}
                        </span>
                      )}
                    </div>
                    {patient.vitalSigns && patient.vitalSigns.length > 1 && (
                      <p className="text-xs text-muted-foreground">
                        {patient.vitalSigns.length - 1} registro(s) histórico(s) disponible(s)
                      </p>
                    )}
                    {onAddVitalSigns && (
                      <Button onClick={onAddVitalSigns} variant="outline" size="sm" className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Nuevos Signos Vitales
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Activity className="mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No hay signos vitales registrados</p>
                    {onAddVitalSigns && (
                      <Button onClick={onAddVitalSigns} variant="outline" size="sm" className="mt-4">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Signos Vitales
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Diagnósticos Activos */}
          {activeDiagnoses.length > 0 && (
            <AccordionItem value="diagnosticos">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold">Diagnósticos Activos</span>
                  <Badge variant="secondary" className="ml-2">
                    {activeDiagnoses.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {activeDiagnoses.map((diag) => (
                    <div
                      key={diag.id}
                      className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{diag.label}</p>
                          {diag.code && (
                            <p className="mt-1 text-xs text-muted-foreground">Código: {diag.code}</p>
                          )}
                          {diag.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{diag.notes}</p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            Diagnosticado: {formatDate(diag.diagnosedAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Activo
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}

