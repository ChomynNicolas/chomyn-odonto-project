"use client"

import type { UseFormReturn } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect } from "react"
import { esMovilPY, PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step2ContactoProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step2Contacto({ form }: Step2ContactoProps) {
  const telefono = form.watch("telefono")
  const email = form.watch("email")

  // Auto-marcar preferencias según datos disponibles
  useEffect(() => {
    const preferencias = form.getValues("preferenciasContacto")
    const nuevasPreferencias = new Set(preferencias)

    if (telefono && telefono.length >= 10) {
      const esMovil = esMovilPY(telefono)
      if (esMovil) {
        nuevasPreferencias.add("WHATSAPP")
        nuevasPreferencias.add("SMS")
      }
      nuevasPreferencias.add("LLAMADA")
    }

    if (email && email.includes("@")) {
      nuevasPreferencias.add("EMAIL")
    }

    const arrayPreferencias = Array.from(nuevasPreferencias) as ("WHATSAPP" | "LLAMADA" | "EMAIL" | "SMS")[]
    if (arrayPreferencias.length > 0 && arrayPreferencias.length !== preferencias.length) {
      form.setValue("preferenciasContacto", arrayPreferencias)
      form.setValue(
        "preferenciasRecordatorio",
        arrayPreferencias.filter((p) => p !== "LLAMADA"),
      )
      form.setValue(
        "preferenciasCobranza",
        arrayPreferencias.filter((p) => p !== "LLAMADA"),
      )
    }
  }, [telefono, email, form])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono *</FormLabel>
              <FormControl>
                <Input {...field} type="tel" placeholder="+595 981 123456" autoComplete="tel" />
              </FormControl>
              <FormDescription>Incluya código de país (+595 para Paraguay)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="paciente@ejemplo.com" autoComplete="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="preferenciasContacto"
        render={() => (
          <FormItem>
            <div className="mb-4">
              <FormLabel>Preferencias de Contacto *</FormLabel>
              <FormDescription>Seleccione al menos un canal para recordatorios y notificaciones</FormDescription>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { value: "WHATSAPP", label: "WhatsApp" },
                { value: "LLAMADA", label: "Llamada telefónica" },
                { value: "EMAIL", label: "Email" },
                { value: "SMS", label: "SMS" },
              ].map((item) => (
                <FormField
                  key={item.value}
                  control={form.control}
                  name="preferenciasContacto"
                  render={({ field }) => {
                    return (
                      <FormItem key={item.value} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.value as any)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.value])
                                : field.onChange(field.value?.filter((value) => value !== item.value))
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.label}</FormLabel>
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
