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
import { PacientePeek } from "@/components/pacientes/PacientePeek"
import { apiCancelCita, apiGetCitaDetalle } from "@/lib/api/agenda/citas"
import { apiTransitionCita } from "@/lib/api/agenda/citas"
import { UploadConsentDialog } from "@/components/pacientes/consentimientos/UploadConsentDialog"
import { NuevaCitaSheet } from "./NuevaCitaSheet"
import type { CitaConsentimientoStatus } from "@/app/api/agenda/citas/[id]/_dto"
import { handleApiError, showSuccessToast, showErrorToast } from "@/lib/messages/agenda-toast-helpers"
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
  Search,
} from "lucide-react"
import type { CitaDetalleDTO, CurrentUser, EstadoCita, AccionCita } from "@/types/agenda"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils/patient-helpers"
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

  /**
   * Carga los datos de la cita desde el servidor.
   * 
   * @param forceRefresh - Si es true, fuerza un refresh completo ignorando cache
   * 
   * @remarks
   * Este método:
   * 1. Obtiene el detalle completo de la cita (incluyendo consentimientoStatus)
   * 2. Actualiza el estado local del componente
   * 3. El consentimientoStatus se calcula en el backend cada vez que se llama
   * 
   * Flujo de estados de consentimiento:
   * - Si el paciente es mayor: consentimientoStatus.consentimientoVigente = true, bloqueaInicio = false
   * - Si el paciente es menor sin consentimiento: bloqueaInicio = true
   * - Si el paciente es menor con consentimiento vigente: bloqueaInicio = false
   */
  const loadData = React.useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true)
      setErr(null)
      // Forzar refresh completo para obtener el estado actualizado de consentimiento
      const data = await apiGetCitaDetalle(idCita, forceRefresh)
      
      // Actualizar estado de forma atómica
      setDto((prevDto) => {
        // Log para debugging: verificar cambios de estado
        if (prevDto && data.estado !== prevDto.estado) {
          console.log(
            `[CitaDrawer] Estado de cita cambió: ${prevDto.estado} → ${data.estado}`,
          )
        }
        
        // Log para debugging: verificar cambios en consentimiento
        if (
          prevDto &&
          prevDto.consentimientoStatus?.consentimientoVigente !==
          data.consentimientoStatus?.consentimientoVigente
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
  }, [idCita])

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

    // Validación preventiva: bloquear START y CHECKIN si falta consentimiento para menor
    if ((action === "START" || action === "CHECKIN") && esMenor && consentimientoStatus) {
      if (action === "START" && consentimientoStatus.bloqueaInicio) {
        setConsentErrorMessage(
          consentimientoStatus.mensajeBloqueo ||
            "El paciente es menor de edad y requiere un consentimiento informado vigente firmado por su responsable antes de iniciar la consulta.",
        )
        setConsentErrorOpen(true)
        return
      }
      // Para CHECKIN, mostrar advertencia pero permitir (el bloqueo real es en START)
      if (action === "CHECKIN" && !consentimientoStatus.consentimientoVigente) {
        const { toast } = await import("sonner")
        toast.warning("Advertencia: Consentimiento pendiente", {
          description: "El paciente es menor y aún no tiene consentimiento. Debe subirlo antes de iniciar la consulta.",
          duration: 5000,
        })
      }
    }

    try {
      setActionLoading(action)
      await apiTransitionCita(idCita, action, note) // otras acciones
      await loadData()
      onAfterChange?.()
      
      // Mostrar mensaje de éxito según la acción realizada
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
          // NO_SHOW no tiene mensaje de éxito específico, usar genérico
          showSuccessToast("ESTADO_ACTUALIZADO")
          break
        default:
          // Para otras acciones, usar mensaje genérico
          showSuccessToast("ESTADO_ACTUALIZADO")
      }
    } catch (e: unknown) {
      // Manejar error de consentimiento requerido de manera profesional
      const errorCode = (e as { code?: string })?.code
      const errorMessage = e instanceof Error ? e.message : String(e)
      if (errorCode === "CONSENT_REQUIRED_FOR_MINOR" || errorMessage.includes("consentimiento")) {
        setConsentErrorMessage(
          errorMessage ||
            "El paciente es menor de edad y requiere un consentimiento informado vigente firmado por su responsable antes de iniciar la consulta.",
        )
        setConsentErrorOpen(true)
      } else {
        // Para otros errores, usar helper centralizado
        handleApiError(e)
      }
    } finally {
      setActionLoading(null)
    }
  }

  const onConfirmCancel = async () => {
    try {
      setCancelSubmitting(true)
      // Opción A: usar endpoint dedicado (recomendado)
      await apiCancelCita(idCita, cancelReason, cancelNotes || undefined)

      // Opción B (si preferís unificar en /transition):
      // await apiTransitionCita(idCita, "CANCEL", cancelNotes || undefined, cancelReason)

      await loadData()
      onAfterChange?.()
      setCancelOpen(false)
      
      // Mostrar mensaje de éxito profesional
      showSuccessToast("CITA_CANCELADA")
    } catch (e: unknown) {
      // Manejar errores con helper centralizado
      handleApiError(e)
    } finally {
      setCancelSubmitting(false)
    }
  }

  /**
   * Determina si el paciente es menor de edad al momento de la cita.
   * 
   * @remarks
   * Prioridad de verificación:
   * 1. Usa consentimientoStatus.esMenorAlInicio si está disponible (calculado en backend)
   * 2. Fallback: calcula desde fechaNacimiento usando isMinorAt
   * 
   * Este valor se usa para:
   * - Mostrar/ocultar la sección de consentimiento
   * - Bloquear/habilitar el botón "Iniciar consulta"
   * - Mostrar advertencias en CHECKIN
   */
  const esMenor = React.useMemo(() => {
    if (!dto) return false
    const consentimientoStatus = dto.consentimientoStatus
    if (consentimientoStatus) {
      return consentimientoStatus.esMenorAlInicio
    }
    // Fallback: calcular desde fecha de nacimiento
    if (dto.paciente.fechaNacimiento) {
      const fechaNacimiento = new Date(dto.paciente.fechaNacimiento)
      const fechaInicio = new Date(dto.inicio)
      return isMinorAt(fechaNacimiento, fechaInicio) === true
    }
    return false
  }, [dto])

  if (loading) {
    return (
      <div className="flex h-full flex-col bg-gradient-to-br from-background to-muted/20">
        <HeaderSkeleton onClose={onClose} />
        <ScrollArea className="flex-1">
          <div className="p-4 lg:p-5 space-y-4 lg:space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-7 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-lg" />
            </div>
            <Skeleton className="h-28 w-full rounded-xl" />
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
        <div className="flex items-center justify-between p-4 lg:p-5 border-b bg-gradient-to-r from-destructive/10 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Cita #{idCita}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Error al cargar</p>
            </div>
          </div>
          <SheetClose asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9"
              onClick={(e) => {
                // Fallback: si SheetClose no funciona, usar onClose directamente
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
        <div className="p-4 lg:p-5 space-y-3">
          <Alert variant="destructive" className="border-2">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="font-medium text-sm">
              {err ?? "No se pudo cargar los detalles"}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => {
              void loadData()
            }}
            variant="outline"
            className="w-full bg-transparent text-sm"
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
  const canUploadConsent = currentUser?.role === "ADMIN" || currentUser?.role === "ODONT" || currentUser?.role === "RECEP"
  const consentimientoStatus: CitaConsentimientoStatus | undefined = dto.consentimientoStatus

  return (
    <div className="flex h-full flex-col bg-background">
      <div
        className="relative border-b bg-gradient-to-br from-card via-background to-muted/20 p-3 lg:p-3.5"
        style={{
          borderLeft: `4px solid ${consultorioColor ?? "var(--primary)"}`,
        }}
      >
        <div className="flex items-start justify-between gap-2 lg:gap-3">
          <div className="min-w-0 flex-1 space-y-1.5 lg:space-y-2">
            <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
              <div className="flex h-6 w-6 lg:h-7 lg:w-7 items-center justify-center rounded-lg bg-primary/10">
                <Hash className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">#{dto.idCita}</span>
              <Badge
                variant="outline"
                className={cn("border-0 font-semibold shadow-sm px-1.5 lg:px-2 py-0 text-xs", estadoUI.className)}
              >
                {estadoUI.icon && <span className="mr-1 text-xs lg:text-sm">{estadoUI.icon}</span>}
                {estadoUI.label}
              </Badge>
            </div>

            <div>
              <h3 className="text-sm lg:text-base font-bold leading-tight">
                {privacyMode ? "████████████" : dto.paciente.nombre}
              </h3>
              {dto.motivo && !privacyMode && (
                <p className="mt-0.5 lg:mt-1 text-xs text-muted-foreground   line-clamp-2">{dto.motivo}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 lg:gap-x-3 gap-y-0.5 lg:gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 lg:gap-1.5 font-semibold">
                <Calendar className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-primary shrink-0" />
                <span className="truncate">{fmtTimeRange(dto.inicio, dto.fin)}</span>
              </span>
              <span className="inline-flex items-center gap-1 lg:gap-1.5 ">
                <Clock className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                <span>{dto.duracionMinutos} min</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 lg:gap-x-3 gap-y-0.5 lg:gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 lg:gap-1.5 ">
                <Stethoscope className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0" />
                <span className=" truncate">{dto.profesional.nombre}</span>
              </span>
              {dto.consultorio && (
                <span className="inline-flex items-center gap-1 lg:gap-1.5 ">
                  <span
                    className="inline-block h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full ring-2  ring-background shadow-sm shrink-0"
                    style={{ backgroundColor: consultorioColor }}
                  />
                  <MapPin className="h-3 w-3 lg:h-3.5 lg:w-3.5 shrink-0 " />
                  <span className="font-medium truncate text-muted-foreground">{dto.consultorio.nombre}</span>
                </span>
              )}
            </div>
          </div>

        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/60 backdrop-blur-sm px-2.5 lg:px-3 py-1.5 lg:py-2 border">
          <Switch
            id="privacy-mode"
            checked={privacyMode}
            onCheckedChange={setPrivacyMode}
            className="scale-90 lg:scale-100"
          />
          <Label htmlFor="privacy-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
            {privacyMode ? (
              <>
                <EyeOff className="h-3 w-3 lg:h-3.5 lg:w-3.5" /> Datos ocultos
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 lg:h-3.5 lg:w-3.5" /> Datos visibles
              </>
            )}
          </Label>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 lg:p-3.5 space-y-3 lg:space-y-3.5 pb-40 sm:pb-4">
          <section>
            <SectionHeader icon={<User2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />} title="Paciente" />
            <div className="mt-2 flex items-center gap-2">
              <PacientePeek pacienteId={dto.paciente.id}>
                <Button variant="outline" size="sm" className="font-semibold bg-transparent text-xs h-7 lg:h-8">
                  {privacyMode ? "Ver información" : dto.paciente.nombre}
                </Button>
              </PacientePeek>
              <a
                href={`/pacientes/${dto.paciente.id}`}
                className="text-xs font-semibold underline underline-offset-4 text-primary hover:text-primary/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ficha completa →
              </a>
            </div>
          </section>

          <section>
            <SectionHeader icon={<FileWarning className="h-3 w-3 lg:h-3.5 lg:w-3.5" />} title="Alertas clínicas" />
            <div className="mt-2 space-y-1.5 lg:space-y-2">
              {dto.alertas.tieneAlergias && (
                <Alert className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-900/50 dark:from-amber-950/50 dark:to-amber-900/30 py-2 lg:py-2.5">
                  <FileWarning className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-amber-700 dark:text-amber-500" />
                  <AlertDescription className="text-amber-900 dark:text-amber-100">
                    <p className="font-bold text-xs mb-0.5">Alergias registradas</p>
                    {!privacyMode && dto.alertas.alergiasDetalle && (
                      <p className="text-xs leading-relaxed">{dto.alertas.alergiasDetalle}</p>
                    )}
                    {!privacyMode && !dto.alertas.alergiasDetalle && currentUser?.role === "RECEP" && (
                      <p className="text-xs italic opacity-90">Detalle visible solo para profesionales</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {dto.alertas.obraSocial && !privacyMode && (
                <div className="rounded-lg lg:rounded-xl border bg-card p-2 lg:p-2.5 text-xs">
                  <span className="font-semibold">Cobertura:</span>{" "}
                  <span className="text-muted-foreground">{dto.alertas.obraSocial}</span>
                </div>
              )}

              {dto.alertas.noShowCount > 0 && (
                <div className="rounded-lg lg:rounded-xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:border-rose-900/50 dark:from-rose-950/50 dark:to-rose-900/30 p-2 lg:p-2.5 text-xs">
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
              <SectionHeader icon={<Heart className="h-3 w-3 lg:h-3.5 lg:w-3.5" />} title="Contexto clínico" />
              <div className="mt-2 space-y-2">
                {dto.contexto.planActivo ? (
                  <div className="rounded-lg lg:rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-900/50 dark:from-emerald-950/50 dark:to-emerald-900/30 p-2.5 lg:p-3 space-y-1.5 lg:space-y-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-emerald-600 dark:text-emerald-500" />
                      <p className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Plan activo</p>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      {dto.contexto.planActivo.titulo}
                    </p>
                    {dto.contexto.planActivo.proximasEtapas.length > 0 && (
                      <ul className="space-y-0.5 lg:space-y-1 text-xs text-emerald-700 dark:text-emerald-300">
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
                  <p className="text-xs text-muted-foreground rounded-lg lg:rounded-xl border bg-gradient-to-br from-card to-muted/30 p-2.5 lg:p-3">
                    Sin plan de tratamiento activo
                  </p>
                )}

                <div className="grid gap-1.5 lg:gap-2 sm:grid-cols-2">
                  {dto.contexto.ultimaConsulta && (
                    <div className="rounded-lg lg:rounded-xl border bg-card p-2 lg:p-2.5 space-y-0.5 lg:space-y-1">
                      <span className="font-bold text-[10px] uppercase tracking-wide text-muted-foreground">
                        Última consulta
                      </span>
                      <p className="font-bold text-xs text-foreground">
                        {fmtShort(new Date(dto.contexto.ultimaConsulta))}
                      </p>
                    </div>
                  )}

                  {dto.contexto.proximoTurno && (
                    <div className="rounded-lg lg:rounded-xl border bg-card p-2 lg:p-2.5 space-y-0.5 lg:space-y-1">
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
              <SectionHeader icon={<FileText className="h-3 w-3 lg:h-3.5 lg:w-3.5" />} title="Notas" />
              <div className="mt-2 rounded-lg lg:rounded-xl border bg-gradient-to-br from-card to-muted/30 p-2.5 lg:p-3">
                <p
                  className={cn(
                    "text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground",
                    expandNotes ? "" : "line-clamp-3",
                  )}
                >
                  {dto.notas}
                </p>
                {dto.notas.length > 150 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1.5 lg:mt-2 h-6 lg:h-7 text-xs font-semibold"
                    onClick={() => setExpandNotes((v) => !v)}
                  >
                    {expandNotes ? "Ver menos" : "Leer más"}
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Sección de consentimiento: mostrar desde SCHEDULED si es menor */}
          {esMenor && (dto.estado === "SCHEDULED" || dto.estado === "CONFIRMED" || dto.estado === "CHECKED_IN") && (
            <section>
              <SectionHeader icon={<FileWarning className="h-3 w-3 lg:h-3.5 lg:w-3.5" />} title="Consentimiento" />
              <div className="mt-2 space-y-1.5 lg:space-y-2">
                {consentimientoStatus?.consentimientoVigente && consentimientoStatus.consentimientoResumen ? (
                  <div className="rounded-lg lg:rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-emerald-900/30 p-2.5 lg:p-3">
                    <div className="flex items-start gap-2 mb-1.5 lg:mb-2">
                      <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-full bg-emerald-500 dark:bg-emerald-600 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-100">Válido</h4>
                          <Badge className="border-emerald-700 text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            Vigente
                          </Badge>
                        </div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300">Documentación completa</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-emerald-800 dark:text-emerald-200">
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                        <p>
                          <strong>Firmado:</strong> {consentimientoStatus.consentimientoResumen.responsableNombre} (
                          {consentimientoStatus.consentimientoResumen.responsableTipoVinculo})
                        </p>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                        <p>
                          <strong>Válido hasta:</strong>{" "}
                          {formatDate(consentimientoStatus.consentimientoResumen.vigenteHasta)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg lg:rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-900 dark:from-amber-950/50 dark:to-amber-900/30 p-2.5 lg:p-3">
                    <div className="flex items-start gap-2 mb-1.5 lg:mb-2">
                      <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-full bg-amber-500 dark:bg-amber-600 shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-amber-900 dark:text-amber-100 mb-0.5">Pendiente</h4>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">Consentimiento requerido</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                      {dto.estado === "CHECKED_IN"
                        ? "Debe cargar consentimiento antes de iniciar consulta. La acción 'Iniciar consulta' estará bloqueada hasta que se suba el documento."
                        : dto.estado === "SCHEDULED" || dto.estado === "CONFIRMED"
                          ? "Se requiere consentimiento firmado antes de iniciar la consulta. Puede subirlo ahora o cuando el paciente llegue."
                          : consentimientoStatus?.mensajeBloqueo || "Se requiere consentimiento firmado."}
                    </p>
                  </div>
                )}

                {/* Mostrar botón de subir consentimiento si:
                    - El usuario puede subir (ADMIN/ODONT)
                    - Y (está en CHECKED_IN O no hay consentimiento vigente)
                    - O está en SCHEDULED/CONFIRMED sin consentimiento (para subirlo anticipadamente)
                */}
                {canUploadConsent &&
                  (dto.estado === "CHECKED_IN" ||
                    !consentimientoStatus?.consentimientoVigente ||
                    (dto.estado === "SCHEDULED" || dto.estado === "CONFIRMED")) && (
                    <Button
                      size="sm"
                      variant={consentimientoStatus?.consentimientoVigente ? "outline" : "default"}
                      onClick={() => setUploadConsentOpen(true)}
                      className="w-full gap-1.5 font-bold text-xs h-7 lg:h-8"
                    >
                      <Upload className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                      {consentimientoStatus?.consentimientoVigente
                        ? "Actualizar consentimiento"
                        : dto.estado === "CHECKED_IN"
                          ? "Cargar consentimiento (requerido)"
                          : "Cargar consentimiento"}
                    </Button>
                  )}
              </div>
            </section>
          )}

          {dto.adjuntos.length > 0 && !privacyMode && (
            <section>
              <SectionHeader
                icon={<Paperclip className="h-3 w-3 lg:h-3.5 lg:w-3.5" />}
                title={`Archivos (${dto.adjuntos.length})`}
              />
              <div className="mt-2 grid grid-cols-3 gap-1.5 lg:gap-2">
                {dto.adjuntos.map((adj) => (
                  <a
                    key={adj.id}
                    href={adj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square rounded-lg border-2 border-border overflow-hidden hover:ring-2 hover:ring-ring hover:border-ring hover:shadow-lg transition-all bg-gradient-to-br from-muted to-muted/50"
                  >
                    {adj.tipo.startsWith("image/") ? (
                      <Image
                        src={adj.url || "/placeholder.svg"}
                        alt={adj.nombre}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1.5 lg:p-2 text-center">
                        <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-muted-foreground mb-0.5 lg:mb-1" />
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

      {/* Footer fijo en mobile (position: fixed), sticky en desktop -botones siempre accesibles */}
      <div className="fixed sm:sticky bottom-0 left-0 right-0 border-t bg-background/98 backdrop-blur-md shadow-2xl sm:shadow-none px-3 py-2.5 lg:px-3.5 lg:py-3 space-y-1.5 lg:space-y-2 z-50">
        {accionesPermitidas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {accionesPermitidas.map((accion) => {
              /**
               * Determina si la acción "START" está bloqueada por falta de consentimiento.
               * 
               * Lógica de bloqueo:
               * - Solo aplica a la acción "START" (Iniciar consulta)
               * - Solo si el paciente es menor de edad
               * - Solo si consentimientoStatus indica que bloquea inicio (bloqueaInicio === true)
               * 
               * @remarks
               * El backend también valida esto en validateConsentForStart, pero esta validación
               * previa en el frontend mejora la UX al deshabilitar el botón antes de intentar la acción.
               */
              const bloqueadoPorConsentimiento =
                esMenor &&
                consentimientoStatus &&
                accion.action === "START" &&
                consentimientoStatus.bloqueaInicio

              // Debug: Log cuando el botón está bloqueado (solo en desarrollo)
              if (process.env.NODE_ENV === "development" && bloqueadoPorConsentimiento) {
                console.log("[CitaDrawer] Botón START bloqueado:", {
                  esMenor,
                  bloqueaInicio: consentimientoStatus.bloqueaInicio,
                  consentimientoVigente: consentimientoStatus.consentimientoVigente,
                  mensaje: consentimientoStatus.mensajeBloqueo,
                })
              }

              return (
                <Button
                  key={accion.action}
                  variant={accion.variant}
                  size="sm"
                  onClick={() => handleAction(accion.action)}
                  disabled={actionLoading !== null || bloqueadoPorConsentimiento}
                  className={cn(
                    "gap-1.5 font-bold text-xs flex-1 sm:flex-none min-w-0 h-8 lg:h-9",
                    bloqueadoPorConsentimiento && "opacity-50 cursor-not-allowed",
                  )}
                  title={
                    bloqueadoPorConsentimiento
                      ? consentimientoStatus.mensajeBloqueo || "Consentimiento requerido para iniciar consulta"
                      : undefined
                  }
                >
                  {actionLoading === accion.action ? (
                    <Loader2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 animate-spin shrink-0" />
                  ) : (
                    accion.icon && <span className="shrink-0 text-xs lg:text-sm">{accion.icon}</span>
                  )}
                  <span className="truncate">{accion.label}</span>
                </Button>
              )
            })}
          </div>
        )}
        
        {/* Botones de navegación */}
        {dto && (
          <div className="flex flex-wrap gap-1.5 border-t pt-1.5 lg:pt-2">
            {(currentUser?.role === "ADMIN" || currentUser?.role === "ODONT") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/agenda/citas/${dto.idCita}/consulta`, "_blank")
                }}
                className="gap-1.5 font-semibold text-xs h-8 lg:h-9"
              >
                <Stethoscope className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                <span className="hidden sm:inline">Consulta Clínica</span>
                <span className="sm:hidden">Consulta</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/citas?q=${encodeURIComponent(dto.paciente.nombre)}`, "_blank")
              }}
              className="gap-1.5 font-semibold text-xs h-8 lg:h-9"
            >
              <Search className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              <span className="hidden sm:inline">Buscar Citas</span>
              <span className="sm:hidden">Buscar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(`/pacientes/${dto.paciente.id}`, "_blank")
              }}
              className="gap-1.5 font-semibold text-xs h-8 lg:h-9"
            >
              <User2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
              <span className="hidden sm:inline">Ficha Paciente</span>
              <span className="sm:hidden">Ficha</span>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-end">
          <SheetClose asChild>
            <Button
              variant="outline"
              className="font-bold bg-transparent text-xs w-full sm:w-auto h-8 lg:h-9"
              onClick={(e) => {
                // Fallback: si SheetClose no funciona, usar onClose directamente
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

      {/* Diálogo para subir consentimiento */}
      {dto && (
        <UploadConsentDialog
          open={uploadConsentOpen}
          onOpenChange={setUploadConsentOpen}
          pacienteId={dto.paciente.id}
          citaId={dto.idCita} // Asociar el consentimiento a esta cita
          onSuccess={async () => {
            setUploadConsentOpen(false)
            
            // Guardar el estado previo para mostrar mensaje si estaba bloqueado
            const estabaBloqueado = consentimientoStatus?.bloqueaInicio
            
            try {
              // IMPORTANTE: Forzar refresh completo para obtener el consentimientoStatus actualizado
              // El backend recalcula el estado de consentimiento cada vez que se llama a getCitaConsentimientoStatus
              await loadData(true) // forceRefresh = true
              
              // Pequeño delay para asegurar que el estado se actualice en la UI
              await new Promise((resolve) => setTimeout(resolve, 100))
              
              // Notificar al calendario para que se actualice
              onAfterChange?.()
              
              // Mostrar mensaje de éxito si estaba bloqueado antes
              if (estabaBloqueado) {
                showSuccessToast("CONSENTIMIENTO_REGISTRADO")
              }
            } catch (error) {
              console.error("[CitaDrawer] Error recargando datos después de subir consentimiento:", error)
              // Aún así notificar al calendario para que se actualice
              onAfterChange?.()
              
              showErrorToast("INTERNAL_ERROR", undefined, "El consentimiento se subió correctamente, pero hubo un problema al actualizar la vista. Por favor, recarga la página.")
            }
          }}
        />
      )}

      {/* Diálogo profesional para error de consentimiento requerido */}
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

      {/* Sheet de reprogramación */}
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
    </div>
  )
}

/* ---------- Subcomponentes / utilidades ---------- */

function HeaderSkeleton({ onClose }: { onClose?: () => void }) {
  return (
    <div className="border-b p-3 lg:p-4 flex items-start justify-between">
      <div className="min-w-0 space-y-1.5 flex-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3.5 w-52" />
      </div>
      <SheetClose asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={(e) => {
            // Fallback: si SheetClose no funciona, usar onClose directamente
            // Nota: onClose puede no estar disponible en el skeleton, pero es seguro
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
    <div className="flex items-center gap-1.5 lg:gap-2">
      <div className="flex h-6 w-6 lg:h-7 lg:w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h4 className="text-[10px] lg:text-xs font-bold uppercase tracking-wide">{title}</h4>
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
        className: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
        icon: "○",
      }
    case "CONFIRMED":
      return {
        label: "Confirmada",
        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        icon: "✓",
      }
    case "CHECKED_IN":
      return {
        label: "Check-in",
        className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        icon: "◐",
      }
    case "IN_PROGRESS":
      return {
        label: "En curso",
        className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
        icon: "●",
      }
    case "COMPLETED":
      return {
        label: "Completada",
        className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
        icon: "✓✓",
      }
    case "CANCELLED":
      return {
        label: "Cancelada",
        className: "bg-red-500/15 text-red-600 dark:text-red-400",
        icon: "✕",
      }
    case "NO_SHOW":
      return {
        label: "No asistió",
        className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
        icon: "⊘",
      }
    default:
      return {
        label: String(estado),
        className: "bg-muted text-foreground/70",
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
      // COMPLETED, CANCELLED, NO_SHOW: sin acciones
      break
  }

  // Filtrar por rol
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

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium">Para continuar:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>El responsable del paciente debe firmar el consentimiento informado</li>
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
