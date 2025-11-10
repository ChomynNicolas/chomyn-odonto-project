"use client"

import type { UseFormReturn } from "react-hook-form"
import { useEffect, useMemo, useState } from "react"
import { useFieldArray } from "react-hook-form"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Pill, FileText, StickyNote, Activity, X, Plus } from "lucide-react"
import type { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

// ======= Catálogos rápidos (offline, opcional) =======
const COMMON_ALLERGENS = [
  "Penicilina",
  "Amoxicilina",
  "Aspirina",
  "Ibuprofeno",
  "Látex",
  "Anestesia local",
  "Clindamicina",
  "Cefalexina",
  "Paracetamol",
  "Yodo",
] as const

const COMMON_MEDICATIONS = [
  "Aspirina 100 mg",
  "Losartán 50 mg",
  "Enalapril 10 mg",
  "Metformina 850 mg",
  "Atorvastatina 20 mg",
  "Omeprazol 20 mg",
  "Levotiroxina 100 µg",
  "Amoxicilina 500 mg",
] as const

interface Step3ClinicosProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step3Clinicos({ form }: Step3ClinicosProps) {
  // ====== useFieldArray: alergias
  const {
    fields: allergyFields,
    append: appendAllergy,
    remove: removeAllergy,
    update: updateAllergy,
  } = useFieldArray({ control: form.control, name: "alergias" })

  // ====== useFieldArray: medicación
  const {
    fields: medFields,
    append: appendMed,
    remove: removeMed,
    update: updateMed,
  } = useFieldArray({ control: form.control, name: "medicacion" })

  // ====== VITALS: activar y calcular BMI dentro del form
  const [vitalsEnabled, setVitalsEnabled] = useState<boolean>(false)
  const vHeight = form.watch("vitals?.heightCm")
  const vWeight = form.watch("vitals?.weightKg")

  useEffect(() => {
    if (!vitalsEnabled) return
    const h = (vHeight ?? 0) / 100
    const w = vWeight ?? 0
    const bmi = h > 0 && w > 0 ? Number((w / (h * h)).toFixed(1)) : undefined
    form.setValue("vitals.bmi", bmi, { shouldDirty: false, shouldValidate: false })
  }, [vitalsEnabled, vHeight, vWeight, form])

  // Inicializa measuredAt al activar
  useEffect(() => {
    if (vitalsEnabled && !form.getValues("vitals?.measuredAt")) {
      form.setValue("vitals", { measuredAt: new Date().toISOString() }, { shouldDirty: true })
    }
  }, [vitalsEnabled, form])

  const alergiasCount = allergyFields.length
  const medicacionCount = medFields.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Datos Clínicos</h2>
        <p className="text-muted-foreground mt-1">
          Información médica relevante del paciente (opcional pero recomendado)
        </p>
      </div>

      {/* ======= Alergias ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Alergias
          </CardTitle>
          <CardDescription>
            Agrega desde catálogo rápido o escribe manualmente. Por defecto la severidad es <strong>MODERATE</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chips rápidos */}
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  appendAllergy({ label: tag, severity: "MODERATE", isActive: true })
                }
              >
                {tag}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => appendAllergy({ label: "", severity: "MODERATE", isActive: true })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar alergia
            </Button>
          </div>

          {/* Lista editable */}
          <div className="space-y-3">
            {allergyFields.map((field, idx) => (
              <div key={field.id} className="grid gap-2 md:grid-cols-12 items-end">
                <div className="md:col-span-5">
                  <FormLabel>Alérgeno</FormLabel>
                  <Input
                    placeholder="Ej: Penicilina"
                    value={form.watch(`alergias.${idx}.label`) ?? ""}
                    onChange={(e) => form.setValue(`alergias.${idx}.label`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-3">
                  <FormLabel>Severidad</FormLabel>
                  <Select
                    value={form.watch(`alergias.${idx}.severity`) ?? "MODERATE"}
                    onValueChange={(v) => updateAllergy(idx, { ...field, severity: v as any })}
                  >
                    <SelectTrigger><SelectValue placeholder="Severidad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MILD">MILD</SelectItem>
                      <SelectItem value="MODERATE">MODERATE</SelectItem>
                      <SelectItem value="SEVERE">SEVERE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <FormLabel>Reacción</FormLabel>
                  <Input
                    placeholder="Ej: urticaria, anafilaxia…"
                    value={form.watch(`alergias.${idx}.reaction`) ?? ""}
                    onChange={(e) => form.setValue(`alergias.${idx}.reaction`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => removeAllergy(idx)} aria-label="Eliminar">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">{alergiasCount} alergia(s)</div>
          </div>
        </CardContent>
      </Card>

      {/* ======= Medicación ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="h-5 w-5 text-primary" />
            Medicación Actual
          </CardTitle>
          <CardDescription>Agrega desde catálogo rápido o manualmente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {COMMON_MEDICATIONS.map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => appendMed({ label: tag, isActive: true })}
              >
                {tag}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => appendMed({ label: "", isActive: true })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar medicación
            </Button>
          </div>

          <div className="space-y-3">
            {medFields.map((field, idx) => (
              <div key={field.id} className="grid gap-2 md:grid-cols-12 items-end">
                <div className="md:col-span-4">
                  <FormLabel>Medicamento</FormLabel>
                  <Input
                    placeholder="Ej: Losartán 50 mg"
                    value={form.watch(`medicacion.${idx}.label`) ?? ""}
                    onChange={(e) => form.setValue(`medicacion.${idx}.label`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormLabel>Dosis</FormLabel>
                  <Input
                    placeholder="Ej: 50 mg"
                    value={form.watch(`medicacion.${idx}.dose`) ?? ""}
                    onChange={(e) => form.setValue(`medicacion.${idx}.dose`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-3">
                  <FormLabel>Frecuencia</FormLabel>
                  <Input
                    placeholder="Ej: 1 vez/día"
                    value={form.watch(`medicacion.${idx}.freq`) ?? ""}
                    onChange={(e) => form.setValue(`medicacion.${idx}.freq`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormLabel>Vía</FormLabel>
                  <Input
                    placeholder="Ej: VO"
                    value={form.watch(`medicacion.${idx}.route`) ?? ""}
                    onChange={(e) => form.setValue(`medicacion.${idx}.route`, e.target.value, { shouldDirty: true })}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => removeMed(idx)} aria-label="Eliminar">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground">{medicacionCount} medicación(es)</div>
          </div>
        </CardContent>
      </Card>

      {/* ======= Antecedentes ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Antecedentes Médicos
          </CardTitle>
          <CardDescription>Crónicos, cirugías previas, hospitalizaciones, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="antecedentes"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="antecedentes">Antecedentes médicos</FormLabel>
                <FormControl>
                  <Textarea id="antecedentes" className="min-h-[120px] resize-none" maxLength={1000} {...field} />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/1000 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* ======= Observaciones ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StickyNote className="h-5 w-5 text-primary" />
            Observaciones
          </CardTitle>
          <CardDescription>Notas adicionales sobre el paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="observaciones">Observaciones generales</FormLabel>
                <FormControl>
                  <Textarea id="observaciones" className="min-h-[100px] resize-none" maxLength={500} {...field} />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* ======= Signos vitales ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Vitales iniciales (opcional)
          </CardTitle>
          <CardDescription>Si los habilitas, se guardan en la primera consulta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <FormLabel>Registrar vitales</FormLabel>
              <FormDescription>Altura, peso, IMC, PA y FC</FormDescription>
            </div>
            <Button
              type="button"
              variant={vitalsEnabled ? "secondary" : "outline"}
              onClick={() => setVitalsEnabled((v) => !v)}
            >
              {vitalsEnabled ? "Desactivar" : "Activar"}
            </Button>
          </div>

          {vitalsEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <FormLabel htmlFor="heightCm">Altura (cm)</FormLabel>
                  <Input
                    id="heightCm"
                    type="number"
                    min={50}
                    max={250}
                    step="1"
                    value={form.watch("vitals.heightCm") ?? ""}
                    onChange={(e) =>
                      form.setValue("vitals.heightCm", e.target.value ? Number(e.target.value) : undefined, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="weightKg">Peso (kg)</FormLabel>
                  <Input
                    id="weightKg"
                    type="number"
                    min={10}
                    max={300}
                    step="0.1"
                    value={form.watch("vitals.weightKg") ?? ""}
                    onChange={(e) =>
                      form.setValue("vitals.weightKg", e.target.value ? Number(e.target.value) : undefined, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>IMC</FormLabel>
                  <Input readOnly value={form.watch("vitals.bmi") ?? ""} placeholder="—" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <FormLabel htmlFor="bpSyst">PA Sistólica (mmHg)</FormLabel>
                  <Input
                    id="bpSyst"
                    type="number"
                    min={60}
                    max={250}
                    step="1"
                    value={form.watch("vitals.bpSyst") ?? ""}
                    onChange={(e) =>
                      form.setValue("vitals.bpSyst", e.target.value ? Number(e.target.value) : undefined, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="bpDiast">PA Diastólica (mmHg)</FormLabel>
                  <Input
                    id="bpDiast"
                    type="number"
                    min={30}
                    max={160}
                    step="1"
                    value={form.watch("vitals.bpDiast") ?? ""}
                    onChange={(e) =>
                      form.setValue("vitals.bpDiast", e.target.value ? Number(e.target.value) : undefined, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="heartRate">Frecuencia cardíaca (lpm)</FormLabel>
                  <Input
                    id="heartRate"
                    type="number"
                    min={30}
                    max={220}
                    step="1"
                    value={form.watch("vitals.heartRate") ?? ""}
                    onChange={(e) =>
                      form.setValue("vitals.heartRate", e.target.value ? Number(e.target.value) : undefined, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="vitalNotes">Notas de vitales</FormLabel>
                <Input
                  id="vitalNotes"
                  placeholder="Ej: medición sentado, brazalete adulto…"
                  value={form.watch("vitals.notes") ?? ""}
                  onChange={(e) => form.setValue("vitals.notes", e.target.value || undefined, { shouldDirty: true })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
