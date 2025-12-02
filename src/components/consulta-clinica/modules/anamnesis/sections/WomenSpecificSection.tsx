// src/components/consulta-clinica/modules/anamnesis/sections/WomenSpecificSection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnamnesisCreateUpdateBodySchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import type { AnamnesisAgeRules } from "@/lib/utils/age-utils"
import { AlertCircle, Heart, Info } from "lucide-react"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface WomenSpecificSectionProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
  canEdit: boolean
  ageRules: AnamnesisAgeRules
}

export function WomenSpecificSection({ form, canEdit, ageRules }: WomenSpecificSectionProps) {
  const womenSpecific = form.watch("womenSpecific")
  const isComplete = womenSpecific?.embarazada !== null && womenSpecific?.embarazada !== undefined

  // Determinar qué preguntas mostrar según edad
  const showPregnancyQuestions = ageRules.canShowPregnancyQuestions
  const showMenstrualQuestions = ageRules.canShowMenstrualQuestions
  const showFamilyPlanningQuestions = ageRules.canShowFamilyPlanningQuestions

  // Si no puede mostrar ninguna pregunta específica, no renderizar la sección
  if (!showPregnancyQuestions && !showMenstrualQuestions && !showFamilyPlanningQuestions) {
    return null
  }

  return (
    <Card className="section-women border-l-4 border-l-pink-500 shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-950">
              <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            Información Específica para Mujeres
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerta informativa para adolescentes */}
        {ageRules.requiresGuardianPresence && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
              Información para adolescentes
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Esta información es confidencial y relevante para tu salud dental. Puedes responder con la presencia de
              tu tutor si lo deseas.
            </AlertDescription>
          </Alert>
        )}

        {/* Pregunta sobre embarazo - Solo si tiene edad adecuada (15+ años) */}
        {showPregnancyQuestions && (
          <FormField
            control={form.control}
            name="womenSpecific.embarazada"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
                <div className="space-y-1 pr-4">
                  <FormLabel className="text-base font-medium">
                    ¿Está embarazada? <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormDescription className="text-sm leading-relaxed">
                    Información relevante para tratamientos dentales y medicamentos
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value || false}
                    onCheckedChange={(checked) => {
                      form.setValue("womenSpecific", {
                        ...form.getValues("womenSpecific"),
                        embarazada: checked ? true : false,
                      })
                    }}
                    disabled={!canEdit}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Información adicional si está embarazada */}
        {showPregnancyQuestions && form.watch("womenSpecific.embarazada") && (
          <>
            <Alert className="border-pink-300 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              <AlertTitle className="text-pink-900 dark:text-pink-100 font-semibold">
                Precauciones durante el embarazo
              </AlertTitle>
              <AlertDescription className="text-pink-800 dark:text-pink-200">
                Se tomarán precauciones especiales durante el tratamiento dental. Algunos procedimientos y medicamentos
                serán evaluados cuidadosamente.
              </AlertDescription>
            </Alert>

            <div className="space-y-6 rounded-xl border-2 border-pink-200 bg-pink-50/50 p-6 dark:border-pink-900 dark:bg-pink-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="womenSpecific.semanasEmbarazo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Semanas de embarazo (aproximadas)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={42}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number.parseInt(e.target.value, 10) : null
                            form.setValue("womenSpecific", {
                              ...form.getValues("womenSpecific"),
                              semanasEmbarazo: value && value >= 1 && value <= 42 ? value : null,
                            })
                          }}
                          disabled={!canEdit}
                          placeholder="Ej: 12"
                          className="h-11 text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        El trimestre del embarazo es importante para planificar tratamientos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="womenSpecific.ultimaMenstruacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Fecha de última menstruación (FUM)</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                          onChange={(e) => {
                            form.setValue("womenSpecific", {
                              ...form.getValues("womenSpecific"),
                              ultimaMenstruacion: e.target.value ? new Date(e.target.value).toISOString() : null,
                            })
                          }}
                          max={new Date().toISOString().split("T")[0]}
                          disabled={!canEdit}
                          className="h-11 text-base"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Ayuda a calcular semanas de gestación</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </>
        )}

        {/* Información menstrual - Solo si tiene edad adecuada (12+ años) y no está embarazada */}
        {showMenstrualQuestions && !form.watch("womenSpecific.embarazada") && (
          <FormField
            control={form.control}
            name="womenSpecific.ultimaMenstruacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Fecha de última menstruación (FUM)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().slice(0, 10) : ""}
                    onChange={(e) => {
                      form.setValue("womenSpecific", {
                        ...form.getValues("womenSpecific"),
                        ultimaMenstruacion: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={!canEdit}
                    className="h-11 text-base"
                  />
                </FormControl>
                <FormDescription className="text-sm">
                  Opcional, útil para descartar embarazo antes de procedimientos con radiografías
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Planificación familiar - Solo si tiene edad adecuada (15+ años) */}
        {showFamilyPlanningQuestions && (
          <FormField
            control={form.control}
            name="womenSpecific.planificacionFamiliar"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Método anticonceptivo actual
                  <span className="text-muted-foreground font-normal ml-2">(opcional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    value={field.value || ""}
                    onChange={(e) => {
                      form.setValue("womenSpecific", {
                        ...form.getValues("womenSpecific"),
                        planificacionFamiliar: e.target.value,
                      })
                    }}
                    placeholder="Ej: Anticonceptivos orales, DIU, implante, ninguno..."
                    rows={3}
                    maxLength={500}
                    disabled={!canEdit}
                    className="text-base leading-relaxed resize-none"
                  />
                </FormControl>
                <FormDescription className="text-sm">
                  Algunos medicamentos dentales pueden interactuar con anticonceptivos orales. Esta información ayuda a
                  tomar decisiones seguras.
                </FormDescription>
                <div className="flex justify-between items-center">
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">{(field.value || "").length}/500 caracteres</p>
                </div>
              </FormItem>
            )}
          />
        )}

        {/* Mensaje informativo si solo puede responder preguntas menstruales */}
        {showMenstrualQuestions && !showPregnancyQuestions && (
          <Alert className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
            <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription className="text-purple-800 dark:text-purple-200 text-sm">
              La información sobre el ciclo menstrual nos ayuda a planificar mejor los tratamientos y medicamentos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
