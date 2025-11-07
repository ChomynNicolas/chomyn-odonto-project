"use client"

import type { UseFormReturn } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect, useMemo } from "react"
import type { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"
import {
  esMovilPY,
  normalizarTelefono,
  normalizarEmail,
  validarTelefonoPY,
} from "@/lib/schema/paciente.schema"

interface Step2ContactoProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step2Contacto({ form }: Step2ContactoProps) {
  const telefono = form.watch("telefono") || ""
  const email = form.watch("email") || ""

  // Derivados para ayudas de UI
  const telefonoNormalizado = useMemo(() => (telefono ? normalizarTelefono(telefono) : ""), [telefono])
  const telefonoValido = useMemo(() => (telefono ? validarTelefonoPY(telefono) : true), [telefono])
  const movilDetectado = useMemo(() => (telefono ? esMovilPY(telefono) : false), [telefono])

  // Auto-sincroniza preferencias según datos presentes
  useEffect(() => {
    const current = new Set(form.getValues("preferenciasContacto") ?? [])
    const next = new Set<string>()

    // Teléfono presente → Llamada siempre disponible
    if (telefono && telefonoNormalizado.length >= 10 && telefonoValido) {
      next.add("LLAMADA")
      if (movilDetectado) {
        next.add("WHATSAPP")
        next.add("SMS")
      }
    }

    // Email presente → EMAIL disponible
    if (email && email.includes("@")) {
      next.add("EMAIL")
    }

    const nextArray = Array.from(next) as ("WHATSAPP" | "LLAMADA" | "EMAIL" | "SMS")[]

    // Solo aplicar si cambia para evitar loops
    if (nextArray.sort().join("|") !== Array.from(current).sort().join("|")) {
      form.setValue("preferenciasContacto", nextArray, { shouldDirty: true, shouldValidate: true })
      // Derivar recordatorio/cobranza (sin llamada)
      const channelsNoCall = nextArray.filter((c) => c !== "LLAMADA")
      form.setValue("preferenciasRecordatorio", channelsNoCall, { shouldDirty: true, shouldValidate: true })
      form.setValue("preferenciasCobranza", channelsNoCall, { shouldDirty: true, shouldValidate: true })
    }
  }, [telefono, email, movilDetectado, telefonoNormalizado, telefonoValido, form])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Teléfono (requerido) */}
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="telefono">Teléfono *</FormLabel>
              <FormControl>
                <Input
                  id="telefono"
                  {...field}
                  type="tel"
                  inputMode="tel"
                  placeholder="+595 981 123456"
                  autoComplete="tel"
                  onBlur={(e) => {
                    const norm = normalizarTelefono(e.target.value)
                    field.onChange(norm)
                  }}
                  aria-invalid={!telefonoValido}
                />
              </FormControl>
              <FormDescription>
                Incluya código de país (+595). {movilDetectado ? "Se detectó móvil (WhatsApp/SMS habilitados)." : ""}
              </FormDescription>
              {!telefonoValido ? <p className="text-xs text-red-600">Formato inválido (+595XXXXXXXXX).</p> : <FormMessage />}
            </FormItem>
          )}
        />

        {/* Email (opcional) */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  {...field}
                  type="email"
                  placeholder="paciente@ejemplo.com"
                  autoComplete="email"
                  onBlur={(e) => field.onChange(normalizarEmail(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Preferencias de contacto (requerido) */}
      <FormField
        control={form.control}
        name="preferenciasContacto"
        render={() => (
          <FormItem id="preferenciasContacto">
            <div className="mb-4">
              <FormLabel>Preferencias de Contacto *</FormLabel>
              <FormDescription>Seleccione al menos un canal para recordatorios y notificaciones</FormDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: "WHATSAPP", label: "WhatsApp", disabled: !(telefono && telefonoValido && movilDetectado) },
                { value: "LLAMADA", label: "Llamada telefónica", disabled: !(telefono && telefonoValido) },
                { value: "EMAIL", label: "Email", disabled: !(email && email.includes("@")) },
                { value: "SMS", label: "SMS", disabled: !(telefono && telefonoValido && movilDetectado) },
              ].map((item) => (
                <FormField
                  key={item.value}
                  control={form.control}
                  name="preferenciasContacto"
                  render={({ field }) => {
                    const checked = field.value?.includes(item.value as any)
                    return (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 opacity-100">
                        <FormControl>
                          <Checkbox
                            checked={checked}
                            disabled={item.disabled}
                            onCheckedChange={(checked) => {
                              const curr = new Set(field.value ?? [])
                              if (checked) curr.add(item.value as any)
                              else curr.delete(item.value as any)
                              const next = Array.from(curr)
                              field.onChange(next)

                              // Mantener sincronía derivada (sin llamada) para recordatorio/cobranza
                              const noCall = next.filter((c) => c !== "LLAMADA")
                              form.setValue("preferenciasRecordatorio", noCall, { shouldDirty: true, shouldValidate: true })
                              form.setValue("preferenciasCobranza", noCall, { shouldDirty: true, shouldValidate: true })
                            }}
                          />
                        </FormControl>
                        <FormLabel className={`font-normal ${item.disabled ? "text-muted-foreground" : ""}`}>
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
            </div>

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
