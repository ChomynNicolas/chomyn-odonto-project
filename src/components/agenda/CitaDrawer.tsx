"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SheetClose } from "@/components/ui/sheet"
import { apiCancelCita, apiGetCitaDetalle } from "@/lib/api/agenda/citas"
import { apiTransitionCita } from "@/lib/api/agenda/citas"
import { UploadConsentDialog } from "@/components/pacientes/consentimientos/UploadConsentDialog"
import { NuevaCitaSheet } from "./NuevaCitaSheet"
import type { CitaConsentimientoStatus } from "@/app/api/agenda/citas/[id]/_dto"
import { handleApiError, showSuccessToast, showErrorToast } from "@/lib/messages/agenda-toast-helpers"
import { useFollowUpContext } from "@/hooks/useFollowUpContext"
import {
  Calendar,
  Clock,
  User2,
  Stethoscope,
  MapPin,
  FileText,
  X,
  Hash,
  FileWarning,
  Heart,
  Paperclip,
  Eye,
  EyeOff,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ExternalLink,
} from "lucide-react"
import type { CitaDetalleDTO, CurrentUser, EstadoCita, AccionCita } from "@/types/agenda"
import { cn } from "@/lib/utils"
import { isMinorAt } from "@/lib/utils/consent-helpers"
import Image from "next/image"

interface CitaDrawerProps {
  idCita: number
  currentUser?: CurrentUser
  onAfterChange?: () => void
  onClose?: () => void
}

