"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiCreateCita } from "@/lib/api/agenda/citas"
import { apiCheckSlotDisponible } from "@/lib/api/agenda/disponibilidad"
import type { CurrentUser } from "@/types/agenda"
// en tu file de NuevaCitaSheet:
import { Controller } from "react-hook-form";
import { PacienteAsyncSelect } from "@/components/selectors/PacienteAsyncSelect";
import { ProfesionalAsyncSelect } from "@/components/selectors/ProfesionalAsyncSelect";


const nuevaCitaSchema = z.object({
  pacienteId: z.coerce.number().int().positive({ message: "ID de paciente requerido" }),
  profesionalId: z.coerce.number().int().positive({ message: "ID de profesional requerido" }),
  consultorioId: z.coerce.number().int().positive().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido"),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  duracionMinutos: z.coerce.number().int().min(5).max(480).default(30),
  tipo: z.enum(["CONSULTA", "LIMPIEZA", "ENDODONCIA", "EXTRACCION", "URGENCIA", "ORTODONCIA", "CONTROL", "OTRO"]),
  motivo: z.string().min(1, "Motivo requerido").max(500),
  notas: z.string().max(2000).optional(),
})

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
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toLocalDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function toLocalTimeInputValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NuevaCitaSheet({ open, onOpenChange, defaults, currentUser, onSuccess,prefill }: NuevaCitaSheetProps) {
  const [checking, setChecking] = React.useState(false)
  const [disponibilidad, setDisponibilidad] = React.useState<{
    disponible: boolean
    alternativas: Array<{ inicio: string; fin: string }>
  } | null>(null)


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
  resolver: zodResolver(nuevaCitaSchema),
  defaultValues: {
    // 👇 si viene prefill, úsalo; si no, mantené tus defaults previos
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
  },
  })

  const watchedFields = watch(["fecha", "horaInicio", "duracionMinutos", "profesionalId", "consultorioId"])

  

  React.useEffect(() => {
    const [fecha, horaInicio, duracionMinutos, profesionalId, consultorioId] = watchedFields
    if (!fecha || !horaInicio || !duracionMinutos) return

    const timer = setTimeout(async () => {
      try {
        setChecking(true)
        const result = await apiCheckSlotDisponible({
          fecha,
          inicio: horaInicio,
          duracionMinutos,
          profesionalId,
          consultorioId,
        })
        setDisponibilidad(result)
      } catch (e) {
        console.error("Error checking disponibilidad:", e)
        setDisponibilidad(null)
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, watchedFields)

  React.useEffect(() => {
    if (!open) return;
    const inicio = defaults?.inicio ?? new Date();

    // Conserva lo que el usuario ya tocó si aplica
    const current = getValues();
    reset({
      ...current,
      fecha: toLocalDateInputValue(inicio),
      horaInicio: toLocalTimeInputValue(inicio),
      // respeta profesional si es ODONT
      profesionalId:
        current.profesionalId ??
        (currentUser?.role === "ODONT" ? currentUser.profesionalId ?? undefined : undefined),
      // mantén otros defaults
      duracionMinutos: current.duracionMinutos || 30,
      tipo: (current.tipo as NuevaCitaForm["tipo"]) || "CONSULTA",
    });
  }, [open, defaults?.inicio, reset, getValues, currentUser]);

  const onSubmit = async (data: NuevaCitaForm) => {
    try {
      const inicioISO = new Date(`${data.fecha}T${data.horaInicio}:00`).toISOString()
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

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      alert(e?.message ?? "Error creando cita")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva cita</SheetTitle>
          <SheetDescription>
            Complete los datos para agendar una nueva cita. Se validará la disponibilidad automáticamente.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-6">
          {/* Paciente */}
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
        // ⬇️ NUEVO: inyectamos el texto inicial del input
        initialQuery={prefill?.pacienteDocumento}
        // si bloqueas el paciente desde la ficha:
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
              <Input id="fecha" type="date" {...register("fecha")} aria-invalid={!!errors.fecha} />
              {errors.fecha && <p className="text-sm text-destructive">{errors.fecha.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaInicio">
                Hora <span className="text-destructive">*</span>
              </Label>
              <Input id="horaInicio" type="time" {...register("horaInicio")} aria-invalid={!!errors.horaInicio} />
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
            <Select value={watch("tipo")} onValueChange={(v) => setValue("tipo", v as any)}>
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

          {checking && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>Verificando disponibilidad...</AlertDescription>
            </Alert>
          )}

          {disponibilidad && !checking && (
            <>
              {disponibilidad.disponible ? (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                    ✓ Horario disponible
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Horario no disponible</p>
                    {disponibilidad.alternativas.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm">Alternativas sugeridas:</p>
                        <ul className="text-sm space-y-1">
                          {disponibilidad.alternativas.map((alt, i) => (
                            <li key={i}>
                              <button
                                type="button"
                                className="underline hover:no-underline"
                                onClick={() => {
  const d = new Date(alt.inicio)
  setValue("fecha", toLocalDateInputValue(d))
  setValue("horaInicio", toLocalTimeInputValue(d))
}}
                              >
                                {new Date(alt.inicio).toLocaleString("es", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || (disponibilidad && !disponibilidad.disponible)}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear cita"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

