// src/components/consulta-clinica/ConsultaClinicaWorkspace.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  FileText,
  Stethoscope,
  Image,
  Activity,
  ClipboardList,
  Save,
  AlertCircle,
  Edit,
  AlertTriangle,
  Pill,
  Heart,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnamnesisForm } from "./modules/anamnesis/AnamnesisForm"
import type { AnamnesisResponse } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { DiagnosticosModule } from "./modules/DiagnosticosModule"
import { ProcedimientosModule } from "./modules/ProcedimientosModule"
import { AdjuntosModule } from "./modules/AdjuntosModule"
import { OdontogramaModule } from "./modules/OdontogramaModule"
import { PlanesTratamientoModule } from "./modules/PlanesTratamientoModule"
import { VitalesModule } from "./modules/VitalesModule"
import { MedicacionModule } from "./modules/MedicacionModule"
import { CitaStatusBadge } from "./CitaStatusBadge"
import { useConsulta } from "./hooks/useConsulta"
import { useConsultaPermissions } from "./hooks/useConsultaPermissions"
import type { ConsultaClinicaDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface ConsultaClinicaWorkspaceProps {
  citaId: number
  userRole: "ADMIN" | "ODONT" | "RECEP"
}

/**
 * Quick Patient Summary Component
 * Displays key patient information in a collapsible panel
 */
function QuickPatientSummary({ 
  paciente, 
  pacienteId,
  alergias, 
  medicaciones,
  diagnosticos 
}: { 
  paciente?: ConsultaClinicaDTO['paciente']
  pacienteId?: number
  alergias: ConsultaClinicaDTO['alergias']
  medicaciones: ConsultaClinicaDTO['medicaciones']
  diagnosticos: ConsultaClinicaDTO['diagnosticos']
}) {
  const [isOpen, setIsOpen] = useState(true)
  
  if (!paciente) return null

  const activeDiagnoses = diagnosticos?.filter(d => d.status === "ACTIVE") || []
  const severeAllergies = alergias?.filter(a => a.severity === "SEVERE" && a.isActive) || []
  const activeMeds = medicaciones?.filter(m => m.isActive) || []

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Resumen del Paciente
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Demographics */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-3 w-3" />
                  Datos Básicos
                </h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Nombre: </span>
                    {paciente.nombres} {paciente.apellidos}
                  </p>
                  {paciente.edad !== null && paciente.edad !== undefined && (
                    <p>
                      <span className="text-muted-foreground">Edad: </span>
                      {paciente.edad} años
                    </p>
                  )}
                  {paciente.genero && (
                    <p>
                      <span className="text-muted-foreground">Género: </span>
                      {paciente.genero}
                    </p>
                  )}
                  {paciente.telefono && (
                    <p>
                      <span className="text-muted-foreground">Teléfono: </span>
                      {paciente.telefono}
                    </p>
                  )}
                </div>
              </div>

              {/* Clinical Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Resumen Clínico
                </h4>
                <div className="text-sm space-y-1">
                  {severeAllergies.length > 0 && (
                    <p className="text-red-600 dark:text-red-400">
                      ⚠️ {severeAllergies.length} {severeAllergies.length === 1 ? "alergia severa" : "alergias severas"}
                    </p>
                  )}
                  {activeMeds.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Medicación activa: </span>
                      {activeMeds.length} {activeMeds.length === 1 ? "medicamento" : "medicamentos"}
                    </p>
                  )}
                  {activeDiagnoses.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">Diagnósticos activos: </span>
                      {activeDiagnoses.length}
                    </p>
                  )}
                  {severeAllergies.length === 0 && activeMeds.length === 0 && activeDiagnoses.length === 0 && (
                    <p className="text-muted-foreground italic">Sin información clínica registrada</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Acciones Rápidas
                </h4>
                <div className="space-y-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      // Navigate to patient record page
                      if (pacienteId) {
                        window.location.href = `/pacientes/${pacienteId}`
                      }
                    }}
                  >
                    Ver Historia Clínica Completa
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => {
                      // Navigate to agenda with patient pre-filled
                      if (pacienteId) {
                        window.location.href = `/agenda?pacienteId=${pacienteId}`
                      }
                    }}
                  >
                    Agendar Próxima Cita
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

/**
 * Patient Safety Alerts Component
 * Displays prominent warnings for severe allergies and active medications
 */
function PatientSafetyAlerts({ 
  alergias, 
  medicaciones 
}: { 
  alergias: ConsultaClinicaDTO['alergias']
  medicaciones: ConsultaClinicaDTO['medicaciones']
}) {
  const severeAllergies = alergias?.filter(a => a.severity === "SEVERE" && a.isActive) || []
  const activeMedications = medicaciones?.filter(m => m.isActive) || []
  
  if (severeAllergies.length === 0 && activeMedications.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-4">
      {severeAllergies.length > 0 && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-semibold">
            ⚠️ ALERGIAS SEVERAS: {severeAllergies.map(a => a.label).join(", ")}
          </AlertDescription>
        </Alert>
      )}
      {activeMedications.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Pill className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Medicación activa:</span> {activeMedications.length} {activeMedications.length === 1 ? "medicamento" : "medicamentos"}
            {activeMedications.slice(0, 3).map(m => (
              <span key={m.id} className="ml-2 text-sm">
                {m.label || "Sin especificar"}
                {m.dose && ` (${m.dose})`}
              </span>
            ))}
            {activeMedications.length > 3 && (
              <span className="text-sm text-muted-foreground ml-2">
                +{activeMedications.length - 3} más
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export function ConsultaClinicaWorkspace({ citaId, userRole }: ConsultaClinicaWorkspaceProps) {
  // Use custom hooks for data fetching and permissions
  const { canEdit, canView } = useConsultaPermissions(userRole, null)
  const { consulta, isLoading, refetch: fetchConsulta } = useConsulta(citaId, canView, canEdit)
  const { isFinalized, hasConsulta, canEditModules, canViewResumen } = 
    useConsultaPermissions(userRole, consulta)

  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("anamnesis")
  const [isResumenDialogOpen, setIsResumenDialogOpen] = useState(false)
  const [resumenForm, setResumenForm] = useState({
    diagnosis: "",
    clinicalNotes: "",
  })
  const [isSavingResumen, setIsSavingResumen] = useState(false)
  const [anamnesis, setAnamnesis] = useState<AnamnesisResponse | null>(null)

  const fetchAnamnesis = async (pacienteId: number) => {
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/anamnesis`)
      if (!res.ok) {
        if (res.status === 404) {
          // No anamnesis exists yet
          setAnamnesis(null)
          return
        }
        throw new Error("Error al cargar anamnesis")
      }
      const data = await res.json()
      if (data.data) {
        setAnamnesis(data.data)
      } else {
        setAnamnesis(null)
      }
    } catch (error) {
      console.error("Error fetching anamnesis:", error)
      // Don't show toast - anamnesis is optional
      setAnamnesis(null)
    }
  }

  // Fetch anamnesis when pacienteId is available
  // Note: fetchConsulta is handled by useConsulta hook
  useEffect(() => {
    if (consulta?.pacienteId) {
      fetchAnamnesis(consulta.pacienteId)
    }
  }, [consulta?.pacienteId])

  const handleFinalize = async () => {
    if (!consulta) return
    
    // Check if anamnesis is required and missing
    const { config } = await fetch("/api/anamnesis/config")
      .then((res) => res.json())
      .then((data) => ({ config: data.data?.[0]?.value }))
      .catch(() => ({ config: null }))
    
    const mandatoryFirstConsultation = config?.MANDATORY_FIRST_CONSULTATION === true
    const hasAnamnesis = anamnesis && anamnesis.motivoConsulta
    
    if (mandatoryFirstConsultation && !hasAnamnesis) {
      toast.error("No se puede finalizar la consulta sin completar la anamnesis. Complete la anamnesis en la pestaña correspondiente.")
      return
    }
    
    try {
      setIsSaving(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FINAL",
          finishedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al finalizar consulta")
      }
      toast.success("Consulta finalizada correctamente")
      await fetchConsulta()
    } catch (error) {
      console.error("Error finalizing consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al finalizar consulta")
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenResumenDialog = () => {
    if (!consulta) return
    setResumenForm({
      diagnosis: consulta.diagnosis ?? "",
      clinicalNotes: consulta.clinicalNotes ?? "",
    })
    setIsResumenDialogOpen(true)
  }

  const handleSaveResumen = async () => {
    if (!consulta) return
    try {
      setIsSavingResumen(true)
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: resumenForm.diagnosis.trim() || null,
          clinicalNotes: resumenForm.clinicalNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar resumen")
      }
      toast.success("Resumen de consulta actualizado correctamente")
      setIsResumenDialogOpen(false)
      await fetchConsulta()
    } catch (error) {
      console.error("Error saving resumen:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar resumen")
    } finally {
      setIsSavingResumen(false)
    }
  }

  if (!canView) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>No tiene permisos para ver esta consulta clínica.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return <ConsultaClinicaSkeleton />
  }

  if (!consulta) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>No se pudo cargar la consulta.</p>
            <Button onClick={fetchConsulta} className="mt-4" variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Permissions are now handled by useConsultaPermissions hook

  return (
    <div className="space-y-6">
      {/* Patient Safety Alerts - Always visible */}
      <PatientSafetyAlerts 
        alergias={consulta.alergias || []} 
        medicaciones={consulta.medicaciones || []} 
      />
      
      {/* Quick Patient Summary Panel */}
      <QuickPatientSummary 
        paciente={consulta.paciente}
        pacienteId={consulta.pacienteId}
        alergias={consulta.alergias || []}
        medicaciones={consulta.medicaciones || []}
        diagnosticos={consulta.diagnosticos || []}
      />
      
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Consulta Clínica
              </CardTitle>
              <CardDescription className="mt-1">
                {consulta.performedBy?.nombre && `Profesional: ${consulta.performedBy.nombre}`}
                {consulta.createdAt && ` • Creada: ${new Date(consulta.createdAt).toLocaleString()}`}
                {consulta.citaEstado && (
                  <span className="ml-2">
                    <CitaStatusBadge estado={consulta.citaEstado} />
                  </span>
                )}
                {!hasConsulta && canEdit && (
                  <span className="text-amber-600 dark:text-amber-400"> • Consulta no iniciada</span>
                )}
              </CardDescription>
              {/* Resumen clínico en modo lectura (solo ADMIN/ODONT) */}
              {canViewResumen && (
                <div className="mt-4 space-y-2">
                  {/* Motivo de consulta ahora viene de Anamnesis (ver tab Anamnesis) */}
                  {consulta.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Diagnóstico:</p>
                      <p className="text-sm">{consulta.diagnosis}</p>
                    </div>
                  )}
                  {consulta.clinicalNotes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notas clínicas:</p>
                      <p className="text-sm whitespace-pre-wrap">{consulta.clinicalNotes}</p>
                    </div>
                  )}
                  {!consulta.diagnosis && !consulta.clinicalNotes && (
                    <p className="text-sm text-muted-foreground italic">No hay resumen clínico registrado</p>
                  )}
                </div>
              )}
              {userRole === "RECEP" && (
                <p className="mt-4 text-sm text-muted-foreground italic">
                  Resumen clínico visible solo para profesionales.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isFinalized ? "default" : "secondary"}>
                {isFinalized ? "Finalizada" : hasConsulta ? "Borrador" : "No iniciada"}
              </Badge>
              {canEdit && !isFinalized && hasConsulta && (
                <>
                  <Button onClick={handleOpenResumenDialog} disabled={isSaving} size="sm" variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Resumen
                  </Button>
                  <Button onClick={handleFinalize} disabled={isSaving} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Finalizar Consulta
                  </Button>
                </>
              )}
              {canEdit && !hasConsulta && (
                <Button
                  onClick={async () => {
                    try {
                      setIsSaving(true)
                      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
                        method: "POST",
                      })
                      if (!res.ok) throw new Error("Error al crear consulta")
                      toast.success("Consulta iniciada")
                      await fetchConsulta()
                    } catch (error) {
                      console.error("Error creating consulta:", error)
                      toast.error("Error al iniciar consulta")
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  size="sm"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Iniciar Consulta
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs con módulos */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-8">
              <TabsTrigger value="anamnesis" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Anamnesis</span>
              </TabsTrigger>
              <TabsTrigger value="diagnosticos" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Diagnósticos</span>
              </TabsTrigger>
              <TabsTrigger value="procedimientos" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Procedimientos</span>
              </TabsTrigger>
              <TabsTrigger value="adjuntos" className="flex items-center gap-2">
                <Image className="h-4 w-4" aria-label="Adjuntos" />
                <span className="hidden sm:inline">Adjuntos</span>
              </TabsTrigger>
              <TabsTrigger value="odontograma" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Odontograma</span>
              </TabsTrigger>
              <TabsTrigger value="vitales" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Vitales</span>
              </TabsTrigger>
              <TabsTrigger value="medicacion" className="flex items-center gap-2">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Medicación</span>
              </TabsTrigger>
              {canEdit && (
                <TabsTrigger value="plan-tratamiento" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Plan Tto.</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="anamnesis" className="mt-6">
              {/* Professional anamnesis form with normalized structure */}
              {consulta?.pacienteId ? (
                <AnamnesisForm
                  pacienteId={consulta.pacienteId}
                  consultaId={consulta.citaId}
                  initialData={anamnesis ? {
                    ...anamnesis,
                    antecedents: anamnesis.antecedents || [],
                    medications: anamnesis.medications || [],
                    allergies: anamnesis.allergies || [],
                  } : null}
                  onSave={() => {
                    // Refetch both consulta and anamnesis after save
                    fetchConsulta()
                    if (consulta.pacienteId) {
                      fetchAnamnesis(consulta.pacienteId)
                    }
                  }}
                  canEdit={canEditModules}
                  patientGender={consulta.paciente?.genero || undefined}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando información del paciente...
                </div>
              )}
            </TabsContent>

            <TabsContent value="diagnosticos" className="mt-6">
              <DiagnosticosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="procedimientos" className="mt-6">
              <ProcedimientosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="adjuntos" className="mt-6">
              <AdjuntosModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="odontograma" className="mt-6">
              <OdontogramaModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="vitales" className="mt-6">
              <VitalesModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            <TabsContent value="medicacion" className="mt-6">
              <MedicacionModule 
                citaId={citaId} 
                consulta={consulta} 
                canEdit={canEditModules} 
                hasConsulta={hasConsulta}
                onUpdate={fetchConsulta} 
              />
            </TabsContent>

            {canEdit && (
              <TabsContent value="plan-tratamiento" className="mt-6">
                <PlanesTratamientoModule 
                  citaId={citaId} 
                  consulta={consulta} 
                  canEdit={canEditModules} 
                  hasConsulta={hasConsulta}
                  isFinalized={isFinalized}
                  onUpdate={fetchConsulta} 
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de edición de resumen clínico */}
      <Dialog open={isResumenDialogOpen} onOpenChange={setIsResumenDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Resumen Clínico</DialogTitle>
            <DialogDescription>
              Complete el diagnóstico general y notas clínicas de la consulta. El motivo de consulta se registra en la pestaña Anamnesis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Motivo de consulta ahora viene de Anamnesis - ver pestaña Anamnesis */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico general</Label>
              <Textarea
                id="diagnosis"
                placeholder="Ingrese el diagnóstico general..."
                value={resumenForm.diagnosis}
                onChange={(e) => setResumenForm({ ...resumenForm, diagnosis: e.target.value })}
                rows={3}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {resumenForm.diagnosis.length}/2000 caracteres
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicalNotes">Notas clínicas generales</Label>
              <Textarea
                id="clinicalNotes"
                placeholder="Ingrese las notas clínicas generales..."
                value={resumenForm.clinicalNotes}
                onChange={(e) => setResumenForm({ ...resumenForm, clinicalNotes: e.target.value })}
                rows={6}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground">
                {resumenForm.clinicalNotes.length}/5000 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResumenDialogOpen(false)}
              disabled={isSavingResumen}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveResumen} disabled={isSavingResumen}>
              {isSavingResumen ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ConsultaClinicaSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

