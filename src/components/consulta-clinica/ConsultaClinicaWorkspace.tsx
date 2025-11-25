"use client"

import { useState, useCallback, useMemo } from "react"
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
  ImageIcon,
  Activity,
  ClipboardList,
  AlertCircle,
  Edit,
  AlertTriangle,
  Pill,
  Heart,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  FileEdit,
  Clock,
  Loader2,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnamnesisForm } from "./modules/anamnesis/AnamnesisForm"
import { AnamnesisContextBanner } from "./modules/anamnesis/components/AnamnesisContextBanner"
import { AnamnesisFormSkeleton } from "./modules/anamnesis/components/AnamnesisFormSkeleton"
import { useAnamnesisContext } from "./modules/anamnesis/hooks/useAnamnesisContext"
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

function QuickPatientSummary({
  paciente,
  pacienteId,
  alergias,
  medicaciones,
  diagnosticos,
}: {
  paciente?: ConsultaClinicaDTO["paciente"]
  pacienteId?: number
  alergias: ConsultaClinicaDTO["alergias"]
  medicaciones: ConsultaClinicaDTO["medicaciones"]
  diagnosticos: ConsultaClinicaDTO["diagnosticos"]
}) {
  const [isOpen, setIsOpen] = useState(true)

  if (!paciente) return null

  const activeDiagnoses = diagnosticos?.filter((d) => d.status === "ACTIVE") || []
  const severeAllergies = alergias?.filter((a) => a.severity === "SEVERE" && a.isActive) || []
  const activeMeds = medicaciones?.filter((m) => m.isActive) || []

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Resumen del Paciente</CardTitle>
                  <CardDescription className="text-xs">
                    {paciente.nombres} {paciente.apellidos}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0"
                aria-label={isOpen ? "Ocultar resumen" : "Mostrar resumen"}
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Datos Básicos */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Datos Básicos
                </h4>
                <div className="text-sm space-y-1.5 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Nombre:</span> {paciente.nombres} {paciente.apellidos}
                  </p>
                  {paciente.edad !== null && paciente.edad !== undefined && (
                    <p>
                      <span className="font-medium text-foreground">Edad:</span> {paciente.edad} años
                    </p>
                  )}
                  {paciente.genero && (
                    <p>
                      <span className="font-medium text-foreground">Género:</span>{" "}
                      <span className="capitalize">{paciente.genero.toLowerCase()}</span>
                    </p>
                  )}
                  {paciente.telefono && (
                    <p>
                      <span className="font-medium text-foreground">Teléfono:</span> {paciente.telefono}
                    </p>
                  )}
                </div>
              </div>

              {/* Resumen Clínico */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Resumen Clínico
                </h4>
                <div className="text-sm space-y-1.5">
                  {severeAllergies.length > 0 && (
                    <p className="text-destructive font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {severeAllergies.length} {severeAllergies.length === 1 ? "alergia severa" : "alergias severas"}
                    </p>
                  )}
                  {activeMeds.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Medicación activa:</span> {activeMeds.length}{" "}
                      {activeMeds.length === 1 ? "medicamento" : "medicamentos"}
                    </p>
                  )}
                  {activeDiagnoses.length > 0 && (
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Diagnósticos activos:</span>{" "}
                      {activeDiagnoses.length}
                    </p>
                  )}
                  {severeAllergies.length === 0 && activeMeds.length === 0 && activeDiagnoses.length === 0 && (
                    <p className="text-muted-foreground italic text-xs">Sin información clínica crítica</p>
                  )}
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Acciones Rápidas
                </h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-8 bg-transparent"
                    onClick={() => {
                      if (pacienteId) {
                        window.location.href = `/pacientes/${pacienteId}`
                      }
                    }}
                  >
                    Ver Historia Completa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs h-8 bg-transparent"
                    onClick={() => {
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

function PatientSafetyAlerts({
  alergias,
  medicaciones,
}: {
  alergias: ConsultaClinicaDTO["alergias"]
  medicaciones: ConsultaClinicaDTO["medicaciones"]
}) {
  const [isOpen, setIsOpen] = useState(true)

  const severeAllergies = alergias?.filter((a) => a.severity === "SEVERE" && a.isActive) || []
  const activeMedications = medicaciones?.filter((m) => m.isActive) || []

  if (severeAllergies.length === 0 && activeMedications.length === 0) {
    return null
  }

  const alertCount = severeAllergies.length + activeMedications.length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2 border-destructive/50 bg-destructive/5 dark:border-destructive/60 dark:bg-destructive/10">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-destructive/10 transition-colors pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-destructive">
                    Alertas de Seguridad del Paciente
                  </CardTitle>
                  <CardDescription className="text-destructive/80 text-xs">
                    {alertCount} {alertCount === 1 ? "alerta activa" : "alertas activas"}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                aria-label={isOpen ? "Ocultar alertas" : "Mostrar alertas"}
                aria-expanded={isOpen}
              >
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {severeAllergies.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <Heart className="h-4 w-4" />
                  <span>Alergias Severas ({severeAllergies.length})</span>
                </div>
                <div className="space-y-2">
                  {severeAllergies.map((alergia) => (
                    <Alert key={alergia.id} variant="destructive" className="py-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{alergia.label}</span>
                          <Badge variant="destructive" className="text-xs font-bold">
                            {alergia.severity}
                          </Badge>
                        </div>
                        {alergia.reaction && (
                          <span className="text-xs text-destructive/90">Reacción: {alergia.reaction}</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {activeMedications.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <Pill className="h-4 w-4" />
                  <span>Medicación Activa ({activeMedications.length})</span>
                </div>
                <div className="space-y-2">
                  {activeMedications.map((med) => (
                    <Alert
                      key={med.id}
                      className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 py-3"
                    >
                      <Pill className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <AlertDescription className="text-amber-900 dark:text-amber-100">
                        <span className="font-medium">{med.label || "Sin nombre"}</span>
                        {med.dose && (
                          <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">{med.dose}</span>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function ConsultaStatusBanner({ consulta }: { consulta: ConsultaClinicaDTO }) {
  const { status, createdAt, finishedAt } = consulta
  const hasConsulta = createdAt !== null

  if (!hasConsulta) {
    return (
      <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold text-base">
          Consulta no iniciada
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Inicia la consulta para comenzar a registrar la información clínica del paciente.
        </AlertDescription>
      </Alert>
    )
  }

  if (status === "FINAL") {
    const finalizadaDate = finishedAt ? new Date(finishedAt) : null
    return (
      <Alert className="border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
        <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-100 font-semibold text-base">
          Consulta finalizada
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          {finalizadaDate && (
            <>
              Finalizada el{" "}
              {finalizadaDate.toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              .{" "}
            </>
          )}
          La información está bloqueada y no se puede editar.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <FileEdit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold text-base">
        Consulta en curso (Borrador)
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        Puedes editar toda la información. No olvides finalizar la consulta cuando termines.
      </AlertDescription>
    </Alert>
  )
}

function ConsultaHeader({
  consulta,
  canEdit,
  canViewResumen,
  onIniciar,
  onFinalizar,
  onEditarResumen,
  isLoading,
}: {
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  canViewResumen: boolean
  onIniciar: () => void
  onFinalizar: () => void
  onEditarResumen: () => void
  isLoading: boolean
}) {
  const { paciente, status, createdAt, performedBy, citaEstado, diagnosis, clinicalNotes } = consulta
  const hasConsulta = createdAt !== null
  const isFinalized = status === "FINAL"

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const nombreCompleto = paciente ? `${paciente.nombres} ${paciente.apellidos}`.trim() : "Paciente sin nombre"

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Información principal */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-1">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-2xl font-bold leading-tight">Consulta Clínica</CardTitle>
                <CardDescription className="mt-1.5 space-y-1">
                  {performedBy?.nombre && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="h-3.5 w-3.5" />
                      <span>Profesional: {performedBy.nombre}</span>
                    </div>
                  )}
                  {createdAt && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Creada: {formatDate(createdAt)}</span>
                    </div>
                  )}
                  {citaEstado && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Estado de cita:</span>
                      <CitaStatusBadge estado={citaEstado} />
                    </div>
                  )}
                </CardDescription>

                {/* Resumen clínico (solo para ADMIN/ODONT) */}
                {canViewResumen && hasConsulta && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Resumen Clínico</h4>
                    {diagnosis && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Diagnóstico:</p>
                        <p className="text-sm text-foreground">{diagnosis}</p>
                      </div>
                    )}
                    {clinicalNotes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Notas clínicas:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{clinicalNotes}</p>
                      </div>
                    )}
                    {!diagnosis && !clinicalNotes && (
                      <p className="text-sm text-muted-foreground italic">No hay resumen clínico registrado</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!hasConsulta && canEdit && (
              <Button
                onClick={onIniciar}
                disabled={isLoading}
                size="lg"
                className="gap-2"
                aria-label="Iniciar consulta"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Stethoscope className="h-4 w-4" />
                    Iniciar Consulta
                  </>
                )}
              </Button>
            )}

            {hasConsulta && !isFinalized && canEdit && (
              <>
                <Button
                  onClick={onEditarResumen}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-transparent"
                  aria-label="Editar resumen clínico"
                >
                  <Edit className="h-4 w-4" />
                  Editar Resumen
                </Button>
                <Button
                  onClick={onFinalizar}
                  disabled={isLoading}
                  size="sm"
                  className="gap-2"
                  aria-label="Finalizar consulta"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Finalizar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

function ConsultaClinicaSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardHeader>
      </Card>
      <Skeleton className="h-24 w-full rounded-lg" />
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-32 flex-shrink-0" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ConsultaClinicaWorkspace({ citaId, userRole }: ConsultaClinicaWorkspaceProps) {
  const [activeTab, setActiveTab] = useState("anamnesis")
  const [isResumenDialogOpen, setIsResumenDialogOpen] = useState(false)
  const [resumenForm, setResumenForm] = useState({
    diagnosis: "",
    clinicalNotes: "",
  })
  const [isSavingResumen, setIsSavingResumen] = useState(false)

  const { canEdit, canView } = useConsultaPermissions(userRole, null)
  const { consulta, isLoading, refetch: fetchConsulta } = useConsulta(citaId, canView, canEdit)
  const { isFinalized, hasConsulta, canEditModules, canViewResumen } = useConsultaPermissions(userRole, consulta)

  // Hook para anamnesis context
  const {
    anamnesis,
    context,
    isLoading: isLoadingAnamnesis,
    refetch: refetchAnamnesis,
  } = useAnamnesisContext(consulta?.pacienteId)

  const handleIniciar = useCallback(async () => {
    if (!consulta) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta`, {
        method: "POST",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al iniciar consulta")
      }
      toast.success("Consulta iniciada correctamente")
      await fetchConsulta()
    } catch (error) {
      console.error("[v0] Error iniciando consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al iniciar consulta")
    }
  }, [citaId, consulta, fetchConsulta])

  const handleFinalizar = useCallback(async () => {
    if (!consulta) return

    // Validar si anamnesis es obligatoria
    try {
      const configRes = await fetch("/api/anamnesis/config")
      const configData = await configRes.json()
      const mandatoryFirstConsultation = configData.data?.[0]?.value?.MANDATORY_FIRST_CONSULTATION === true
      const hasAnamnesis = anamnesis && anamnesis.motivoConsulta

      if (mandatoryFirstConsultation && !hasAnamnesis) {
        toast.error(
          "No se puede finalizar la consulta sin completar la anamnesis. Complete la anamnesis en la pestaña correspondiente.",
        )
        return
      }
    } catch (err) {
      console.error("[v0] Error verificando configuración de anamnesis:", err)
    }

    try {
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
      console.error("[v0] Error finalizando consulta:", error)
      toast.error(error instanceof Error ? error.message : "Error al finalizar consulta")
    }
  }, [citaId, consulta, anamnesis, fetchConsulta])

  const handleOpenResumenDialog = useCallback(() => {
    if (!consulta) return
    setResumenForm({
      diagnosis: consulta.diagnosis ?? "",
      clinicalNotes: consulta.clinicalNotes ?? "",
    })
    setIsResumenDialogOpen(true)
  }, [consulta])

  const handleSaveResumen = useCallback(async () => {
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
      console.error("[v0] Error guardando resumen:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar resumen")
    } finally {
      setIsSavingResumen(false)
    }
  }, [citaId, consulta, resumenForm, fetchConsulta])

  const tabCounts = useMemo(() => {
    if (!consulta) return {}

    return {
      diagnosticos: consulta.diagnosticos?.length || 0,
      procedimientos: consulta.procedimientos?.length || 0,
      medicacion: consulta.medicaciones?.length || 0,
      adjuntos: consulta.adjuntos?.length || 0,
    }
  }, [consulta])

  // Estados de carga y error
  if (!canView) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
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
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No se pudo cargar la consulta</p>
              <p className="text-sm text-muted-foreground mt-1">Ocurrió un error al intentar obtener la información</p>
            </div>
            <Button onClick={fetchConsulta} variant="outline" className="gap-2 bg-transparent">
              <AlertCircle className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alertas de seguridad - siempre visible */}
      <PatientSafetyAlerts alergias={consulta.alergias || []} medicaciones={consulta.medicaciones || []} />

      {/* Resumen rápido del paciente */}
      <QuickPatientSummary
        paciente={consulta.paciente}
        pacienteId={consulta.pacienteId}
        alergias={consulta.alergias || []}
        medicaciones={consulta.medicaciones || []}
        diagnosticos={consulta.diagnosticos || []}
      />

      {/* Header con información y acciones */}
      <ConsultaHeader
        consulta={consulta}
        canEdit={canEdit}
        canViewResumen={canViewResumen}
        onIniciar={handleIniciar}
        onFinalizar={handleFinalizar}
        onEditarResumen={handleOpenResumenDialog}
        isLoading={isLoading}
      />

      {/* Banner de estado de la consulta */}
      <ConsultaStatusBanner consulta={consulta} />

      {/* Tabs con módulos */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1 h-auto bg-muted/50 p-1">
              <TabsTrigger
                value="anamnesis"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Anamnesis"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Anamnesis</span>
                <span className="sm:hidden text-xs">HC</span>
              </TabsTrigger>

              <TabsTrigger
                value="diagnosticos"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Diagnósticos"
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Diagnósticos</span>
                <span className="sm:hidden text-xs">Dx</span>
                {tabCounts.diagnosticos > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {tabCounts.diagnosticos}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="procedimientos"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Procedimientos"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Procedimientos</span>
                <span className="sm:hidden text-xs">Proc</span>
                {tabCounts.procedimientos > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {tabCounts.procedimientos}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="adjuntos"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Adjuntos"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Adjuntos</span>
                <span className="sm:hidden text-xs">Adj</span>
                {tabCounts.adjuntos > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {tabCounts.adjuntos}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="odontograma"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Odontograma"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Odontograma</span>
                <span className="sm:hidden text-xs">Odont</span>
              </TabsTrigger>

              <TabsTrigger
                value="vitales"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Signos vitales"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Vitales</span>
                <span className="sm:hidden text-xs">SV</span>
              </TabsTrigger>

              <TabsTrigger
                value="medicacion"
                className="flex items-center gap-2 data-[state=active]:bg-background"
                aria-label="Medicación"
              >
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Medicación</span>
                <span className="sm:hidden text-xs">Med</span>
                {tabCounts.medicacion > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {tabCounts.medicacion}
                  </Badge>
                )}
              </TabsTrigger>

              {canEdit && (
                <TabsTrigger
                  value="plan-tratamiento"
                  className="flex items-center gap-2 data-[state=active]:bg-background"
                  aria-label="Plan de tratamiento"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Plan Tto.</span>
                  <span className="sm:hidden text-xs">Plan</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="anamnesis" className="mt-6 space-y-6">
              {consulta?.pacienteId && context && <AnamnesisContextBanner context={context} anamnesis={anamnesis} />}

              {consulta?.pacienteId ? (
                isLoadingAnamnesis ? (
                  <AnamnesisFormSkeleton />
                ) : (
                  <AnamnesisForm
                    pacienteId={consulta.pacienteId}
                    consultaId={consulta.citaId}
                    initialData={
                      anamnesis
                        ? {
                            ...anamnesis,
                            antecedents: anamnesis.antecedents || [],
                            medications: anamnesis.medications || [],
                            allergies: anamnesis.allergies || [],
                          }
                        : null
                    }
                    onSave={() => {
                      fetchConsulta()
                      refetchAnamnesis()
                    }}
                    anamnesisContext={context}
                    canEdit={canEditModules}
                    patientGender={consulta.paciente?.genero || undefined}
                  />
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Cargando información del paciente...</p>
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
                userRole={userRole}
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

      <Dialog open={isResumenDialogOpen} onOpenChange={setIsResumenDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Resumen Clínico</DialogTitle>
            <DialogDescription>
              Complete el diagnóstico general y notas clínicas de la consulta. El motivo de consulta se registra en la
              pestaña Anamnesis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <p className="text-xs text-muted-foreground">{resumenForm.diagnosis.length}/2000 caracteres</p>
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
              <p className="text-xs text-muted-foreground">{resumenForm.clinicalNotes.length}/5000 caracteres</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResumenDialogOpen(false)} disabled={isSavingResumen}>
              Cancelar
            </Button>
            <Button onClick={handleSaveResumen} disabled={isSavingResumen}>
              {isSavingResumen ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
