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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useMemo } from "react"
import type { PacienteCreateFormInput } from "@/lib/schema/paciente.schema"
import {
  esMovilPY,
  normalizarTelefono,
  normalizarEmail,
  validarTelefono,
  detectarCodigoPais,
  CODIGOS_PAIS,
} from "@/lib/schema/paciente.schema"

type PreferenciaContacto = "WHATSAPP" | "LLAMADA" | "EMAIL" | "SMS"

interface Step2ContactoProps {
  form: UseFormReturn<PacienteCreateFormInput>
}

export function Step2Contacto({ form }: Step2ContactoProps) {
  const telefono = form.watch("telefono") || ""
  const email = form.watch("email") || ""
  const codigoPais = form.watch("codigoPaisTelefono") || "+595"

  // Detectar código de país automáticamente cuando el usuario escribe
  useEffect(() => {
    if (telefono && telefono.trim()) {
      const detectedCode = detectarCodigoPais(telefono)
      if (detectedCode && detectedCode !== codigoPais) {
        form.setValue("codigoPaisTelefono", detectedCode, { shouldValidate: false })
      }
    }
  }, [telefono, codigoPais, form])

  // Derivados para ayudas de UI
  const telefonoNormalizado = useMemo(
    () => (telefono ? normalizarTelefono(telefono, codigoPais) : ""),
    [telefono, codigoPais]
  )
  const validacionTelefono = useMemo(
    () => (telefono ? validarTelefono(telefono, codigoPais) : { valido: true }),
    [telefono, codigoPais]
  )
  const telefonoValido = validacionTelefono.valido
  const movilDetectado = useMemo(
    () => (telefono && codigoPais === "+595" ? esMovilPY(telefono) : false),
    [telefono, codigoPais]
  )

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

  // Obtener placeholder según código de país
  const getPlaceholder = () => {
    if (codigoPais === "+595") {
      return "0992361378 o +595992361378"
    }
    return `${codigoPais}XXXXXXXXXX`
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Teléfono (requerido) con selector de código de país */}
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="telefono">Teléfono *</FormLabel>
              <div className="flex gap-2">
                {/* Selector de código de país */}
                <FormField
                  control={form.control}
                  name="codigoPaisTelefono"
                  render={({ field: codeField }) => (
                    <FormItem className="w-[140px]">
                      <FormControl>
                        <Select
                          value={codeField.value || "+595"}
                          onValueChange={(value) => {
                            codeField.onChange(value)
                            // Re-validar teléfono cuando cambia el código
                            if (telefono) {
                              form.trigger("telefono")
                            }
                          }}
                        >
                          <SelectTrigger id="codigoPaisTelefono" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CODIGOS_PAIS.map((item) => (
                              <SelectItem key={item.code} value={item.code}>
                                {item.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* Input de número */}
                <FormControl className="flex-1">
                  <Input
                    id="telefono"
                    {...field}
                    type="tel"
                    inputMode="tel"
                    placeholder={getPlaceholder()}
                    autoComplete="tel"
                    onBlur={(e) => {
                      // Solo hacer trim, no normalizar aquí
                      // La normalización se hará al enviar el formulario
                      const value = e.target.value.trim()
                      field.onChange(value)
                    }}
                    aria-invalid={!telefonoValido}
                  />
                </FormControl>
              </div>
              <FormDescription>
                {codigoPais === "+595"
                  ? `Formato: 09XXXXXXXX o +595XXXXXXXXX. ${movilDetectado ? "Se detectó móvil (WhatsApp/SMS habilitados)." : ""}`
                  : `Ingrese el número con código de país ${codigoPais}`}
              </FormDescription>
              {!telefonoValido && validacionTelefono.mensaje ? (
                <p className="text-xs text-destructive" role="alert">{validacionTelefono.mensaje}</p>
              ) : (
                <FormMessage />
              )}
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
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    if (value) {
                      field.onChange(normalizarEmail(value))
                    } else {
                      field.onChange("")
                    }
                  }}
                />
              </FormControl>
              <FormDescription>Opcional. Formato: paciente@ejemplo.com</FormDescription>
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
              {([
                { value: "WHATSAPP" as const, label: "WhatsApp", disabled: !(telefono && telefonoValido && movilDetectado) },
                { value: "LLAMADA" as const, label: "Llamada telefónica", disabled: !(telefono && telefonoValido) },
                { value: "EMAIL" as const, label: "Email", disabled: !(email && email.includes("@")) },
                { value: "SMS" as const, label: "SMS", disabled: !(telefono && telefonoValido && movilDetectado) },
              ] as const).map((item) => (
                <FormField
                  key={item.value}
                  control={form.control}
                  name="preferenciasContacto"
                  render={({ field }) => {
                    const checked = field.value?.includes(item.value)
                    return (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 opacity-100">
                        <FormControl>
                          <Checkbox
                            checked={checked}
                            disabled={item.disabled}
                            onCheckedChange={(checked) => {
                              const curr = new Set<PreferenciaContacto>(field.value ?? [])
                              if (checked) curr.add(item.value)
                              else curr.delete(item.value)
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
