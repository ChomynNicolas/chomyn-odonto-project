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
import { PacientePeek } from "@/components/pacientes/PacientePeek"
import { apiCancelCita, apiGetCitaDetalle } from "@/lib/api/agenda/citas"
import { apiTransitionCita } from "@/lib/api/agenda/citas"
import {
  CalendarClock,
  Clock,
  User2,
  Stethoscope,
  MapPin,
  StickyNote,
  X,
  Hash,
  FileWarning,
  Heart,
  Calendar,
  Paperclip,
  Eye,
  EyeOff,
  XCircle,
  Loader2,
} from "lucide-react"
import type { CitaDetalleDTO, CurrentUser, EstadoCita, AccionCita } from "@/types/agenda"
import { cn } from "@/lib/utils"

interface CitaDrawerProps {
  idCita: number
  onClose: () => void
  currentUser?: CurrentUser
  onAfterChange?: () => void
}

export function CitaDrawer({ idCita, onClose, currentUser, onAfterChange }: CitaDrawerProps) {
  const [loading, setLoading] = React.useState(true)
  const [err, setErr] = React.useState<string | null>(null)
  const [dto, setDto] = React.useState<CitaDetalleDTO | null>(null)
  const [expandNotes, setExpandNotes] = React.useState(false)
  const [privacyMode, setPrivacyMode] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<AccionCita | null>(null)
  const [cancelOpen, setCancelOpen] = React.useState(false)
const [cancelReason, setCancelReason] = React.useState<"PACIENTE"|"PROFESIONAL"|"CLINICA"|"EMERGENCIA"|"OTRO">("PACIENTE")
const [cancelNotes, setCancelNotes] = React.useState("")
const [cancelSubmitting, setCancelSubmitting] = React.useState(false)


  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      setErr(null)
      const data = await apiGetCitaDetalle(idCita)
      setDto(data)
    } catch (e: any) {
      setErr(e?.message ?? "Error obteniendo cita")
    } finally {
      setLoading(false)
    }
  }, [idCita])

  React.useEffect(() => {
    void loadData()
  }, [loadData])

  const handleAction = async (action: Exclude<AccionCita, "RESCHEDULE">, note?: string) => {
  if (!dto) return
  if (action === "CANCEL") {
    setCancelOpen(true)
    return
  }
  try {
    setActionLoading(action)
    await apiTransitionCita(idCita, action, note) // otras acciones
    await loadData()
    onAfterChange?.()
  } catch (e: any) {
    alert(e?.message ?? "Error en transición")
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
  } catch (e: any) {
    alert(e?.message ?? "No se pudo cancelar la cita")
  } finally {
    setCancelSubmitting(false)
  }
}

