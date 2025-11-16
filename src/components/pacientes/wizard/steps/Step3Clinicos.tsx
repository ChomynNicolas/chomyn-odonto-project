// src/components/pacientes/wizard/steps/Step3Clinicos.tsx
"use client"

import type { UseFormReturn } from "react-hook-form"
import { useEffect, useState } from "react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, Pill, FileText, StickyNote, Activity, X, Plus, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PacienteCreateFormInput } from "@/lib/schema/paciente.schema"

type AllergySeverity = "MILD" | "MODERATE" | "SEVERE"

// Mapeo de severidad a español
const SEVERITY_LABELS: Record<AllergySeverity, string> = {
  MILD: "Leve",
  MODERATE: "Moderada",
  SEVERE: "Grave",
}

// ======= Catálogos rápidos =======
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

const ADMINISTRATION_ROUTES = [
  "Oral (VO)",
  "Intravenosa (IV)",
  "Intramuscular (IM)",
  "Subcutánea (SC)",
  "Tópica",
  "Inhalatoria",
  "Rectal",
  "Oftálmica",
] as const

interface Step3ClinicosProps {
  form: UseFormReturn<PacienteCreateFormInput>
}

// Componente Combobox para alergias
function AllergyCombobox({
  value,
  onChange,
  existingLabels,
}: {
  value: string
  onChange: (value: string) => void
  existingLabels: string[]
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || "")

  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  const filteredOptions = COMMON_ALLERGENS.filter(
    (item) =>
      !existingLabels.includes(item) &&
      item.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Seleccionar o escribir alergia..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar alergia..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? (
                <div className="py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSelect(inputValue)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar &quot;{inputValue}&quot;
                  </Button>
                </div>
              ) : (
                "Sin resultados"
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Componente Combobox para medicación
function MedicationCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || "")

  useEffect(() => {
    setInputValue(value || "")
  }, [value])

  const filteredOptions = COMMON_MEDICATIONS.filter((item) =>
    item.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setInputValue(selectedValue)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || "Seleccionar o escribir medicamento..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar medicamento..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? (
                <div className="py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSelect(inputValue)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar &quot;{inputValue}&quot;
                  </Button>
                </div>
              ) : (
                "Sin resultados"
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((item) => (
                <CommandItem
                  key={item}
                  value={item}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
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
  } = useFieldArray({ control: form.control, name: "medicacion" })

  // ====== VITALS: activar y calcular BMI dentro del form
  const [vitalsEnabled, setVitalsEnabled] = useState<boolean>(false)
  const vitals = form.watch("vitals")
  const vHeight = vitals?.heightCm
  const vWeight = vitals?.weightKg

  // Inicializa measuredAt al activar
  useEffect(() => {
    if (vitalsEnabled) {
      const currentVitals = form.getValues("vitals")
      if (!currentVitals) {
        form.setValue(
          "vitals",
          { measuredAt: new Date().toISOString() },
          { shouldDirty: true }
        )
      } else if (!currentVitals.measuredAt) {
        form.setValue(
          "vitals",
          { ...currentVitals, measuredAt: new Date().toISOString() },
          { shouldDirty: true }
        )
      }
    }
  }, [vitalsEnabled, form])

  // Helper para asegurar que vitals existe antes de actualizar
  const ensureVitalsExists = () => {
    const currentVitals = form.getValues("vitals")
    if (!currentVitals) {
      form.setValue("vitals", { measuredAt: new Date().toISOString() }, { shouldDirty: true })
    } else if (!currentVitals.measuredAt) {
      form.setValue("vitals", { ...currentVitals, measuredAt: new Date().toISOString() }, { shouldDirty: true })
    }
  }

  // Calcula BMI cuando cambian height o weight
  useEffect(() => {
    if (!vitalsEnabled || !vitals) return
    const h = typeof vHeight === "number" && vHeight > 0 ? vHeight / 100 : 0
    const w = typeof vWeight === "number" && vWeight > 0 ? vWeight : 0
    if (h > 0 && w > 0) {
      const bmi = Number((w / (h * h)).toFixed(1))
      form.setValue(
        "vitals.bmi",
        bmi,
        { shouldDirty: false, shouldValidate: false }
      )
    } else if (vitals.bmi !== undefined) {
      form.setValue(
        "vitals.bmi",
        undefined,
        { shouldDirty: false, shouldValidate: false }
      )
    }
  }, [vitalsEnabled, vHeight, vWeight, vitals, form])

  // Obtener alergias existentes para prevenir duplicados
  const existingAllergyLabels = allergyFields.map(
    (field, idx) => form.watch(`alergias.${idx}.label`) || ""
  ).filter(Boolean)

  const alergiasCount = allergyFields.length
  const medicacionCount = medFields.length

  // Función para agregar alergia desde catálogo (con prevención de duplicados)
  const handleAddAllergyFromCatalog = (allergyName: string) => {
    if (existingAllergyLabels.includes(allergyName)) {
      return // Ya existe, no agregar
    }
    appendAllergy({ label: allergyName, severity: "MODERATE", isActive: true })
  }

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
            Agrega desde catálogo rápido o escribe manualmente. Por defecto la severidad es <strong>Moderada</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Catálogo rápido */}
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Catálogo rápido</FormLabel>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((allergy) => {
                const isAdded = existingAllergyLabels.includes(allergy)
                return (
                  <Button
                    key={allergy}
                    type="button"
                    variant={isAdded ? "secondary" : "outline"}
                    size="sm"
                    className="rounded-full"
                    disabled={isAdded}
                    onClick={() => handleAddAllergyFromCatalog(allergy)}
                  >
                    {allergy}
                    {isAdded && <Check className="ml-1 h-3 w-3" />}
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Botón agregar alergia manual */}
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-sm font-medium">Alergias registradas</FormLabel>
              <FormDescription className="text-xs">
                {alergiasCount === 0
                  ? "No hay alergias registradas"
                  : `${alergiasCount} alergia${alergiasCount !== 1 ? "s" : ""} registrada${alergiasCount !== 1 ? "s" : ""}`}
              </FormDescription>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => appendAllergy({ label: "", severity: "MODERATE", isActive: true })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar alergia
            </Button>
          </div>

          {/* Lista editable de alergias */}
          <div className="space-y-4">
            {allergyFields.map((field, idx) => {
              const currentLabel = form.watch(`alergias.${idx}.label`) || ""
              const otherLabels = existingAllergyLabels.filter((_, i) => i !== idx)
              return (
                <Card key={field.id} className="border-l-4 border-l-destructive/50">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel htmlFor={`allergy-label-${idx}`}>
                            Nombre del alérgeno <span className="text-destructive">*</span>
                          </FormLabel>
                          <AllergyCombobox
                            value={currentLabel}
                            onChange={(value) =>
                              form.setValue(`alergias.${idx}.label`, value, { shouldDirty: true })
                            }
                            existingLabels={otherLabels}
                          />
                        </div>
                        <div className="space-y-2">
                          <FormLabel htmlFor={`allergy-severity-${idx}`}>
                            Severidad <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            value={form.watch(`alergias.${idx}.severity`) || "MODERATE"}
                            onValueChange={(v) =>
                              updateAllergy(idx, { ...field, severity: v as AllergySeverity })
                            }
                          >
                            <SelectTrigger id={`allergy-severity-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MILD">{SEVERITY_LABELS.MILD}</SelectItem>
                              <SelectItem value="MODERATE">{SEVERITY_LABELS.MODERATE}</SelectItem>
                              <SelectItem value="SEVERE">{SEVERITY_LABELS.SEVERE}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel htmlFor={`allergy-reaction-${idx}`}>
                            Reacción (opcional)
                          </FormLabel>
                          <Input
                            id={`allergy-reaction-${idx}`}
                            placeholder="Ej: urticaria, anafilaxia, dificultad respiratoria..."
                            value={form.watch(`alergias.${idx}.reaction`) || ""}
                            onChange={(e) =>
                              form.setValue(`alergias.${idx}.reaction`, e.target.value, { shouldDirty: true })
                            }
                            maxLength={255}
                          />
                          <FormDescription className="text-xs">
                            Describe la reacción alérgica observada
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          <FormLabel htmlFor={`allergy-notes-${idx}`}>
                            Comentarios adicionales (opcional)
                          </FormLabel>
                          <Input
                            id={`allergy-notes-${idx}`}
                            placeholder="Ej: fecha de diagnóstico, pruebas realizadas..."
                            value={form.watch(`alergias.${idx}.notes`) || ""}
                            onChange={(e) =>
                              form.setValue(`alergias.${idx}.notes`, e.target.value, { shouldDirty: true })
                            }
                            maxLength={500}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAllergy(idx)}
                          aria-label="Eliminar alergia"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ======= Medicación Actual ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="h-5 w-5 text-primary" />
            Medicación Actual
          </CardTitle>
          <CardDescription>
            Agrega desde catálogo rápido o manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Catálogo rápido */}
          <div className="space-y-2">
            <FormLabel className="text-sm font-medium">Catálogo rápido</FormLabel>
            <div className="flex flex-wrap gap-2">
              {COMMON_MEDICATIONS.map((med) => (
                <Button
                  key={med}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => appendMed({ label: med, isActive: true })}
                >
                  {med}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Botón agregar medicación manual */}
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-sm font-medium">Medicación registrada</FormLabel>
              <FormDescription className="text-xs">
                {medicacionCount === 0
                  ? "No hay medicación registrada"
                  : `${medicacionCount} medicación${medicacionCount !== 1 ? "es" : ""} registrada${medicacionCount !== 1 ? "s" : ""}`}
              </FormDescription>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => appendMed({ label: "", isActive: true })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar medicación
            </Button>
          </div>

          {/* Lista editable de medicación */}
          <div className="space-y-4">
            {medFields.map((field, idx) => (
              <Card key={field.id} className="border-l-4 border-l-primary/50">
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <FormLabel htmlFor={`med-label-${idx}`}>
                        Medicamento <span className="text-destructive">*</span>
                      </FormLabel>
                      <MedicationCombobox
                        value={form.watch(`medicacion.${idx}.label`) || ""}
                        onChange={(value) =>
                          form.setValue(`medicacion.${idx}.label`, value, { shouldDirty: true })
                        }
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <FormLabel htmlFor={`med-dose-${idx}`}>
                          Dosis (opcional)
                        </FormLabel>
                        <Input
                          id={`med-dose-${idx}`}
                          placeholder="Ej: 50 mg, 100 µg..."
                          value={form.watch(`medicacion.${idx}.dose`) || ""}
                          onChange={(e) =>
                            form.setValue(`medicacion.${idx}.dose`, e.target.value, { shouldDirty: true })
                          }
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel htmlFor={`med-freq-${idx}`}>
                          Frecuencia (opcional)
                        </FormLabel>
                        <Input
                          id={`med-freq-${idx}`}
                          placeholder="Ej: 1 vez al día, cada 8 horas..."
                          value={form.watch(`medicacion.${idx}.freq`) || ""}
                          onChange={(e) =>
                            form.setValue(`medicacion.${idx}.freq`, e.target.value, { shouldDirty: true })
                          }
                          maxLength={120}
                        />
                      </div>
                      <div className="space-y-2">
                        <FormLabel htmlFor={`med-route-${idx}`}>
                          Vía de administración (opcional)
                        </FormLabel>
                        <Select
                          value={form.watch(`medicacion.${idx}.route`) || undefined}
                          onValueChange={(v) =>
                            form.setValue(`medicacion.${idx}.route`, v === "NINGUNA" ? undefined : v, { shouldDirty: true })
                          }
                        >
                          <SelectTrigger id={`med-route-${idx}`}>
                            <SelectValue placeholder="Seleccionar vía..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NINGUNA">Ninguna</SelectItem>
                            {ADMINISTRATION_ROUTES.map((route) => (
                              <SelectItem key={route} value={route}>
                                {route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FormLabel htmlFor={`med-notes-${idx}`}>
                        Comentarios adicionales (opcional)
                      </FormLabel>
                      <Textarea
                        id={`med-notes-${idx}`}
                        placeholder="Ej: fecha de inicio, duración del tratamiento, efectos secundarios..."
                        value={form.watch(`medicacion.${idx}.notes`) || ""}
                        onChange={(e) =>
                          form.setValue(`medicacion.${idx}.notes`, e.target.value || undefined, { shouldDirty: true })
                        }
                        className="min-h-[80px] resize-none"
                        maxLength={500}
                      />
                      <FormDescription className="text-xs">
                        Información adicional sobre esta medicación
                      </FormDescription>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMed(idx)}
                        aria-label="Eliminar medicación"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ======= Antecedentes Médicos ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Antecedentes Médicos
          </CardTitle>
          <CardDescription>Crónicos, cirugías previas, hospitalizaciones, etc.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de antecedentes */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="antecedentes_resumen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="antecedentes_resumen">Resumen de antecedentes médicos</FormLabel>
                  <FormControl>
                    <Textarea
                      id="antecedentes_resumen"
                      className="min-h-[120px] resize-none"
                      maxLength={1000}
                      placeholder="Ej: Hipertenso controlado, diabético tipo 2, cirugía cardíaca en 2018."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{field.value?.length || 0}/1000 caracteres</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Preguntas rápidas */}
          <div className="space-y-4">
            <FormLabel className="text-sm font-medium">Preguntas rápidas</FormLabel>
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* Hipertensión arterial */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_hipertension"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Hipertensión arterial</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_hipertension_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_hipertension") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_hipertension_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Enalapril 10 mg/día, último control hace 3 meses."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Diabetes */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_diabetes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Diabetes</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_diabetes_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_diabetes") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_diabetes_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Enalapril 10 mg/día, último control hace 3 meses."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Anticoagulantes */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_anticoagulantes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Toma anticoagulantes</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_anticoagulantes_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_anticoagulantes") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_anticoagulantes_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Warfarina, INR promedio 2.5."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Cirugía mayor */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_cirugia_mayor"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Cirugía mayor previa (cardíaca, abdominal, etc.)</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_cirugia_mayor_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_cirugia_mayor") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_cirugia_mayor_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Bypass coronario en 2018, sin complicaciones."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Enfermedad infecciosa crónica */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_infeccioso_cronico"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enfermedad infecciosa crónica (VIH, Hepatitis, TB)</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_infeccioso_cronico_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_infeccioso_cronico") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_infeccioso_cronico_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Hepatitis B, en tratamiento."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Problemas de coagulación */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_problemas_coagulacion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Problemas de coagulación</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={(checked) => {
                            field.onChange(checked)
                            if (!checked) {
                              form.setValue("antecedente_problemas_coagulacion_detalle", null, { shouldDirty: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_problemas_coagulacion") && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_problemas_coagulacion_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: Hemofilia tipo A, control regular."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Embarazo / Lactancia */}
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="antecedente_embarazo_lactancia"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-base">Embarazo / Lactancia</FormLabel>
                        </div>
                        <FormDescription className="text-xs">Aplica solo para pacientes en edad fértil.</FormDescription>
                        <FormControl>
                          <Select
                            value={field.value || "NINGUNO"}
                            onValueChange={(value) => {
                              field.onChange(value)
                              if (value === "NINGUNO") {
                                form.setValue("antecedente_embarazo_lactancia_detalle", null, { shouldDirty: true })
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NINGUNO">Ninguno</SelectItem>
                              <SelectItem value="EMBARAZO">Embarazo</SelectItem>
                              <SelectItem value="LACTANCIA">Lactancia</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                {form.watch("antecedente_embarazo_lactancia") && form.watch("antecedente_embarazo_lactancia") !== "NINGUNO" && (
                  <div className="ml-4 space-y-2 transition-all duration-200">
                    <FormField
                      control={form.control}
                      name="antecedente_embarazo_lactancia_detalle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Detalle (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: 28 semanas de embarazo, sin complicaciones."
                              maxLength={255}
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
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
                    value={vHeight ?? ""}
                    onChange={(e) => {
                      ensureVitalsExists()
                      form.setValue(
                        "vitals.heightCm",
                        e.target.value ? Number(e.target.value) : undefined,
                        { shouldDirty: true }
                      )
                    }}
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
                    value={vWeight ?? ""}
                    onChange={(e) => {
                      ensureVitalsExists()
                      form.setValue(
                        "vitals.weightKg",
                        e.target.value ? Number(e.target.value) : undefined,
                        { shouldDirty: true }
                      )
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>IMC</FormLabel>
                  <Input readOnly value={vitals?.bmi ?? ""} placeholder="—" />
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
                    value={vitals?.bpSyst ?? ""}
                    onChange={(e) => {
                      ensureVitalsExists()
                      form.setValue(
                        "vitals.bpSyst",
                        e.target.value ? Number(e.target.value) : undefined,
                        { shouldDirty: true }
                      )
                    }}
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
                    value={vitals?.bpDiast ?? ""}
                    onChange={(e) => {
                      ensureVitalsExists()
                      form.setValue(
                        "vitals.bpDiast",
                        e.target.value ? Number(e.target.value) : undefined,
                        { shouldDirty: true }
                      )
                    }}
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
                    value={vitals?.heartRate ?? ""}
                    onChange={(e) => {
                      ensureVitalsExists()
                      form.setValue(
                        "vitals.heartRate",
                        e.target.value ? Number(e.target.value) : undefined,
                        { shouldDirty: true }
                      )
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="vitalNotes">Notas de vitales</FormLabel>
                <Input
                  id="vitalNotes"
                  placeholder="Ej: medición sentado, brazalete adulto…"
                  value={vitals?.notes ?? ""}
                  onChange={(e) => {
                    ensureVitalsExists()
                    form.setValue(
                      "vitals.notes",
                      e.target.value || undefined,
                      { shouldDirty: true }
                    )
                  }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