export function CitaDrawer({ idCita, currentUser, onAfterChange, onClose }: CitaDrawerProps) {
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [dto, setDto] = React.useState<CitaDetalleDTO | null>(null)
  const [expandNotes, setExpandNotes] = React.useState(false)
  const [privacyMode, setPrivacyMode] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<AccionCita | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
  const [cancelReason, setCancelReason] = React.useState<
    "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO"
  >("PACIENTE")
  const [cancelNotes, setCancelNotes] = React.useState("")
  const [cancelSubmitting, setCancelSubmitting] = React.useState(false)
  const [uploadConsentOpen, setUploadConsentOpen] = React.useState(false)
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false)
  const [followUpOpen, setFollowUpOpen] = React.useState(false)

  // Fetch follow-up context only for COMPLETED appointments
  const isCompleted = dto?.estado === "COMPLETED"
  const { data: followUpContext, isLoading: isLoadingFollowUp } = useFollowUpContext(
    idCita,
    isCompleted
  )

  const loadData = React.useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true)
        setErr(null)
        const data = await apiGetCitaDetalle(idCita, forceRefresh)

        setDto((prevDto) => {
          if (prevDto && data.estado !== prevDto.estado) {
            console.log(`[CitaDrawer] Estado de cita cambió: ${prevDto.estado} → ${data.estado}`)
          }

          if (
            prevDto &&
            prevDto.consentimientoStatus?.consentimientoVigente !== data.consentimientoStatus?.consentimientoVigente
          ) {
            console.log(
              `[CitaDrawer] Estado de consentimiento cambió: ${prevDto.consentimientoStatus?.consentimientoVigente} → ${data.consentimientoStatus?.consentimientoVigente}`,
            )
          }

          return data
        })
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : "Error obteniendo cita"
        setErr(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [idCita],
  )

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const [consentErrorOpen, setConsentErrorOpen] = React.useState(false)
  const [consentErrorMessage, setConsentErrorMessage] = React.useState<string | null>(null)

  const handleAction = async (action: AccionCita, note?: string) => {
    if (!dto) return
    if (action === "CANCEL") {
      setCancelOpen(true)
      return
    }
    if (action === "RESCHEDULE") {
      setRescheduleOpen(true)
      return
    }

    if (action === "START" && consentimientoStatus && consentimientoStatus.bloqueaInicio) {
      setConsentErrorMessage(
        consentimientoStatus.mensajeBloqueo ||
          "Se requiere consentimiento informado vigente antes de iniciar la consulta.",
      )
      setConsentErrorOpen(true)
      return
    }

    if (action === "CHECKIN" && consentimientoStatus) {
      const warnings = []

      if (consentimientoStatus.requiereConsentimiento && !consentimientoStatus.consentimientoVigente) {
        warnings.push("El paciente es menor y aún no tiene consentimiento de menor.")
      }

      if (consentimientoStatus.requiereCirugia && !consentimientoStatus.cirugiaConsentimientoVigente) {
        warnings.push("Se requiere consentimiento de cirugía para este procedimiento.")
      }

      if (warnings.length > 0) {
        const { toast } = await import("sonner")
        toast.warning("Advertencia: Consentimientos pendientes", {
          description: warnings.join(" ") + " Debe subirlos antes de iniciar la consulta.",
          duration: 6000,
        })
      }
    }

    try {
      setActionLoading(action)
      await apiTransitionCita(idCita, action, note)
      await loadData()
      onAfterChange?.()

      switch (action) {
        case "CONFIRM":
          showSuccessToast("CITA_CONFIRMADA")
          break
        case "CHECKIN":
          showSuccessToast("CHECKIN_REALIZADO")
          break
        case "START":
          showSuccessToast("CONSULTA_INICIADA")
          break
        case "COMPLETE":
          showSuccessToast("CONSULTA_COMPLETADA")
          break
        case "NO_SHOW":
          showSuccessToast("ESTADO_ACTUALIZADO")
          break
        default:
          showSuccessToast("ESTADO_ACTUALIZADO")
      }
    } catch (e: unknown) {
      const errorCode = (e as { code?: string })?.code
      const errorMessage = e instanceof Error ? e.message : String(e)

      if (
        errorCode === "CONSENT_REQUIRED_FOR_MINOR" ||
        errorCode === "SURGERY_CONSENT_REQUIRED" ||
        errorMessage.includes("consentimiento")
      ) {
        let message = errorMessage

        if (errorCode === "SURGERY_CONSENT_REQUIRED") {
          message =
            "Se requiere consentimiento de cirugía firmado para iniciar la consulta de procedimientos quirúrgicos."
        } else if (errorCode === "CONSENT_REQUIRED_FOR_MINOR") {
          message =
            "El paciente es menor de edad y requiere un consentimiento informado vigente firmado por su responsable."
        }

        setConsentErrorMessage(message)
        setConsentErrorOpen(true)
      } else {
        handleApiError(e)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const onConfirmCancel = async () => {
    try {
      setCancelSubmitting(true)
      await apiCancelCita(idCita, cancelReason, cancelNotes || undefined)

      await loadData()
      onAfterChange?.()
      setCancelOpen(false)

      showSuccessToast("CITA_CANCELADA")
    } catch (e: unknown) {
      handleApiError(e)
    } finally {
      setCancelSubmitting(false)
    }
  }

  const esMenor = React.useMemo(() => {
    if (!dto) return false
    const consentimientoStatus = dto.consentimientoStatus
    if (consentimientoStatus) {
      return consentimientoStatus.esMenorAlInicio
    }
    if (dto.paciente.fechaNacimiento) {
      const fechaNacimiento = new Date(dto.paciente.fechaNacimiento)
      const fechaInicio = new Date(dto.inicio)
      return isMinorAt(fechaNacimiento, fechaInicio) === true
    }
    return false
  }, [dto])

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-background">
        <HeaderSkeleton onClose={onClose} />
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 pb-32">
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-lg" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (err || !dto) {
    return (
      <div className="flex h-full flex-col bg-background">
        <div className="flex items-center justify-between p-4 border-b border-destructive/20 bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Cita #{idCita}</h3>
              <p className="text-xs text-muted-foreground">Error al cargar</p>
            </div>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg h-9 w-9 hover:bg-destructive/10"
              onClick={(e) => {
                if (onClose) {
                  e.preventDefault()
                  onClose()
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="p-4 space-y-3">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{err ?? "No se pudo cargar los detalles"}</AlertDescription>
          </Alert>
          <Button
            onClick={() => {
              void loadData()
            }}
            variant="outline"
            className="w-full"
          >
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const estadoUI = getEstadoUI(dto.estado)
  const consultorioColor = dto.consultorio?.colorHex ?? undefined
  const accionesPermitidas = getAccionesPermitidas(dto.estado, currentUser?.role)
  const canUploadConsent =
    currentUser?.role === "ADMIN" || currentUser?.role === "ODONT" || currentUser?.role === "RECEP"
  const consentimientoStatus: CitaConsentimientoStatus | undefined = dto.consentimientoStatus

  return (
    <div className="flex h-full flex-col bg-background">
      <div
        className="relative border-b border-l-4 bg-card p-4"
        style={{
          borderLeftColor: consultorioColor ?? "hsl(var(--primary))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Hash className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">#{dto.idCita}</span>
              <Badge
                variant="outline"
                className={cn("font-semibold px-2 py-0.5 text-xs border-0 shadow-sm", estadoUI.className)}
              >
                {estadoUI.icon && <span className="mr-1.5 text-sm">{estadoUI.icon}</span>}
                {estadoUI.label}
              </Badge>
            </div>

            <div>
              <h3 className="text-base font-bold leading-tight text-foreground">
                {privacyMode ? "████████████" : dto.paciente.nombre}
              </h3>
              {dto.motivo && !privacyMode && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{dto.motivo}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{fmtTimeRange(dto.inicio, dto.fin)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{dto.duracionMinutos} min</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{dto.profesional.nombre}</span>
              </span>
              {dto.consultorio && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background shadow-sm shrink-0"
                    style={{ backgroundColor: consultorioColor }}
                  />
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium truncate">{dto.consultorio.nombre}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 backdrop-blur-sm px-3 py-2 border">
          <Switch id="privacy-mode" checked={privacyMode} onCheckedChange={setPrivacyMode} />
          <Label htmlFor="privacy-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
            {privacyMode ? (
              <>
                <EyeOff className="h-3.5 w-3.5" /> Datos ocultos
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> Datos visibles
              </>
            )}
          </Label>
        </div>
      </div>

      <ScrollArea className="flex-1 [&>[data-radix-scroll-area-viewport]]:pb-2">
        <div className="p-4 space-y-4 pb-44 sm:pb-32">
          

          <section>
            <SectionHeader icon={<FileWarning className="h-3.5 w-3.5" />} title="Alertas clínicas" />
            <div className="mt-2 space-y-2">
              {dto.alertas.tieneAlergias && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 py-2.5">
                  <FileWarning className="h-4 w-4 text-amber-700 dark:text-amber-500" />
                  <AlertDescription className="text-amber-900 dark:text-amber-100">
                    <p className="font-bold text-xs mb-0.5">Alergias registradas</p>
                    {!privacyMode && dto.alertas.alergiasDetalle && (
                      <p className="text-xs leading-relaxed">{dto.alertas.alergiasDetalle}</p>
                    )}
                    {!privacyMode && !dto.alertas.alergiasDetalle && currentUser?.role === "RECEP" && (
                      <p className="text-xs italic opacity-80">Detalle visible solo para profesionales</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {dto.alertas.obraSocial && !privacyMode && (
                <div className="rounded-lg border bg-card p-2.5 text-xs">
                  <span className="font-semibold">Cobertura:</span>{" "}
                  <span className="text-muted-foreground">{dto.alertas.obraSocial}</span>
                </div>
              )}

              {dto.alertas.noShowCount > 0 && (
                <div className="rounded-lg border-rose-200 border bg-rose-50 dark:border-rose-800/50 dark:bg-rose-950/30 p-2.5 text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300">Inasistencias:</span>{" "}
                  <span className="text-rose-700 dark:text-rose-400 font-semibold">
                    {dto.alertas.noShowCount} {dto.alertas.noShowCount === 1 ? "vez" : "veces"}
                  </span>
                </div>
              )}
            </div>
          </section>

          {!privacyMode && (
            <section>
              <SectionHeader icon={<Heart className="h-3.5 w-3.5" />} title="Contexto clínico" />
              <div className="mt-2 space-y-2">
                {dto.contexto.planActivo ? (
                  <div className="rounded-lg border-emerald-200 border bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                      <p className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Plan activo</p>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      {dto.contexto.planActivo.titulo}
                    </p>
                    {dto.contexto.planActivo.proximasEtapas.length > 0 && (
                      <ul className="space-y-1 text-xs text-emerald-700 dark:text-emerald-300">
                        {dto.contexto.planActivo.proximasEtapas.slice(0, 2).map((etapa, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold shrink-0">•</span>
                            <span className="leading-relaxed">{etapa}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 p-3">
                    Sin plan de tratamiento activo
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {dto.contexto.ultimaConsulta && (
                    <div className="rounded-lg border bg-card p-2.5 space-y-1">
                      <span className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground">
                        Última consulta
                      </span>
                      <p className="font-bold text-xs text-foreground">
                        {fmtShort(new Date(dto.contexto.ultimaConsulta))}
                      </p>
                    </div>
                  )}

                  {dto.contexto.proximoTurno && (
                    <div className="rounded-lg border bg-card p-2.5 space-y-1">
                      <span className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground">
                        Próximo turno
                      </span>
                      <p className="font-bold text-xs text-foreground">
                        {fmtShort(new Date(dto.contexto.proximoTurno))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {dto.notas && !privacyMode && (
            <section>
              <SectionHeader icon={<FileText className="h-3.5 w-3.5" />} title="Notas" />
              <div className="mt-2 rounded-lg border bg-muted/30 p-3">
                <p
                  className={cn(
                    "text-xs leading-relaxed whitespace-pre-wrap text-foreground",
                    expandNotes ? "" : "line-clamp-3",
                  )}
                >
                  {dto.notas}
                </p>
                {dto.notas.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs font-semibold"
                    onClick={() => setExpandNotes((v) => !v)}
                  >
                    {expandNotes ? "Ver menos" : "Leer más"}
                  </Button>
                )}
              </div>
            </section>
          )}

          {(esMenor || consentimientoStatus?.requiereCirugia) &&
            (dto.estado === "SCHEDULED" || dto.estado === "CONFIRMED" || dto.estado === "CHECKED_IN") && (
              <section>
                <SectionHeader icon={<FileWarning className="h-3.5 w-3.5" />} title="Consentimientos" />
                <div className="mt-2 space-y-3">
                  {consentimientoStatus?.requiereConsentimiento && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-semibold text-muted-foreground">Consentimiento de menor</h5>
                      {consentimientoStatus.consentimientoVigente && consentimientoStatus.consentimientoResumen ? (
                        <div className="rounded-lg border-emerald-200 border bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Válido</h4>
                                <Badge className="border-emerald-700 text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                                  Vigente
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs text-emerald-800 dark:text-emerald-200">
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                              <p>
                                <strong>Firmado por:</strong> {consentimientoStatus.consentimientoResumen.responsableNombre}
                              </p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                              <p>
                                <strong>Válido para:</strong> Esta cita específica (#{dto.idCita})
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border-amber-200 border bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs text-amber-900 dark:text-amber-100 mb-0.5">Pendiente</h4>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                            Se requiere consentimiento firmado por el responsable del menor{" "}
                            <strong>para esta cita específica (#{dto.idCita})</strong>.
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 italic">
                            Cada cita requiere un nuevo consentimiento.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {consentimientoStatus?.requiereCirugia && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-semibold text-muted-foreground">Consentimiento de cirugía</h5>
                      {consentimientoStatus.cirugiaConsentimientoVigente &&
                      consentimientoStatus.cirugiaConsentimientoResumen ? (
                        <div className="rounded-lg border-emerald-200 border bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Válido</h4>
                                <Badge className="border-emerald-700 text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                                  Vigente
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs text-emerald-800 dark:text-emerald-200">
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                              <p>
                                <strong>Firmado por:</strong>{" "}
                                {consentimientoStatus.cirugiaConsentimientoResumen.responsableNombre}
                              </p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                              <p>
                                <strong>Válido para:</strong> Esta cita quirúrgica (#{dto.idCita})
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border-red-200 border bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 p-3">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs text-red-900 dark:text-red-100 mb-0.5">Requerido</h4>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-red-800 dark:text-red-200">
                            Se requiere consentimiento de cirugía firmado{" "}
                            {consentimientoStatus.esMenorAlInicio ? "por el responsable del menor" : "por el paciente"}{" "}
                            <strong>para esta cita quirúrgica específica (#{dto.idCita})</strong>.
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-2 font-medium">
                            El consentimiento se firma durante el check-in y debe subirse antes de iniciar la consulta.
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                            Cada procedimiento quirúrgico requiere un nuevo consentimiento.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!consentimientoStatus?.requiereConsentimiento && !consentimientoStatus?.requiereCirugia && (
                    <div className="rounded-lg border-emerald-200 border bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/30 p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100">
                            No se requieren consentimientos
                          </h4>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">
                            El paciente es mayor de edad y no hay procedimientos quirúrgicos.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {canUploadConsent &&
                    (dto.estado === "CHECKED_IN" ||
                      consentimientoStatus?.bloqueaInicio ||
                      dto.estado === "SCHEDULED" ||
                      dto.estado === "CONFIRMED") && (
                      <Button
                        size="sm"
                        variant={consentimientoStatus?.bloqueaInicio ? "default" : "outline"}
                        onClick={() => setUploadConsentOpen(true)}
                        className="w-full gap-1.5 font-semibold text-xs h-8"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {consentimientoStatus?.bloqueaInicio
                          ? "Cargar consentimiento (requerido)"
                          : "Cargar/Actualizar consentimiento"}
                      </Button>
                    )}
                </div>
              </section>
            )}

          {dto.adjuntos.length > 0 && !privacyMode && (
            <section>
              <SectionHeader icon={<Paperclip className="h-3.5 w-3.5" />} title={`Archivos (${dto.adjuntos.length})`} />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {dto.adjuntos.map((adj) => (
                  <a
                    key={adj.id}
                    href={adj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-lg border overflow-hidden hover:ring-2 hover:ring-ring hover:shadow-lg transition-all bg-muted/50"
                  >
                    {adj.tipo.startsWith("image/") ? (
                      <Image
                        src={adj.url || "/placeholder.svg"}
                        alt={adj.nombre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <FileText className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-[10px] font-semibold line-clamp-2">{adj.nombre}</p>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-md shadow-lg px-4 py-3 space-y-2 z-40">
        {accionesPermitidas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {accionesPermitidas.map((accion) => {
              const bloqueadoPorConsentimiento =
                consentimientoStatus && accion.action === "START" && consentimientoStatus.bloqueaInicio

              return (
                <Button
                  key={accion.action}
                  variant={accion.variant}
                  size="sm"
                  onClick={() => handleAction(accion.action)}
                  disabled={actionLoading !== null || bloqueadoPorConsentimiento}
                  className={cn(
                    "gap-1.5 font-semibold text-xs flex-1 sm:flex-none min-w-0 h-9",
                    bloqueadoPorConsentimiento && "opacity-50 cursor-not-allowed",
                  )}
                  title={
                    bloqueadoPorConsentimiento
                      ? consentimientoStatus.mensajeBloqueo || "Consentimiento requerido para iniciar consulta"
                      : undefined
                  }
                >
                  {actionLoading === accion.action ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    accion.icon && <span className="shrink-0 text-sm">{accion.icon}</span>
                  )}
                  <span className="truncate">{accion.label}</span>
                </Button>
              )
            })}
          </div>
        )}

        {dto && (
          <div className="flex flex-wrap gap-1.5">
            {(currentUser?.role === "ADMIN" || currentUser?.role === "ODONT") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/agenda/citas/${dto.idCita}/consulta`, "_blank")
              }}
              className="gap-1.5 font-semibold text-xs h-9 flex-1 sm:flex-none"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Consulta
            </Button>
            )}
            
            {/* Follow-up appointment button - only for COMPLETED appointments */}
            {dto.estado === "COMPLETED" && (
              <Button
                variant={followUpContext?.hasPendingSessions ? "default" : "outline"}
                size="sm"
                onClick={() => setFollowUpOpen(true)}
                disabled={isLoadingFollowUp}
                className="gap-1.5 font-semibold text-xs h-9 flex-1 sm:flex-none"
                title={
                  followUpContext?.hasPendingSessions
                    ? "Programar próxima sesión del plan de tratamiento"
                    : "Crear cita de seguimiento"
                }
              >
                <Calendar className="h-3.5 w-3.5" />
                {isLoadingFollowUp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : followUpContext?.hasPendingSessions ? (
                  "Próxima sesión"
                ) : (
                  "Seguimiento"
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/pacientes/${dto.paciente.id}`, "_blank")
              }}
              className="gap-1.5 font-semibold text-xs h-9 flex-1 sm:flex-none"
            >
              <User2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ficha</span>
              <ExternalLink className="h-3 w-3 sm:hidden" />
            </Button>
            <SheetClose asChild>
              <Button
                variant="ghost"
                className="font-semibold text-xs h-9 flex-1 sm:flex-none"
                onClick={(e) => {
                  if (onClose) {
                    e.preventDefault()
                    onClose()
                  }
                }}
              >
                Cerrar
              </Button>
            </SheetClose>
          </div>
        )}
      </div>

      <CancelCitaDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        value={cancelReason}
        onChange={setCancelReason}
        notes={cancelNotes}
        onNotesChange={setCancelNotes}
        onConfirm={onConfirmCancel}
        submitting={cancelSubmitting}
      />

      {dto && (
        <UploadConsentDialog
          open={uploadConsentOpen}
          onOpenChange={setUploadConsentOpen}
          pacienteId={dto.paciente.id}
          patientInfo={{
            id: dto.paciente.id,
            personaId: dto.paciente.personaId,
            nombres: dto.paciente.nombre.split(" ")[0] || "",
            apellidos: dto.paciente.nombre.split(" ").slice(1).join(" ") || "",
            fechaNacimiento: dto.paciente.fechaNacimiento || null,
            documento: dto.paciente.documento
              ? {
                  tipo: dto.paciente.documento.split(" ")[0] || "",
                  numero: dto.paciente.documento.split(" ")[1] || "",
                }
              : undefined,
          }}
          citaId={dto.idCita}
          consentType={
            consentimientoStatus?.requiereCirugia && !consentimientoStatus?.cirugiaConsentimientoVigente
              ? "CIRUGIA"
              : "CONSENTIMIENTO_MENOR_ATENCION"
          }
          onSuccess={async () => {
            setUploadConsentOpen(false)

            const estabaBloqueado = consentimientoStatus?.bloqueaInicio

            try {
              await loadData(true)
              await new Promise((resolve) => setTimeout(resolve, 100))
              onAfterChange?.()

              if (estabaBloqueado) {
                showSuccessToast("CONSENTIMIENTO_REGISTRADO")
              }
            } catch (error) {
              console.error("[CitaDrawer] Error recargando datos después de subir consentimiento:", error)
              onAfterChange?.()

              showErrorToast(
                "INTERNAL_ERROR",
                undefined,
                "El consentimiento se subió correctamente, pero hubo un problema al actualizar la vista. Por favor, recarga la página.",
              )
            }
          }}
        />
      )}

      <ConsentimientoRequeridoDialog
        open={consentErrorOpen}
        onOpenChange={setConsentErrorOpen}
        message={consentErrorMessage}
        pacienteId={dto?.paciente.id}
        canUpload={canUploadConsent}
        onUploadClick={() => {
          setConsentErrorOpen(false)
          setUploadConsentOpen(true)
        }}
      />

      {dto && (
        <NuevaCitaSheet
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          mode="reschedule"
          citaId={dto.idCita}
          citaData={dto}
          currentUser={currentUser}
          onSuccess={async () => {
            setRescheduleOpen(false)
            await loadData()
            onAfterChange?.()
            showSuccessToast("CITA_REPROGRAMADA")
          }}
        />
      )}

      {dto && (
        <NuevaCitaSheet
          open={followUpOpen}
          onOpenChange={setFollowUpOpen}
          mode="follow-up"
          citaId={dto.idCita}
          citaData={dto}
          followUpContext={followUpContext || null}
          currentUser={currentUser}
          defaults={
            followUpContext?.recommendedFollowUpDate
              ? { inicio: new Date(followUpContext.recommendedFollowUpDate) }
              : undefined
          }
          onSuccess={async () => {
            setFollowUpOpen(false)
            await loadData()
            onAfterChange?.()
            showSuccessToast("CITA_CREATED")
          }}
        />
      )}
    </div>
  )
}

function HeaderSkeleton({ onClose }: { onClose?: () => void }) {
  return (
    <div className="border-b p-4 flex items-start justify-between">
      <div className="min-w-0 space-y-2 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-52" />
      </div>
      <SheetClose asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={(e) => {
            if (onClose) {
              e.preventDefault()
              onClose()
            }
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </SheetClose>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <Separator className="flex-1 ml-auto" />
    </div>
  )
}

function fmtTimeRange(startISO: string, endISO: string) {
  const s = new Date(startISO)
  const e = new Date(endISO)
  const dfDay = new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
  const dfTime = new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${dfDay.format(s)} · ${dfTime.format(s)} – ${dfTime.format(e)}`
}

function fmtShort(d: Date) {
  const day = new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(d)
  const tm = new Intl.DateTimeFormat("es", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
  return `${day} · ${tm}`
}

function getEstadoUI(estado: EstadoCita): {
  label: string
  className: string
  icon?: string
} {
  switch (estado) {
    case "SCHEDULED":
      return {
        label: "Agendada",
        className: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        icon: "○",
      }
    case "CONFIRMED":
      return {
        label: "Confirmada",
        className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        icon: "✓",
      }
    case "CHECKED_IN":
      return {
        label: "Check-in",
        className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        icon: "◐",
      }
    case "IN_PROGRESS":
      return {
        label: "En curso",
        className: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
        icon: "●",
      }
    case "COMPLETED":
      return {
        label: "Completada",
        className: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400",
        icon: "✓✓",
      }
    case "CANCELLED":
      return {
        label: "Cancelada",
        className: "bg-red-500/15 text-red-700 dark:text-red-400",
        icon: "✕",
      }
    case "NO_SHOW":
      return {
        label: "No asistió",
        className: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
        icon: "⊘",
      }
    default:
      return {
        label: String(estado),
        className: "bg-muted text-muted-foreground",
      }
  }
}

function getAccionesPermitidas(
  estado: EstadoCita,
  rol?: "ADMIN" | "ODONT" | "RECEP",
): Array<{
  action: AccionCita
  label: string
  variant: "default" | "outline" | "destructive"
  icon?: string
}> {
  const acciones: Array<{
    action: AccionCita
    label: string
    variant: "default" | "outline" | "destructive"
    icon?: string
    roles: Array<"ADMIN" | "ODONT" | "RECEP">
  }> = []

  switch (estado) {
    case "SCHEDULED":
      acciones.push(
        {
          action: "CONFIRM",
          label: "Confirmar",
          variant: "default",
          icon: "✓",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "RESCHEDULE",
          label: "Reprogramar",
          variant: "outline",
          icon: "↻",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "NO_SHOW",
          label: "No asistió",
          variant: "outline",
          icon: "⊘",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
      )
      break

    case "CONFIRMED":
      acciones.push(
        {
          action: "CHECKIN",
          label: "Check-in",
          variant: "default",
          icon: "◐",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "RESCHEDULE",
          label: "Reprogramar",
          variant: "outline",
          icon: "↻",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "NO_SHOW",
          label: "No asistió",
          variant: "outline",
          icon: "⊘",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
      )
      break

    case "CHECKED_IN":
      acciones.push(
        {
          action: "START",
          label: "Iniciar consulta",
          variant: "default",
          icon: "●",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "NO_SHOW",
          label: "No asistió",
          variant: "outline",
          icon: "⊘",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
      )
      break

    case "IN_PROGRESS":
      acciones.push(
        {
          action: "COMPLETE",
          label: "Completar",
          variant: "default",
          icon: "✓✓",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT", "RECEP"],
        },
      )
      break

    default:
      break
  }

  return acciones.filter((a) => !rol || a.roles.includes(rol))
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function CancelCitaDialog({
  open,
  onOpenChange,
  value,
  onChange,
  notes,
  onNotesChange,
  onConfirm,
  submitting,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  value: "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO"
  onChange: (v: "PACIENTE" | "PROFESIONAL" | "CLINICA" | "EMERGENCIA" | "OTRO") => void
  notes: string
  onNotesChange: (v: string) => void
  onConfirm: () => void
  submitting: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={value} onValueChange={onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PACIENTE">Paciente</SelectItem>
                <SelectItem value="PROFESIONAL">Profesional</SelectItem>
                <SelectItem value="CLINICA">Clínica</SelectItem>
                <SelectItem value="EMERGENCIA">Emergencia</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Detalle o comentario adicional…"
              maxLength={2000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirmar cancelación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConsentimientoRequeridoDialog({
  open,
  onOpenChange,
  message,
  pacienteId,
  canUpload,
  onUploadClick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: string | null
  pacienteId?: number
  canUpload: boolean
  onUploadClick: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Consentimiento informado requerido</DialogTitle>
              <DialogDescription className="mt-1">
                No se puede iniciar la consulta sin el consentimiento correspondiente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-2">Requisito legal</p>
              <p className="text-sm">
                {message ||
                  "El paciente es menor de edad y requiere un consentimiento informado vigente firmado por su responsable legal antes de poder iniciar la consulta."}
              </p>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Para continuar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                {message?.includes("cirugía")
                  ? "El paciente (o responsable si es menor) debe firmar el consentimiento de cirugía durante el check-in"
                  : "El responsable del paciente debe firmar el consentimiento informado"}
              </li>
              <li>El documento debe ser digitalizado (PDF o imagen)</li>
              <li>El consentimiento debe estar vigente al momento de la consulta</li>
            </ul>
          </div>

          {canUpload && pacienteId && (
            <div className="flex flex-col gap-2">
              <Button onClick={onUploadClick} className="w-full gap-2">
                <Upload className="h-4 w-4" />
                Subir consentimiento ahora
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Puedes subir el consentimiento firmado desde aquí
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
