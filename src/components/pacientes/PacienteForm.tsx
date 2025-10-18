"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PacienteInput } from "./types";
import { pacienteSchema, generoEnum } from "./types";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";           // si no lo tienes, usa <input className="..."/>
import { Textarea } from "@/components/ui/textarea";     // idem
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // idem
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // opcional
import { Button } from "@/components/ui/button";

import PreferenciasContacto from "./PreferenciasContacto";
import AdjuntosDropzone from "./AdjuntosDropzone";

// pequeño helper de a11y: asterisco en campos requeridos
function Required({ children }: { children: React.ReactNode }) {
  return (
    <span className="after:ml-0.5 after:text-destructive after:content-['*']">
      {children}
    </span>
  );
}

type Props = {
  defaultValues?: Partial<PacienteInput>;
  onSubmit: (data: PacienteInput) => void;
  submitLabel?: string;
};

export default function PacienteForm({ defaultValues, onSubmit, submitLabel = "Guardar" }: Props) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<PacienteInput>({
    resolver: zodResolver(pacienteSchema) as any,
    defaultValues: {
      nombreCompleto: "",
      genero: "NO_DECLARA",
      dni: "",
      ruc: "",
      telefono: "",
      email: "",
      domicilio: "",
      obraSocial: "",
      antecedentesMedicos: "",
      alergias: "",
      medicacion: "",
      responsablePago: "",

      preferenciasContacto: { whatsapp: true, llamada: false, email: false, sms: false },
      adjuntos: [],
      ...defaultValues,
    },
    mode: "onBlur",
  });

  const handleSave = async (values: PacienteInput) => {
    setSubmitting(true);
    try {
      onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        {/* Encabezado */}
        <header className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-foreground">Nuevo paciente</h2>
          <p className="text-sm text-muted-foreground">
            Completa los datos básicos del paciente. Los campos marcados con <span className="text-destructive">*</span> son obligatorios.
          </p>
        </header>

        {/* Identificación */}
        <section
          aria-labelledby="sec-identificacion"
          className="rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <h3 id="sec-identificacion" className="mb-4 text-sm font-medium text-foreground">
            Identificación
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="nombreCompleto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Nombre completo</Required></FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ana López" {...field} />
                    {/* <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" {...field}/> */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Género: Select o RadioGroup (elige uno) */}
            <FormField
              control={form.control}
              name="genero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Género</Required></FormLabel>

                  {/* Opción A: Select */}
                  <Select
                    onValueChange={(v) => field.onChange(v)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {generoEnum.options.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Opción B: RadioGroup
                  <FormControl>
                    <RadioGroup
                      className="grid grid-cols-2 gap-2"
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      {generoEnum.options.map((g) => (
                        <div key={g} className="flex items-center gap-2 rounded-md border border-border p-2">
                          <RadioGroupItem id={`gen-${g}`} value={g} />
                          <label htmlFor={`gen-${g}`} className="text-sm">{g}</label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  */}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>DNI/Cédula</Required></FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="Ej: 5123456" {...field} />
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
                  <FormLabel>RUC</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 5123456-7" {...field} />
                  </FormControl>
                  <FormDescription>Opcional — si factura con RUC.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Teléfono</Required></FormLabel>
                  <FormControl>
                    <Input placeholder="+5959..." inputMode="tel" {...field} />
                  </FormControl>
                  <FormDescription>Incluye código de país. Ej: +595991123456</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Email</Required></FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@dominio.com" {...field} />
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
                  <FormLabel><Required>Domicilio</Required></FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, ciudad" {...field} />
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
                    <Input placeholder="Ej: IPS, Sanitas..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsablePago"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable de pago</FormLabel>
                  <FormControl>
                    <Input placeholder="Si es menor, quién paga" {...field} />
                  </FormControl>
                  <FormDescription>Dejar vacío si el paciente es el responsable.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="antecedentesMedicos"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Antecedentes médicos</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Breve resumen clínico relevante" {...field} />
                  </FormControl>
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
                    <Textarea rows={2} placeholder="Ej: penicilina, látex..." {...field} />
                  </FormControl>
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
                    <Textarea rows={2} placeholder="Ej: anticoagulantes, antihipertensivos..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Preferencias de contacto */}
        <section
          aria-labelledby="sec-preferencias"
          className="rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <h3 id="sec-preferencias" className="mb-4 text-sm font-medium text-foreground">
            Preferencias de contacto
          </h3>
          <PreferenciasContacto
            value={form.watch("preferenciasContacto")}
            onChange={(pc) => form.setValue("preferenciasContacto", pc, { shouldDirty: true })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Se utilizará para recordatorios de turno y novedades.
          </p>
        </section>

        {/* Adjuntos */}
        <section
          aria-labelledby="sec-adjuntos"
          className="rounded-lg border border-border bg-card p-4 sm:p-6"
        >
          <h3 id="sec-adjuntos" className="mb-4 text-sm font-medium text-foreground">
            Adjuntos (digitalización)
          </h3>
          <AdjuntosDropzone
            files={form.watch("adjuntos") ?? []}
            onChange={(arr) => form.setValue("adjuntos", arr, { shouldDirty: true })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Próximamente: integración con Cloudinary/S3 (ahora mock).
          </p>
        </section>

        {/* Acciones */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
