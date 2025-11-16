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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
import { calcularEdad } from "@/lib/kpis/edad-grupos"
import type { PacienteCreateFormInput } from "@/lib/schema/paciente.schema"
import { validarDocumento } from "@/lib/schema/paciente.schema"
import { CiudadAutocomplete } from "../CiudadAutocomplete"

interface Step1IdentificacionProps {
  form: UseFormReturn<PacienteCreateFormInput>
}

export function Step1Identificacion({ form }: Step1IdentificacionProps) {
  const fechaNacimiento = form.watch("fechaNacimiento")
  const tipoDocumento = form.watch("tipoDocumento")
  const numeroDocumento = form.watch("numeroDocumento")
  const pais = form.watch("pais")

  const edad = useMemo(() => {
    if (!fechaNacimiento) return null
    return calcularEdad(new Date(fechaNacimiento))
  }, [fechaNacimiento])

  const esPediatrico = edad !== null && edad < 18

  // Validación ligera de documento (no sustituye Zod; ayuda de UI)
  const docValid = useMemo(() => {
    if (!numeroDocumento || !tipoDocumento) return true
    return validarDocumento(numeroDocumento, tipoDocumento)
  }, [numeroDocumento, tipoDocumento])

  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], [])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Nombre completo */}
        <FormField
          control={form.control}
          name="nombreCompleto"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel htmlFor="nombreCompleto">Nombre Completo *</FormLabel>
              <FormControl>
                <Input
                  id="nombreCompleto"
                  {...field}
                  placeholder="Ej: María Gabriela Benítez Acosta"
                  autoComplete="name"
                  autoCapitalize="words"
                  onBlur={(e) => field.onChange(e.target.value.trim())}
                />
              </FormControl>
              <FormDescription>Ingrese nombre y apellidos completos</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Género */}
        <FormField
          control={form.control}
          name="genero"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="genero">Género *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id="genero">
                    <SelectValue placeholder="Seleccione el género" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                  <SelectItem value="X">Prefiere no declarar</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>Seleccione una opción válida</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fecha de nacimiento */}
        <FormField
          control={form.control}
          name="fechaNacimiento"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="fechaNacimiento">Fecha de Nacimiento *</FormLabel>
              <FormControl>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value + "T00:00:00") : undefined
                    field.onChange(d)
                  }}
                  max={todayISO}
                  inputMode="none"
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

        {/* Tipo de documento */}
        <FormField
          control={form.control}
          name="tipoDocumento"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="tipoDocumento">Tipo de Documento *</FormLabel>
              <Select
                onValueChange={(v) => {
                  field.onChange(v)
                  // si cambia el tipo, disparamos validación ligera por UX
                  const num = form.getValues("numeroDocumento")
                  if (num) form.trigger("numeroDocumento")
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger id="tipoDocumento">
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

        {/* Número de documento */}
        <FormField
          control={form.control}
          name="numeroDocumento"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="numeroDocumento">Número de Documento *</FormLabel>
              <FormControl>
                <Input
                  id="numeroDocumento"
                  {...field}
                  placeholder="Ej: 4.567.890"
                  autoComplete="off"
                  onBlur={(e) => field.onChange(e.target.value.trim())}
                  aria-invalid={!docValid}
                />
              </FormControl>
              {!docValid ? (
                <p className="text-xs text-red-600">Formato inválido para {tipoDocumento}.</p>
              ) : (
                <FormMessage />
              )}
            </FormItem>
          )}
        />

        {/* RUC (opcional, visible si tipoDocumento = RUC) */}
        <FormField
          control={form.control}
          name="ruc"
          render={({ field }) => {
            const show = tipoDocumento === "RUC"
            return (
              <FormItem style={{ display: show ? undefined : "none" }}>
                <FormLabel htmlFor="ruc">RUC</FormLabel>
                <FormControl>
                  <Input
                    id="ruc"
                    {...field}
                    placeholder="Ej: 80012345-6"
                    autoComplete="off"
                    onBlur={(e) => field.onChange(e.target.value.trim())}
                  />
                </FormControl>
                <FormDescription>Si corresponde, complete el RUC del paciente.</FormDescription>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        {/* País de emisión del documento */}
        <FormField
          control={form.control}
          name="paisEmision"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="paisEmision">País de emisión *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id="paisEmision">
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

        {/* Dirección */}
        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel htmlFor="direccion">Dirección *</FormLabel>
              <FormControl>
                <Textarea
                  id="direccion"
                  {...field}
                  placeholder="Calle, número, barrio"
                  rows={2}
                  className="resize-none"
                  onBlur={(e) => field.onChange(e.target.value.trim())}
                  autoComplete="street-address"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ciudad */}
        <FormField
          control={form.control}
          name="ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="ciudad">Ciudad *</FormLabel>
              <FormControl>
                <CiudadAutocomplete
                  id="ciudad"
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  onBlur={field.onBlur}
                  pais={pais}
                  placeholder={
                    pais === "PY"
                      ? "Escribe tu ciudad y elige una sugerencia (si existe)"
                      : "Escribe el nombre de tu ciudad"
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* País (residencia) */}
        <FormField
          control={form.control}
          name="pais"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="pais">País *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger id="pais">
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
