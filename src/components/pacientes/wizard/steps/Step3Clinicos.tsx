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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Pill, FileText, StickyNote, Activity } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import type { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

// ======= Catálogos rápidos (offline) =======
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

// ======= Utils para lista en textarea (compatible con backend actual) =======
function parseList(s?: string) {
  if (!s) return [] as string[]
  return s
    .split(/[,;\n]/g)
    .map((t) => t.trim())
    .filter(Boolean)
}
function joinList(list: string[]) {
  return Array.from(new Set(list)).join(", ")
}
function toggleToken(current: string, token: string) {
  const list = parseList(current)
  const has = list.some((x) => x.toLowerCase() === token.toLowerCase())
  const next = has ? list.filter((x) => x.toLowerCase() !== token.toLowerCase()) : [...list, token]
  return joinList(next)
}

type Vitals = {
  enabled: boolean
  heightCm?: number | null
  weightKg?: number | null
  bmi?: number | null
  bpSyst?: number | null
  bpDiast?: number | null
  heartRate?: number | null
  notes?: string | null
}

interface Step3ClinicosProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step3Clinicos({ form }: Step3ClinicosProps) {
  // ========= Estado local para Vitales (aún no se envía al endpoint) =========
  const [vitals, setVitals] = useState<Vitals>({ enabled: false })

  // BMI auto (si hay altura y peso)
  useEffect(() => {
    if (!vitals.enabled) return
    const h = (vitals.heightCm ?? 0) / 100
    const w = vitals.weightKg ?? 0
    const bmi = h > 0 && w > 0 ? Number((w / (h * h)).toFixed(1)) : null
    setVitals((v) => ({ ...v, bmi }))
  }, [vitals.enabled, vitals.heightCm, vitals.weightKg])

  // Sugerencia: si activan vitales, añade una línea de ayuda en observaciones (no bloqueante)
  useEffect(() => {
    if (!vitals.enabled) return
    const hint = "Se registrarán signos vitales iniciales en la primera consulta."
    const obs = form.getValues("observaciones") ?? ""
    if (!obs.includes(hint)) {
      form.setValue("observaciones", obs ? `${obs}\n${hint}` : hint, {
        shouldDirty: true,
        shouldValidate: false,
      })
    }
  }, [vitals.enabled, form])

  const alergiasValue = form.watch("alergias") ?? ""
  const medicacionValue = form.watch("medicacion") ?? ""

  const alergiasCount = useMemo(() => parseList(alergiasValue).length, [alergiasValue])
  const medicacionCount = useMemo(() => parseList(medicacionValue).length, [medicacionValue])

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
            Seleccione con los atajos o escriba manualmente (separado por comas/; o Enter). Por defecto la severidad se
            registra como <strong>MODERATE</strong> en backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMON_ALLERGENS.map((tag) => {
              const selected = parseList(alergiasValue).some((x) => x.toLowerCase() === tag.toLowerCase())
              return (
                <Button
                  key={tag}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => form.setValue("alergias", toggleToken(alergiasValue, tag), { shouldDirty: true })}
                >
                  {tag}
                </Button>
              )
            })}
          </div>

          <FormField
            control={form.control}
            name="alergias"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="alergias">Alergias conocidas</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="alergias"
                    placeholder="Ej: Penicilina, látex, anestesia local…"
                    className="min-h-[100px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        // ctrl/cmd+enter para insertar nueva línea sin enviar
                        return
                      }
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const next = field.value ? field.value.trim() + ", " : ""
                        field.onChange(next)
                      }
                    }}
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/500 caracteres • {alergiasCount} ítem(s)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue("alergias", "", { shouldDirty: true })}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                form.setValue("alergias", joinList(parseList(alergiasValue)), { shouldDirty: true, shouldValidate: true })
              }
            >
              Normalizar lista
            </Button>
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
          <CardDescription>
            Use atajos y/o escriba manualmente (nombre + dosis/frecuencia si aplica). Se crearán registros iniciales
            <em>isActive = true</em>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMON_MEDICATIONS.map((tag) => {
              const selected = parseList(medicacionValue).some((x) => x.toLowerCase() === tag.toLowerCase())
              return (
                <Button
                  key={tag}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => form.setValue("medicacion", toggleToken(medicacionValue, tag), { shouldDirty: true })}
                >
                  {tag}
                </Button>
              )
            })}
          </div>

          <FormField
            control={form.control}
            name="medicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="medicacion">Medicamentos actuales</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="medicacion"
                    placeholder="Ej: Aspirina 100 mg (1 vez/día), Losartán 50 mg…"
                    className="min-h-[100px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) return
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const next = field.value ? field.value.trim() + ", " : ""
                        field.onChange(next)
                      }
                    }}
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>
                  {field.value?.length || 0}/500 caracteres • {medicacionCount} ítem(s)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue("medicacion", "", { shouldDirty: true })}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                form.setValue("medicacion", joinList(parseList(medicacionValue)), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              Normalizar lista
            </Button>
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
                  <Textarea
                    {...field}
                    id="antecedentes"
                    placeholder="Ej: Diabetes tipo 2, HTA, cirugía cardíaca (2020)…"
                    className="min-h-[120px] resize-none"
                    maxLength={1000}
                  />
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
                  <Textarea
                    {...field}
                    id="observaciones"
                    placeholder="Cualquier información adicional relevante…"
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* ======= Signos vitales (opcional, UX local) ======= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Vitales iniciales (opcional)
          </CardTitle>
          <CardDescription>
            Puedes registrar una línea base (no bloquea el alta). Cuando habilites en backend, enviaremos estos datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <FormLabel>Registrar vitales</FormLabel>
              <FormDescription>Altura, peso, IMC, PA y FC</FormDescription>
            </div>
            <Switch checked={vitals.enabled} onCheckedChange={(v) => setVitals((s) => ({ ...s, enabled: v }))} />
          </div>

          {vitals.enabled && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <FormLabel htmlFor="heightCm">Altura (cm)</FormLabel>
                  <Input
                    id="heightCm"
                    inputMode="numeric"
                    type="number"
                    min={50}
                    max={250}
                    step="1"
                    value={vitals.heightCm ?? ""}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, heightCm: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="weightKg">Peso (kg)</FormLabel>
                  <Input
                    id="weightKg"
                    inputMode="decimal"
                    type="number"
                    min={10}
                    max={300}
                    step="0.1"
                    value={vitals.weightKg ?? ""}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, weightKg: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>IMC</FormLabel>
                  <Input readOnly value={vitals.bmi ?? ""} placeholder="—" />
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
                    value={vitals.bpSyst ?? ""}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, bpSyst: e.target.value ? Number(e.target.value) : null }))
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
                    value={vitals.bpDiast ?? ""}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, bpDiast: e.target.value ? Number(e.target.value) : null }))
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
                    value={vitals.heartRate ?? ""}
                    onChange={(e) =>
                      setVitals((v) => ({ ...v, heartRate: e.target.value ? Number(e.target.value) : null }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel htmlFor="vitalNotes">Notas de vitales</FormLabel>
                <Input
                  id="vitalNotes"
                  placeholder="Ej: medición sentado, brazalete adulto…"
                  value={vitals.notes ?? ""}
                  onChange={(e) => setVitals((v) => ({ ...v, notes: e.target.value || null }))}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                * Por ahora no se envía al endpoint. Cuando actualices el DTO del servidor para incluir{" "}
                <code>vitals</code>, te paso el patch del handler para persistir en <code>PatientVitals</code>.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
