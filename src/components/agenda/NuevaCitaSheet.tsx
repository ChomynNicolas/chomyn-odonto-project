"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiCreateCita, apiReprogramarCita } from "@/lib/api/agenda/citas"
import type { CurrentUser, CitaDetalleDTO } from "@/types/agenda"
import { Controller } from "react-hook-form";
import { PacienteAsyncSelect } from "@/components/selectors/PacienteAsyncSelect";
import { ProfesionalAsyncSelect } from "@/components/selectors/ProfesionalAsyncSelect";
import { useDisponibilidadValidator, roundToMinutes } from "@/hooks/useDisponibilidadValidator";
import { SlotRecommendations } from "./SlotRecommendations";
import { handleApiError, showErrorToast, showSuccessToast } from "@/lib/messages/agenda-toast-helpers";
import { getErrorMessage } from "@/lib/messages/agenda-messages";
// Surgery consent validation removed - now handled during check-in


// Schema base - pacienteId es opcional porque en modo reschedule no se requiere
const nuevaCitaSchemaBase = z.object({
  pacienteId: z.coerce.number().int().positive().optional(),
  profesionalId: z.coerce.number().int().positive({ message: "ID de profesional requerido" }),
  consultorioId: z.coerce.number().int().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  duracionMinutos: z.coerce.number().int().min(5).max(480).default(30),
  tipo: z.enum(["CONSULTA", "LIMPIEZA", "ENDODONCIA", "EXTRACCION", "URGENCIA", "ORTODONCIA", "CONTROL", "OTRO"]),
  motivo: z.string().min(1, "Motivo requerido").max(500),
  notas: z.string().max(2000).optional(),
})

// Schema para crear (pacienteId requerido)
const nuevaCitaSchema = nuevaCitaSchemaBase.extend({
  pacienteId: z.coerce.number().int().positive({ message: "ID de paciente requerido" }),
})

// Schema para reprogramar (pacienteId opcional)
const reprogramarCitaSchema = nuevaCitaSchemaBase

type NuevaCitaForm = z.infer<typeof nuevaCitaSchema>

