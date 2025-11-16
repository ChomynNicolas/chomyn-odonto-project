"use client"

import * as React from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  PacienteCreateSchema,
  GeneroEnum,
  TipoDocumentoEnum,
} from "@/lib/schema/paciente"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import PreferenciasContacto from "./PreferenciasContacto"
import AdjuntosDropzone from "./AdjuntosDropzone"
import { Info } from "lucide-react"
import ResponsablePagoSelector, { type ResponsablePagoValue } from "./ResponsablePagoSelector"

type Intent = "open" | "schedule"


function Required({ children }: { children: React.ReactNode }) {
  return <span className="after:ml-0.5 after:text-destructive after:content-['*']">{children}</span>
}

// Infer form type directly from schema to avoid type resolution issues
// Use z.output for form type (after transforms) since zodResolver applies transforms
type FormData = z.output<typeof PacienteCreateSchema>

type Props = {
  defaultValues?: Partial<FormData>
  /** onSubmit recibe el intent elegido por la botonera sticky */
  onSubmit: (data: FormData, intent: Intent) => void | Promise<void>
  /** deshabilita mientras se envia al servidor */
  busy?: boolean
}

export default function PacienteForm({ defaultValues, onSubmit, busy = false }: Props) {
  const [intent, setIntent] = React.useState<Intent>("open")

  // Explicitly type the form to avoid TypeScript inference issues
  // zodResolver applies transforms, so we use the output type
  const form = useForm<FormData>({
    resolver: zodResolver(PacienteCreateSchema) as Resolver<FormData>,
    defaultValues: {
      nombreCompleto: "",
      genero: "NO_ESPECIFICADO",
      tipoDocumento: "CI",
      fechaNacimiento: undefined,
      dni: "",
      ruc: undefined,
      telefono: "",
      email: undefined,
      domicilio: undefined,
      obraSocial: undefined,
      antecedentesMedicos: undefined,
      alergias: undefined,
      medicacion: undefined,
      preferenciasContacto: { whatsapp: true, llamada: false, email: false, sms: false },
      adjuntos: [],
      ...defaultValues,
    },
    mode: "onBlur",
  })

  // Detectar si hay adjuntos subiendo desde el estado de los adjuntos
  const adjuntos = form.watch("adjuntos") ?? []
  const uploadingAdjuntos = adjuntos.some((a) => a.estado === "subiendo")
  const isSubmitting = form.formState.isSubmitting || busy || uploadingAdjuntos

  const todayYMD = React.useMemo(() => new Date().toISOString().slice(0, 10), [])

  /** ── Accesibilidad: foco/scroll al primer error tras submit inválido ───────── */
  const scrollToFirstError = React.useCallback(() => {
    const entries = Object.entries(form.formState.errors)
    if (!entries.length) return
    // toma la primera key de error (campo simple)
    const [firstName] = entries[0]
    const el = document.querySelector<HTMLElement>(`[name="${firstName}"]`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      // foco al campo
      ;(el as HTMLInputElement | HTMLTextAreaElement).focus()
    }
  }, [form.formState.errors])

  const onInvalid = React.useCallback(() => {
    scrollToFirstError()
  }, [scrollToFirstError])

  /** ── Contadores de error por sección para mostrar en el trigger ───────────── */
  const errors = form.formState.errors
  const errorKeys = Object.keys(errors)
  const countId = ["nombreCompleto", "genero", "fechaNacimiento", "tipoDocumento", "dni", "ruc", "telefono", "email", "domicilio", "obraSocial"]
    .filter((k) => errorKeys.includes(k))
    .length
  const countClin = ["antecedentesMedicos", "alergias", "medicacion"].filter((k) => errorKeys.includes(k)).length

  /** ── Guardar con intent ───────────────────────────────────────────────────── */
  const handleSubmit = async (values: FormData) => {
    // zodResolver already applied transforms, so values are already in the correct format
    await onSubmit(values, intent)
  }

  type GeneroType = z.infer<typeof GeneroEnum>
  const generoOptions: GeneroType[] = ["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]
  const generoLabel: Record<string, string> = {
    MASCULINO: "Masculino",
    FEMENINO: "Femenino",
    OTRO: "Otro",
    NO_ESPECIFICADO: "No especificado / Prefiere no declarar",
  }

  type TipoDocumentoType = z.infer<typeof TipoDocumentoEnum>
  const tipoDocumentoOptions: TipoDocumentoType[] = ["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]

  /** ── UI ───────────────────────────────────────────────────────────────────── */
  return (
    <Form {...form}>
      {/* padding inferior para que no tape el footer sticky en mobile */}
      <form onSubmit={form.handleSubmit(handleSubmit, onInvalid)} className="space-y-6 pb-28">
        {/* Encabezado */}
        <header className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">Nuevo paciente</h2>
          <p className="text-sm text-muted-foreground">
            Completa los datos básicos y clínicos. Los campos con <span className="text-destructive">*</span> son
            obligatorios.
          </p>
        </header>

        <TooltipProvider delayDuration={200}>
          <Accordion type="multiple" defaultValue={["identificacion", "clinicos"]} className="space-y-3">
            {/* ───────────────────────── Identificación ───────────────────────── */}
            <AccordionItem value="identificacion" className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium">
                <div className="flex w-full items-center justify-between">
                  <span>Identificación</span>
                  {countId > 0 && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {countId} error{countId > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t px-4 py-4 sm:px-6">
                <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2" disabled={isSubmitting}>
                  <FormField
                    control={form.control}
                    name="nombreCompleto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Required>Nombre completo</Required>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ana López" aria-invalid={!!errors.nombreCompleto} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="genero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Required>Género</Required>
                        </FormLabel>
                        <FormControl>
                          <select
                            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            aria-invalid={!!errors.genero}
                            value={field.value ?? "NO_ESPECIFICADO"}
                            onChange={(e) => field.onChange(e.target.value as GeneroType)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          >
                            {generoOptions.map((g) => (
                              <option key={g} value={g}>
                                {generoLabel[g] ?? g}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaNacimiento"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Fecha de nacimiento</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground">
                                <Info className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Ayuda</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Usamos la fecha para edad y alertas clínicas (p. ej., pediátrico).
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input
                            type="date"
                            max={todayYMD}
                            aria-invalid={!!errors.fechaNacimiento}
                            value={field.value instanceof Date ? field.value.toISOString().slice(0, 10) : field.value ? String(field.value).slice(0, 10) : ""}
                            onChange={(e) => {
                              const dateValue = e.target.value
                              field.onChange(dateValue ? new Date(dateValue) : undefined)
                            }}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipoDocumento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Required>Tipo de documento</Required>
                        </FormLabel>
                        <FormControl>
                          <select
                            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            aria-invalid={!!errors.tipoDocumento}
                            value={field.value ?? "CI"}
                            onChange={(e) => field.onChange(e.target.value as TipoDocumentoType)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          >
                            {tipoDocumentoOptions.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dni"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Required>DNI/Cédula</Required>
                        </FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="Ej: 5123456"
                            aria-invalid={!!errors.dni}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ruc"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>RUC</FormLabel>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground">
                                <Info className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Ayuda</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              Formato sugerido: 6–8 dígitos + guion + dígito verificador.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <FormControl>
                          <Input placeholder="Ej: 5123456-7" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} onBlur={field.onBlur} ref={field.ref} />
                        </FormControl>
                        <FormDescription id="hint-ruc">Se usa para facturación.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <Required>Teléfono</Required>
                        </FormLabel>
                        <FormControl>
                          <Input
                            inputMode="tel"
                            placeholder="+59599123456"
                            aria-invalid={!!errors.telefono}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>Incluye código de país si es posible (ej: +595...).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="correo@dominio.com"
                            aria-invalid={!!errors.email}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domicilio"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          <Required>Domicilio</Required>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Calle, número, ciudad"
                            aria-invalid={!!errors.domicilio}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="obraSocial"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obra social / Seguro</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: IPS, Sanitas..." value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} onBlur={field.onBlur} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>
              </AccordionContent>
            </AccordionItem>

            {/* Responsable de pago */}
            <section aria-labelledby="sec-responsable" className="rounded-lg border border-border bg-card p-4 sm:p-6">
              <ResponsablePagoSelector
                value={form.watch("responsablePago") as ResponsablePagoValue}
                onChange={(v) => form.setValue("responsablePago", v ?? undefined, { shouldDirty: true })}
                descriptionId="rp-help"
                disabled={isSubmitting}
              />
              <p id="rp-help" className="mt-2 text-xs text-muted-foreground">
                Buscá por documento o nombre. Si no existe, podés crear el responsable con &quot;Crear responsable rápido&quot;.
              </p>
            </section>


            {/* ───────────────────────── Datos clínicos ───────────────────────── */}
            <AccordionItem value="clinicos" className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium">
                <div className="flex w-full items-center justify-between">
                  <span>Datos clínicos</span>
                  {countClin > 0 && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                      {countClin} error{countClin > 1 ? "es" : ""}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t px-4 py-4 sm:px-6">
                <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-2" disabled={isSubmitting}>
                  <FormField
                    control={form.control}
                    name="antecedentesMedicos"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Antecedentes médicos</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Breve resumen clínico relevante"
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || undefined)}
                            onBlur={field.onBlur}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alergias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alergias</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Ej: penicilina, látex..." value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} onBlur={field.onBlur} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medicacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicación</FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Ej: anticoagulantes, antihipertensivos..." value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} onBlur={field.onBlur} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>
              </AccordionContent>
            </AccordionItem>

            {/* ───────────────────────── Preferencias ─────────────────────────── */}
            <AccordionItem value="preferencias" className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium">Preferencias de contacto</AccordionTrigger>
              <AccordionContent className="border-t px-4 py-4 sm:px-6">
                <fieldset disabled={isSubmitting}>
                  <PreferenciasContacto
                    value={form.watch("preferenciasContacto") ?? { whatsapp: true, llamada: false, email: false, sms: false }}
                    onChange={(pc) => form.setValue("preferenciasContacto", pc, { shouldDirty: true })}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Se utilizará para recordatorios de turno y notificaciones.</p>
                </fieldset>
              </AccordionContent>
            </AccordionItem>

            {/* ───────────────────────── Adjuntos ─────────────────────────────── */}
            <AccordionItem value="adjuntos" className="rounded-lg border bg-card">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium">Adjuntos (digitalización)</AccordionTrigger>
              <AccordionContent className="border-t px-4 py-4 sm:px-6">
                <fieldset disabled={isSubmitting}>
                  <AdjuntosDropzone
                    adjuntos={form.watch("adjuntos") ?? []}
                    onChangeAdjuntos={(adjuntos, files) => {
                      form.setValue("adjuntos", adjuntos, { shouldDirty: true })
                      // El Map de files se puede usar para subir archivos si es necesario
                      // Por ahora solo actualizamos los adjuntos en el form
                      void files // Marcar como usado para evitar error de lint
                    }}
                    disabled={isSubmitting}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Próximamente: Cloudinary/S3 con verificación y antivirus.</p>
                </fieldset>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TooltipProvider>

        {/* ───────────────────────── Footer sticky ───────────────────────────── */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.25)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => history.back()}
              className="sm:ml-auto"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              onClick={() => setIntent("schedule")}
              disabled={isSubmitting}
              variant="secondary"
              className="order-3 sm:order-none"
            >
              {isSubmitting && intent === "schedule" ? "Guardando…" : "Guardar y agendar cita"}
            </Button>

            <Button
              type="submit"
              onClick={() => setIntent("open")}
              disabled={isSubmitting}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {isSubmitting && intent === "open" ? "Guardando…" : "Guardar y abrir ficha"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