function prettyMotivo(m: "PACIENTE"|"PROFESIONAL"|"CLINICA"|"EMERGENCIA"|"OTRO") {
  switch (m) {
    case "PACIENTE": return "Paciente";
    case "PROFESIONAL": return "Profesional";
    case "CLINICA": return "Clínica";
    case "EMERGENCIA": return "Emergencia";
    default: return "Otro";
  }
}



  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <HeaderSkeleton onClose={onClose} />
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-24 w-full" />
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (err || !dto) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cita #{idCita}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{err ?? "No se pudo cargar el detalle"}</AlertDescription>
          </Alert>
          <Button onClick={loadData} variant="outline" className="mt-4 bg-transparent">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const estadoUI = getEstadoUI(dto.estado)
  const consultorioColor = dto.consultorio?.colorHex ?? undefined

  const accionesPermitidas = getAccionesPermitidas(dto.estado, currentUser?.rol)

  return (
    <div className="flex h-full flex-col">
      <div
        className="relative border-b p-4"
        style={{
          borderLeft: `6px solid ${consultorioColor ?? "var(--border)"}`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> Cita #{dto.idCita}
              </span>
              <Badge
                variant="outline"
                className={cn("border-0", estadoUI.className)}
                aria-label={`Estado ${estadoUI.label}`}
              >
                {estadoUI.icon && <span className="mr-1">{estadoUI.icon}</span>}
                {estadoUI.label}
              </Badge>
            </div>

            <h3 className="mt-1 text-lg font-semibold truncate">
              {privacyMode ? "████████" : dto.paciente.nombre}
              {dto.motivo && !privacyMode && <span className="font-normal opacity-80"> — {dto.motivo}</span>}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {fmtTimeRange(dto.inicio, dto.fin)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {dto.duracionMinutos} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-4 w-4" />
                {dto.profesional.nombre}
              </span>
              {dto.consultorio && (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                    style={{ backgroundColor: consultorioColor }}
                    aria-hidden
                  />
                  <MapPin className="h-4 w-4 opacity-70" />
                  {dto.consultorio.nombre}
                </span>
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Switch
            id="privacy-mode"
            checked={privacyMode}
            onCheckedChange={setPrivacyMode}
            aria-label="Modo privacidad"
          />
          <Label htmlFor="privacy-mode" className="text-xs cursor-pointer flex items-center gap-1">
            {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Modo privacidad {privacyMode ? "activado" : "desactivado"}
          </Label>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <section>
            <HeaderMini icon={<User2 className="h-4 w-4" />} title="Paciente" />
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <PacientePeek pacienteId={dto.paciente.id}>
                  <Button variant="outline" size="sm">
                    {privacyMode ? "Ver paciente" : dto.paciente.nombre}
                  </Button>
                </PacientePeek>
                <a
                  href={`/pacientes/${dto.paciente.id}`}
                  className="text-sm underline decoration-dotted text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ficha completa
                </a>
              </div>
              {!privacyMode && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {dto.paciente.documento && <p>Doc: {dto.paciente.documento}</p>}
                  {dto.paciente.telefono && <p>Tel: {dto.paciente.telefono}</p>}
                  {dto.paciente.email && <p>Email: {dto.paciente.email}</p>}
                </div>
              )}
            </div>
          </section>

          <section>
            <HeaderMini icon={<FileWarning className="h-4 w-4" />} title="Alertas clínicas" />
            <div className="mt-2 space-y-2">
              {/* Alergias */}
              {dto.alertas.tieneAlergias && (
                <Alert className="border-amber-500/30 bg-amber-500/10">
                  <FileWarning className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-600 dark:text-amber-400">
                    <p className="font-medium">⚠ Alergias registradas</p>
                    {!privacyMode && dto.alertas.alergiasDetalle && (
                      <p className="text-sm mt-1">{dto.alertas.alergiasDetalle}</p>
                    )}
                    {!privacyMode && !dto.alertas.alergiasDetalle && currentUser?.rol === "RECEP" && (
                      <p className="text-sm mt-1 italic">(Detalle visible solo para profesionales)</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Obra social */}
              {dto.alertas.obraSocial && !privacyMode && (
                <div className="text-sm">
                  <span className="font-medium">Obra social:</span> {dto.alertas.obraSocial}
                </div>
              )}

              {/* No-show */}
              {dto.alertas.noShowCount > 0 && (
                <div className="text-sm text-rose-600 dark:text-rose-400">
                  <span className="font-medium">⚠ No-show:</span> {dto.alertas.noShowCount}{" "}
                  {dto.alertas.noShowCount === 1 ? "vez" : "veces"}
                </div>
              )}
            </div>
          </section>

          {!privacyMode && (
            <section>
              <HeaderMini icon={<Heart className="h-4 w-4" />} title="Contexto clínico" />
              <div className="mt-2 space-y-3 text-sm">
                {/* Plan de tratamiento activo */}
                {dto.contexto.planActivo ? (
                  <div>
                    <p className="font-medium text-emerald-600 dark:text-emerald-400">✓ Plan de tratamiento activo</p>
                    <p className="mt-1">{dto.contexto.planActivo.titulo}</p>
                    {dto.contexto.planActivo.proximasEtapas.length > 0 && (
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {dto.contexto.planActivo.proximasEtapas.slice(0, 2).map((etapa, i) => (
                          <li key={i}>• {etapa}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sin plan de tratamiento activo</p>
                )}

                {/* Última consulta */}
                {dto.contexto.ultimaConsulta && (
                  <div>
                    <span className="font-medium">Última consulta:</span>{" "}
                    {fmtShort(new Date(dto.contexto.ultimaConsulta))}
                  </div>
                )}

                {/* Próximo turno */}
                {dto.contexto.proximoTurno && (
                  <div>
                    <span className="font-medium">Próximo turno:</span> {fmtShort(new Date(dto.contexto.proximoTurno))}
                  </div>
                )}
              </div>
            </section>
          )}

          {dto.notas && !privacyMode && (
            <section>
              <HeaderMini icon={<StickyNote className="h-4 w-4" />} title="Notas" />
              <p className={cn("mt-2 text-sm whitespace-pre-wrap", expandNotes ? "" : "line-clamp-4")}>{dto.notas}</p>
              {dto.notas.length > 200 && (
                <Button variant="ghost" size="sm" className="mt-1 px-2 h-7" onClick={() => setExpandNotes((v) => !v)}>
                  {expandNotes ? "Ver menos" : "Ver más"}
                </Button>
              )}
            </section>
          )}

          {dto.adjuntos.length > 0 && !privacyMode && (
            <section>
              <HeaderMini icon={<Paperclip className="h-4 w-4" />} title="Adjuntos recientes" />
              <div className="mt-2 grid grid-cols-3 gap-2">
                {dto.adjuntos.map((adj) => (
                  <a
                    key={adj.id}
                    href={adj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-ring transition-all"
                  >
                    {adj.tipo.startsWith("image/") ? (
                      <img
                        src={adj.url || "/placeholder.svg"}
                        alt={adj.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-xs text-center p-2">
                        {adj.nombre}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section>
            <HeaderMini icon={<Calendar className="h-4 w-4" />} title="Auditoría" />
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>
                Creado por {dto.auditoria.creadoPor} el {new Date(dto.auditoria.creadoEn).toLocaleString("es")}
              </p>
              {dto.auditoria.ultimaTransicion && (
                <p>
                  Última transición por {dto.auditoria.ultimaTransicion.usuario} el{" "}
                  {new Date(dto.auditoria.ultimaTransicion.fecha).toLocaleString("es")}
                  {dto.auditoria.ultimaTransicion.motivo && ` — ${dto.auditoria.ultimaTransicion.motivo}`}
                </p>
              )}
              {dto.timestamps.checkinAt && <p>Check-in: {new Date(dto.timestamps.checkinAt).toLocaleString("es")}</p>}
              {dto.timestamps.startAt && <p>Inicio: {new Date(dto.timestamps.startAt).toLocaleString("es")}</p>}
              {dto.timestamps.completeAt && (
                <p>Completada: {new Date(dto.timestamps.completeAt).toLocaleString("es")}</p>
              )}
              {dto.timestamps.cancelledAt && (
  <p>
    Cancelada: {new Date(dto.timestamps.cancelledAt).toLocaleString("es")}
    {dto.cancelReason && ` (${prettyMotivo(dto.cancelReason)})`}
    {dto.auditoria.canceladoPor && ` — por ${dto.auditoria.canceladoPor}`}
  </p>
)}
            </div>
          </section>
        </div>
      </ScrollArea>

      <div className="border-t px-4 py-3 space-y-2">
        {accionesPermitidas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {accionesPermitidas.map((accion) => (
              <Button
                key={accion.action}
                variant={accion.variant}
                size="sm"
                onClick={() => handleAction(accion.action)}
                disabled={actionLoading !== null}
              >
                {actionLoading === accion.action ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  accion.icon && <span className="mr-2">{accion.icon}</span>
                )}
                {accion.label}
              </Button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
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
    </div>
  )
}

/* ---------- Subcomponentes / utilidades ---------- */

function HeaderSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b p-4 flex items-start justify-between">
      <div className="min-w-0 space-y-2 flex-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function HeaderMini({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <span className="inline-flex items-center justify-center rounded-md border border-border h-6 w-6">{icon}</span>
      <span>{title}</span>
      <Separator className="flex-1 ml-2" />
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
  action: Exclude<AccionCita, "RESCHEDULE">
  label: string
  variant: "default" | "outline" | "destructive"
  icon?: string
}> {
  const acciones: Array<{
    action: Exclude<AccionCita, "RESCHEDULE">
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
          roles: ["ADMIN", "ODONT"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT"],
        },
        {
          action: "NO_SHOW",
          label: "No asistió",
          variant: "outline",
          icon: "⊘",
          roles: ["ADMIN", "ODONT"],
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
          roles: ["ADMIN", "ODONT"],
        },
        {
          action: "CANCEL",
          label: "Cancelar",
          variant: "destructive",
          icon: "✕",
          roles: ["ADMIN", "ODONT"],
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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
              <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
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

