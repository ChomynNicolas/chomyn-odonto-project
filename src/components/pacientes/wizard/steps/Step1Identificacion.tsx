"use client"

import type { UseFormReturn } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
import { calcularEdad } from "@/lib/kpis/edad-grupos"
import { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step1IdentificacionProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step1Identificacion({ form }: Step1IdentificacionProps) {
  const fechaNacimiento = form.watch("fechaNacimiento")

  const edad = useMemo(() => {
    if (!fechaNacimiento) return null
    return calcularEdad(new Date(fechaNacimiento))
  }, [fechaNacimiento])

  const esPediatrico = edad !== null && edad < 18

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="nombreCompleto"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Nombre Completo *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: María Gabriela Benítez Acosta" autoComplete="name" />
              </FormControl>
              <FormDescription>Ingrese nombre y apellidos completos</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="genero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Género *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="X">Prefiere no declarar</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fechaNacimiento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Nacimiento *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    field.onChange(date)
                  }}
                  max={new Date().toISOString().split("T")[0]}
                />
              </FormControl>
              {edad !== null && (
                <FormDescription className="flex items-center gap-2">
                  {edad} años
                  {esPediatrico && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                    >
                      Paciente pediátrico
                    </Badge>
                  )}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipoDocumento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Documento *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CI">CI (Cédula de Identidad)</SelectItem>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                  <SelectItem value="RUC">RUC</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="numeroDocumento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Documento *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 4.567.890" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Dirección *</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Calle, número, barrio" rows={2} className="resize-none" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: Asunción" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pais"
          render={({ field }) => (
            <FormItem>
              <FormLabel>País *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PY">Paraguay</SelectItem>
                  <SelectItem value="AR">Argentina</SelectItem>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="UY">Uruguay</SelectItem>
                  <SelectItem value="BO">Bolivia</SelectItem>
                  <SelectItem value="CL">Chile</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
