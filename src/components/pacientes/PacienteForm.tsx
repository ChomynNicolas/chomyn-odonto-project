// src/components/pacientes/PacienteForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PacienteInput } from "./types";
import { pacienteSchema, generoEnum } from "./types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import PreferenciasContacto from "./PreferenciasContacto";
import AdjuntosDropzone from "./AdjuntosDropzone";
import UnsavedChangesPrompt from "@/components/ui/UnsavedChangesPrompt";
import { clearDraft, loadDraft, useAutosaveDraft } from "./useAutosaveDraft";

function Required({ children }: { children: React.ReactNode }) {
  return <span className="after:ml-0.5 after:text-destructive after:content-['*']">{children}</span>;
}

type Props = {
  defaultValues?: Partial<PacienteInput>;
  onSubmit: (data: PacienteInput) => void;
  submitLabel?: string;
};

const DRAFT_KEY = "paciente:draft:v1";

export default function PacienteForm({ defaultValues, onSubmit, submitLabel = "Guardar" }: Props) {
  const [submitting, setSubmitting] = React.useState(false);
  const [restored, setRestored] = React.useState(false);
  const [hasAnyChange, setHasAnyChange] = React.useState(false);

  // si hay borrador, ofrecer restaurar
  const draft = typeof window !== "undefined" ? loadDraft<Partial<PacienteInput>>(DRAFT_KEY) : null;

  const form = useForm<PacienteInput>({
    resolver: zodResolver(pacienteSchema),
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
      ...draft,          // prioridad a borrador
      ...defaultValues,  // y luego defaults explícitos si llega edición
    },
    mode: "onBlur",
  });

  // track “dirty” para protección
  React.useEffect(() => {
    const sub = form.watch(() => setHasAnyChange(true));
    return () => sub.unsubscribe();
  }, [form]);

  // autosave (debounce 800ms)
  useAutosaveDraft<PacienteInput>({
    key: DRAFT_KEY,
    value: form.getValues(),
    enabled: true,
    delay: 800,
  });

  const handleRestore = () => {
    if (!draft) return;
    form.reset({ ...form.getValues(), ...draft });
    setRestored(true);
  };

  const handleClearDraft = () => {
    clearDraft(DRAFT_KEY);
    setRestored(true);
  };

  const handleSave = async (values: PacienteInput) => {
  setSubmitting(true);
  try {
    const payload = {
      ...values,
      email: values.email ? values.email : undefined,  // ⬅️ clave
    };
    await onSubmit(payload);
    clearDraft(DRAFT_KEY);
    setHasAnyChange(false);
  } finally {
    setSubmitting(false);
  }
};

  const generoLabel: Record<(typeof generoEnum)["enum"], string> = {
    MASCULINO: "Masculino",
    FEMENINO: "Femenino",
    OTRO: "Otro",
    NO_DECLARA: "Prefiere no declarar",
  };

  return (
    <>
      <UnsavedChangesPrompt active={hasAnyChange} />

      {/* Banner de borrador */}
      {draft && !restored && (
        <div className="mb-4 flex items-start justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/[0.12] dark:text-brand-400">
          <div className="pr-4">
            Hay un borrador guardado automáticamente.
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearDraft}>Descartar</Button>
            <Button onClick={handleRestore} className="bg-brand-500 hover:bg-brand-600">Restaurar</Button>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Encabezado */}
          <header className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">Nuevo paciente</h2>
            <p className="text-sm text-muted-foreground">
              Completa los datos básicos y clínicos. Los campos con <span className="text-destructive">*</span> son obligatorios.
            </p>
          </header>

          {/* Identificación */}
          <section aria-labelledby="sec-identificacion" className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h3 id="sec-identificacion" className="mb-4 text-sm font-medium text-foreground">Identificación</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="nombreCompleto" render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Nombre completo</Required></FormLabel>
                  <FormControl><Input placeholder="Ej: Ana López" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="genero" render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Género</Required></FormLabel>
                  <FormControl>
                    <select
                      className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                    >
                      {generoEnum.options.map(g => (
                        <option key={g} value={g}>{generoLabel[g]}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="dni" render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>DNI/Cédula</Required></FormLabel>
                  <FormControl><Input inputMode="numeric" placeholder="Ej: 5123456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ruc" render={({ field }) => (
                <FormItem>
                  <FormLabel>RUC</FormLabel>
                  <FormControl><Input placeholder="Ej: 5123456-7" {...field} /></FormControl>
                  <FormDescription>Formato: 6–8 dígitos + guion + dígito verificador (ej: 5123456-7).</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem>
                  <FormLabel><Required>Teléfono</Required></FormLabel>
                  <FormControl><Input placeholder="+59599123456" inputMode="tel" {...field} /></FormControl>
                  <FormDescription>Incluye código de país si es posible (ej: +595...).</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                <FormLabel>Email (opcional)</FormLabel> {/* <- sin Required */}
                <FormControl>
                  <Input type="email" placeholder="correo@dominio.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              )} />

              <FormField control={form.control} name="domicilio" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel><Required>Domicilio</Required></FormLabel>
                  <FormControl><Input placeholder="Calle, número, ciudad" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="obraSocial" render={({ field }) => (
                <FormItem>
                  <FormLabel>Obra social / Seguro</FormLabel>
                  <FormControl><Input placeholder="Ej: IPS, Sanitas..." {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="responsablePago" render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable de pago</FormLabel>
                  <FormControl><Input placeholder="Si es menor, quién paga" {...field} /></FormControl>
                  <FormDescription>Dejar vacío si el paciente es el responsable.</FormDescription>
                </FormItem>
              )} />
            </div>
          </section>

          {/* Datos clínicos */}
          <section aria-labelledby="sec-clinicos" className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h3 id="sec-clinicos" className="mb-4 text-sm font-medium text-foreground">Datos clínicos</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField control={form.control} name="antecedentesMedicos" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Antecedentes médicos</FormLabel>
                  <FormControl><Textarea rows={3} placeholder="Breve resumen clínico relevante" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="alergias" render={({ field }) => (
                <FormItem>
                  <FormLabel>Alergias</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Ej: penicilina, látex..." {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="medicacion" render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicación</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Ej: anticoagulantes, antihipertensivos..." {...field} /></FormControl>
                </FormItem>
              )} />
            </div>
          </section>

          {/* Preferencias */}
          <section aria-labelledby="sec-preferencias" className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h3 id="sec-preferencias" className="mb-4 text-sm font-medium text-foreground">Preferencias de contacto</h3>
            <PreferenciasContacto
              value={form.watch("preferenciasContacto")}
              onChange={(pc) => form.setValue("preferenciasContacto", pc, { shouldDirty: true })}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Se utilizará para recordatorios de turno y notificaciones.
            </p>
          </section>

          {/* Adjuntos */}
          <section aria-labelledby="sec-adjuntos" className="rounded-lg border border-border bg-card p-4 sm:p-6">
            <h3 id="sec-adjuntos" className="mb-4 text-sm font-medium text-foreground">Adjuntos (digitalización)</h3>
            <AdjuntosDropzone
              files={form.watch("adjuntos") ?? []}
              onChange={(arr) => form.setValue("adjuntos", arr, { shouldDirty: true })}
            />
            <p className="mt-2 text-xs text-muted-foreground">Próximamente: Cloudinary/S3 con verificación y antivirus.</p>
          </section>

          {/* Acciones */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
            <Button type="submit" disabled={submitting} className="bg-brand-500 hover:bg-brand-600">
              {submitting ? "Guardando…" : submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