interface NuevaCitaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaults?: {
    inicio?: Date
    fin?: Date
  }
  currentUser?: CurrentUser
  onSuccess?: () => void
  prefill?: Partial<NuevaCitaForm> & { lockPaciente?: boolean; pacienteDocumento?: number }
  // Modo reprogramación
  mode?: "create" | "reschedule"
  citaId?: number
  citaData?: CitaDetalleDTO
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toLocalDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NuevaCitaSheet({ 
  open, 
  onOpenChange, 
  defaults, 
  currentUser, 
  onSuccess, 
  prefill,
  mode = "create",
  citaId,
  citaData,
}: NuevaCitaSheetProps) {
  // Prellenar datos si es modo reprogramación
  const getInitialValues = (): Partial<NuevaCitaForm> => {
    if (mode === "reschedule" && citaData) {
      const inicioDate = new Date(citaData.inicio)
      return {
        pacienteId: citaData.paciente.id,
        profesionalId: citaData.profesional.id,
        consultorioId: citaData.consultorio?.id,
        duracionMinutos: citaData.duracionMinutos,
        tipo: citaData.tipo,
        motivo: citaData.motivo ?? "Cita",
        notas: citaData.notas ?? undefined,
        fecha: toLocalDateInputValue(inicioDate),
        horaInicio: toLocalTimeInputValue(inicioDate),
      }
    }
    // Modo create: usar prefill o defaults
    return {
      pacienteId: prefill?.pacienteId ?? undefined,
      profesionalId:
        prefill?.profesionalId ??
        (currentUser?.role === "ODONT" ? currentUser?.profesionalId ?? undefined : undefined),
      consultorioId: prefill?.consultorioId ?? 1,
      duracionMinutos: prefill?.duracionMinutos ?? 30,
      tipo: prefill?.tipo ?? "CONSULTA",
      motivo: prefill?.motivo ?? "Cita",
      notas: prefill?.notas,
      fecha: defaults?.inicio ? toLocalDateInputValue(defaults.inicio) : toLocalDateInputValue(new Date()),
      horaInicio: defaults?.inicio ? toLocalTimeInputValue(defaults.inicio) : "09:00",
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    getValues,
    control, 
  } = useForm<NuevaCitaForm>({
    // @ts-expect-error - Los schemas tienen tipos diferentes pero compatibles en runtime
    resolver: zodResolver(mode === "reschedule" ? reprogramarCitaSchema : nuevaCitaSchema),
    defaultValues: getInitialValues(),
  })

  // Validación de disponibilidad usando hook (después de declarar watch)
  const fechaValue = watch("fecha")
  const horaInicioValue = watch("horaInicio")
  const profesionalIdValue = watch("profesionalId")
  const consultorioIdValue = watch("consultorioId")
  const duracionMinutosValue = watch("duracionMinutos") || 30
  
  // Asegurar que excludeCitaId se mantenga constante durante la reprogramación
  // Esto es crítico para que la validación funcione correctamente al cambiar la fecha
  const excludeCitaIdValue = React.useMemo(() => {
    return mode === "reschedule" && citaId ? citaId : undefined
  }, [mode, citaId])

  const disponibilidadValidation = useDisponibilidadValidator({
    fecha: fechaValue || null,
    horaInicio: horaInicioValue || null,
    duracionMinutos: duracionMinutosValue,
    profesionalId: profesionalIdValue,
    consultorioId: consultorioIdValue,
    enabled: !!fechaValue && !!horaInicioValue && !!profesionalIdValue, // Requerir también profesionalId
    excludeCitaId: excludeCitaIdValue, // Excluir cita actual en reschedule (memoizado para estabilidad)
  })

  // Surgery consent validation removed - now handled during check-in
  // const tipoValue = watch("tipo")
  // const pacienteIdValue = watch("pacienteId")

  // Estado para conflictos detectados por el backend (modo reschedule)
  const [conflictos, setConflictos] = React.useState<Array<{
    citaId: number
    inicioISO: string
    finISO: string
    profesional: { id: number; nombre: string }
    consultorio?: { id: number; nombre: string }
  }> | null>(null)

  // Redondear hora de inicio cuando cambia (sincronizado con backend: 15 min)
  // Aplicar en ambos modos (create y reschedule)
  // IMPORTANTE: Usar un ref para evitar loops infinitos y asegurar que solo se actualice cuando el usuario cambia manualmente
  const lastHoraInicioRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (horaInicioValue && fechaValue && lastHoraInicioRef.current !== horaInicioValue) {
      const [h, m] = horaInicioValue.split(":").map(Number)
      const fechaHoraLocal = new Date(`${fechaValue}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`)
      const fechaHoraRedondeada = roundToMinutes(fechaHoraLocal, 15)
      
      // Solo actualizar si cambió y no es el mismo valor que ya teníamos
      const horaRedondeada = `${String(fechaHoraRedondeada.getHours()).padStart(2, "0")}:${String(fechaHoraRedondeada.getMinutes()).padStart(2, "0")}`
      if (horaRedondeada !== horaInicioValue) {
        lastHoraInicioRef.current = horaRedondeada
        setValue("horaInicio", horaRedondeada, { shouldValidate: true })
        // Limpiar conflictos cuando el usuario cambia la hora manualmente
        setConflictos(null)
      } else {
        lastHoraInicioRef.current = horaInicioValue
      }
    }
  }, [horaInicioValue, fechaValue, setValue, setConflictos])

  // Handler para limpiar estado cuando se cierra el Sheet
  const handleClose = React.useCallback(() => {
    setConflictos(null)
    lastHoraInicioRef.current = null
  }, [])

  React.useEffect(() => {
    if (!open) {
      // Limpiar estado al cerrar
      handleClose()
      return
    }
    
    // Si es modo reprogramación y tenemos datos de cita, prellenar
    if (mode === "reschedule" && citaData) {
      const inicioDate = new Date(citaData.inicio)
      const horaInicioStr = toLocalTimeInputValue(inicioDate)
      // Inicializar ref con la hora inicial para evitar que el efecto de redondeo interfiera
      lastHoraInicioRef.current = horaInicioStr
      reset({
        pacienteId: citaData.paciente.id,
        profesionalId: citaData.profesional.id,
        consultorioId: citaData.consultorio?.id,
        duracionMinutos: citaData.duracionMinutos,
        tipo: citaData.tipo,
        motivo: citaData.motivo ?? "Cita",
        notas: citaData.notas ?? undefined,
        fecha: toLocalDateInputValue(inicioDate),
        horaInicio: horaInicioStr,
      })
      setConflictos(null) // Limpiar conflictos al abrir
      return
    }

    // Modo create: usar defaults
    const inicio = defaults?.inicio ?? new Date();
    const current = getValues();
    reset({
      ...current,
      fecha: toLocalDateInputValue(inicio),
      horaInicio: toLocalTimeInputValue(inicio),
      profesionalId:
        current.profesionalId ??
        (currentUser?.role === "ODONT" ? currentUser.profesionalId ?? undefined : undefined),
      duracionMinutos: current.duracionMinutos || 30,
      tipo: (current.tipo as NuevaCitaForm["tipo"]) || "CONSULTA",
    });
    setConflictos(null) // Limpiar conflictos al abrir
  }, [open, defaults?.inicio, reset, getValues, currentUser, mode, citaData, handleClose]);

  // Limpiar ref cuando se cierra el sheet
  React.useEffect(() => {
    if (!open) {
      lastHoraInicioRef.current = null
    }
  }, [open])

  const onSubmit = async (data: NuevaCitaForm) => {
    // Validación previa: bloquear submit si el horario no está disponible (ambos modos)
    // Solo validar si tenemos todos los datos necesarios
    if (
      fechaValue && 
      horaInicioValue && 
      profesionalIdValue &&
      !disponibilidadValidation.isChecking &&
      !disponibilidadValidation.isValid
    ) {
      const errorMsg = getErrorMessage("OUTSIDE_WORKING_HOURS")
      showErrorToast("OUTSIDE_WORKING_HOURS", undefined, disponibilidadValidation.error || errorMsg.userMessage)
      return // Bloquear submit en ambos modos si no está disponible
    }

    // Surgery consent validation removed - now handled during check-in

    // Limpiar conflictos previos
    setConflictos(null)

    try {
      // Redondear hora antes de enviar (sincronizado con backend)
      const [h, m] = data.horaInicio.split(":").map(Number)
      const fechaHoraLocal = new Date(`${data.fecha}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`)
      const fechaHoraRedondeada = roundToMinutes(fechaHoraLocal, 15)
      const inicioISO = fechaHoraRedondeada.toISOString()
      
      if (mode === "reschedule" && citaId) {
        // Modo reprogramación - mismo manejo de errores que create
        try {
          await apiReprogramarCita(citaId, {
            inicio: inicioISO,
            duracionMinutos: data.duracionMinutos,
            profesionalId: data.profesionalId,
            consultorioId: data.consultorioId,
            motivo: data.motivo,
            notas: data.notas,
          })
        } catch (rescheduleError: unknown) {
          const error = rescheduleError as {
            status?: number
            code?: string
            conflicts?: Array<{
              citaId: number
              inicioISO: string
              finISO: string
              profesional: { id: number; nombre: string }
              consultorio?: { id: number; nombre: string }
            }>
            message?: string
            details?: unknown
          }
          
          // Manejar error 409 OVERLAP con conflictos
          if (error?.status === 409 && error?.code === "OVERLAP" && error?.conflicts && Array.isArray(error.conflicts)) {
            setConflictos(error.conflicts)
            
            // Refrescar validación de disponibilidad después de un 409
            setTimeout(() => {
              setValue("fecha", watch("fecha") || "", { shouldValidate: true })
            }, 100)
            
            handleApiError(rescheduleError)
            return // No cerrar el formulario, permitir reintento
          }
          
          // Manejar otros errores específicos que no deben cerrar el formulario
          if (error?.code && (
            error.code === "INCOMPATIBLE_SPECIALTY" ||
            error.code === "PROFESSIONAL_HAS_NO_SPECIALTIES" ||
            error.code === "CONSULTORIO_INACTIVO" ||
            error.code === "CONSULTORIO_BLOCKED" ||
            error.code === "PROFESIONAL_BLOCKED" ||
            error.code === "CONSULTORIO_NOT_FOUND"
          )) {
            handleApiError(rescheduleError)
            return // No cerrar el formulario, permitir cambiar valores
          }
          
          // Re-throw otros errores para que se manejen en el catch general
          throw rescheduleError
        }
      } else {
        // Modo creación
        try {
          await apiCreateCita({
            pacienteId: data.pacienteId,
            profesionalId: data.profesionalId,
            consultorioId: data.consultorioId,
            inicio: inicioISO,
            duracionMinutos: data.duracionMinutos,
            tipo: data.tipo,
            motivo: data.motivo,
            notas: data.notas,
          })
        } catch (createError: unknown) {
          const error = createError as {
            status?: number
            code?: string
            conflicts?: Array<{
              citaId: number
              inicioISO: string
              finISO: string
              profesional: { id: number; nombre: string }
              consultorio?: { id: number; nombre: string }
            }>
            message?: string
            details?: unknown
          }
          
          // Manejar error 409 OVERLAP con conflictos
          if (error?.status === 409 && error?.code === "OVERLAP" && error?.conflicts && Array.isArray(error.conflicts)) {
            setConflictos(error.conflicts)
            
            // Refrescar validación de disponibilidad después de un 409
            setTimeout(() => {
              setValue("fecha", watch("fecha") || "", { shouldValidate: true })
            }, 100)
            
            handleApiError(createError)
            return // No cerrar el formulario, permitir reintento
          }
          
          // Manejar otros errores específicos que no deben cerrar el formulario
          if (error?.code && (
            error.code === "INCOMPATIBLE_SPECIALTY" ||
            error.code === "PROFESSIONAL_HAS_NO_SPECIALTIES" ||
            error.code === "CONSULTORIO_INACTIVO" ||
            error.code === "CONSULTORIO_BLOCKED" ||
            error.code === "PROFESIONAL_BLOCKED" ||
            error.code === "CONSULTORIO_NOT_FOUND"
          )) {
            handleApiError(createError)
            return // No cerrar el formulario, permitir cambiar valores
          }
          
          // Re-throw otros errores para que se manejen en el catch general
          throw createError
        }
      }

      reset()
      setConflictos(null)
      onOpenChange(false)
      
      // Mostrar mensaje de éxito
      if (mode === "reschedule") {
        showSuccessToast("CITA_REPROGRAMADA")
      } else {
        showSuccessToast("CITA_CREATED")
      }
      
      onSuccess?.()
    } catch (e: unknown) {
      // Manejar errores no capturados arriba
      handleApiError(e)
    }
  }
  
  // Handler para seleccionar slot recomendado
  const handleSelectSlot = React.useCallback((fecha: string, horaInicio: string) => {
    // Actualizar ref para evitar que el efecto de redondeo interfiera
    lastHoraInicioRef.current = horaInicio
    setValue("fecha", fecha, { shouldValidate: true })
    setValue("horaInicio", horaInicio, { shouldValidate: true })
    setConflictos(null) // Limpiar conflictos al seleccionar nuevo slot
  }, [setValue, setConflictos])

  return (
    <Sheet 
      open={open} 
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        // Limpiar estado cuando se cierra el Sheet (por cualquier método: X, fuera, ESC, etc.)
        if (!isOpen) {
          handleClose()
        }
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "reschedule" ? "Reprogramar cita" : "Nueva cita"}</SheetTitle>
          <SheetDescription>
            {mode === "reschedule"
              ? "Modifique los datos para reprogramar la cita. La cita original se cancelará y se creará una nueva."
              : "Complete los datos para agendar una nueva cita. Se validará la disponibilidad automáticamente."}
          </SheetDescription>
        </SheetHeader>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 py-6">
          {/* Paciente - Solo en modo create */}
          {mode === "create" && (
            <div className="space-y-2">
              <Label>Paciente <span className="text-destructive">*</span></Label>
              <Controller
                name="pacienteId"
                control={control}
                render={({ field }) => (
                  <PacienteAsyncSelect
                    value={field.value}
                    onChange={(id) => field.onChange(id)}
                    placeholder="Buscar por nombre o cédula"
                    defaultQuery={prefill?.pacienteDocumento ? String(prefill.pacienteDocumento) : ""}
                    disabled={!!prefill?.lockPaciente}
                  />
                )}
              />
              {errors.pacienteId && <p className="text-sm text-destructive">{errors.pacienteId.message}</p>}
              {prefill?.lockPaciente && prefill?.pacienteDocumento && (
                <p className="text-xs text-muted-foreground">
                  Paciente fijado por documento: <span className="font-medium">{prefill.pacienteDocumento}</span>
                </p>
              )}
            </div>
          )}

          {/* En modo reschedule, mostrar info del paciente */}
          {mode === "reschedule" && citaData && (
            <div className="space-y-2">
              <Label>Paciente</Label>
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{citaData.paciente.nombre}</p>
                {citaData.paciente.documento && (
                  <p className="text-xs text-muted-foreground mt-1">{citaData.paciente.documento}</p>
                )}
              </div>
            </div>
          )}

          {/* Profesional */}
          <div className="space-y-2">
            <Label>Profesional <span className="text-destructive">*</span></Label>
            <Controller
              name="profesionalId"
              control={control}  
              render={({ field }) => (
                <ProfesionalAsyncSelect
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                  placeholder="Buscar profesional"
                  // si el usuario es ODONT, ya lo precargas y puedes deshabilitar:
                  disabled={currentUser?.role === "ODONT"}
                />
              )}
            />
            {errors.profesionalId && <p className="text-sm text-destructive">{errors.profesionalId.message}</p>}
          </div>

          {/* Consultorio */}
          <div className="space-y-2">
            <Label htmlFor="consultorioId">Consultorio (opcional)</Label>
            <Input id="consultorioId" type="number" placeholder="ID del consultorio" {...register("consultorioId")} />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="fecha" 
                type="date" 
                {...register("fecha", {
                  onChange: () => {
                    // Limpiar conflictos cuando el usuario cambia la fecha manualmente
                    setConflictos(null)
                    // Resetear ref para permitir que el efecto de redondeo funcione con la nueva fecha
                    lastHoraInicioRef.current = null
                    // El hook useDisponibilidadValidator reaccionará automáticamente al cambio de fecha
                    // gracias a sus dependencias. No necesitamos forzar validación manualmente.
                  }
                })} 
                aria-invalid={!!errors.fecha} 
              />
              {errors.fecha && <p className="text-sm text-destructive">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaInicio">
                Hora <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="horaInicio" 
                type="time" 
                {...register("horaInicio", {
                  onChange: (e) => {
                    // Limpiar conflictos cuando el usuario cambia la hora manualmente
                    setConflictos(null)
                    // Actualizar ref para evitar interferencia del efecto de redondeo
                    lastHoraInicioRef.current = e.target.value
                  }
                })} 
                aria-invalid={!!errors.horaInicio} 
              />
              {errors.horaInicio && <p className="text-sm text-destructive">{errors.horaInicio.message}</p>}
            </div>
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <Label htmlFor="duracionMinutos">Duración (minutos)</Label>
            <Select
              value={String(watch("duracionMinutos"))}
              onValueChange={(v) => setValue("duracionMinutos", Number(v))}
            >
              <SelectTrigger id="duracionMinutos">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1.5 horas</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de cita</Label>
            <Select value={watch("tipo")} onValueChange={(v) => setValue("tipo", v as NuevaCitaForm["tipo"])}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSULTA">Consulta</SelectItem>
                <SelectItem value="LIMPIEZA">Limpieza</SelectItem>
                <SelectItem value="ENDODONCIA">Endodoncia</SelectItem>
                <SelectItem value="EXTRACCION">Extracción</SelectItem>
                <SelectItem value="URGENCIA">Urgencia</SelectItem>
                <SelectItem value="ORTODONCIA">Ortodoncia</SelectItem>
                <SelectItem value="CONTROL">Control</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="motivo"
              placeholder="Ej: Consulta general, dolor molar, etc."
              {...register("motivo")}
              aria-invalid={!!errors.motivo}
            />
            {errors.motivo && <p className="text-sm text-destructive">{errors.motivo.message}</p>}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea id="notas" placeholder="Observaciones adicionales..." rows={3} {...register("notas")} />
          </div>

          {/* Validación de disponibilidad (ambos modos) */}
          {fechaValue && horaInicioValue && profesionalIdValue && (
            <>
              {disponibilidadValidation.isChecking && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Verificando disponibilidad...</AlertDescription>
                </Alert>
              )}

              {!disponibilidadValidation.isChecking && (
                <>
                  {disponibilidadValidation.isValid ? (
                    <Alert className="border-emerald-500/30 bg-emerald-500/10">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                        ✓ Horario disponible
                      </AlertDescription>
                    </Alert>
                  ) : disponibilidadValidation.error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-medium mb-2">{disponibilidadValidation.error}</p>
                        {disponibilidadValidation.recomendaciones.length > 0 && (
                          <div className="mt-3">
                            <SlotRecommendations
                              recomendaciones={disponibilidadValidation.recomendaciones}
                              onSelectSlot={handleSelectSlot}
                            />
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </>
          )}

          {/* Surgery consent validation removed - now handled during check-in */}

          {/* Conflictos detectados por el backend (ambos modos) */}
          {conflictos && conflictos.length > 0 && (
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-bold mb-2">Conflicto de horario detectado</p>
                <p className="text-sm mb-3">
                  El horario seleccionado se solapa con {conflictos.length} cita(s) existente(s). Por favor, seleccione otro horario.
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {conflictos.map((conflicto, i) => {
                    const inicioDate = new Date(conflicto.inicioISO)
                    const finDate = new Date(conflicto.finISO)
                    return (
                      <div
                        key={i}
                        className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs"
                      >
                        <div className="font-semibold mb-1">Cita #{conflicto.citaId}</div>
                        <div className="space-y-0.5 text-muted-foreground">
                          <div>
                            <span className="font-medium">Horario:</span>{" "}
                            {inicioDate.toLocaleString("es", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            –{" "}
                            {finDate.toLocaleString("es", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div>
                            <span className="font-medium">Profesional:</span> {conflicto.profesional.nombre}
                          </div>
                          {conflicto.consultorio && (
                            <div>
                              <span className="font-medium">Consultorio:</span> {conflicto.consultorio.nombre}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Mostrar recomendaciones si están disponibles */}
                {disponibilidadValidation.recomendaciones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <SlotRecommendations
                      recomendaciones={disponibilidadValidation.recomendaciones}
                      onSelectSlot={handleSelectSlot}
                    />
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={Boolean(
                isSubmitting ||
                !fechaValue ||
                !horaInicioValue ||
                !profesionalIdValue ||
                disponibilidadValidation.isChecking ||
                (!!profesionalIdValue && !disponibilidadValidation.isValid)
              )}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "reschedule" ? "Reprogramando..." : "Creando..."}
                </>
              ) : (
                mode === "reschedule" ? "Reprogramar cita" : "Crear cita"
              )}
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </SheetClose>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

