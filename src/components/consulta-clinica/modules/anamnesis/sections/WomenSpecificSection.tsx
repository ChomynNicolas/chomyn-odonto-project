// src/components/consulta-clinica/modules/anamnesis/sections/WomenSpecificSection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { User } from "lucide-react"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface WomenSpecificSectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
}

export function WomenSpecificSection({ form, canEdit }: WomenSpecificSectionProps) {
  const womenSpecific = form.watch("womenSpecific")
  const isComplete = womenSpecific?.embarazada !== null && womenSpecific?.embarazada !== undefined

  return (
    <Card className="section-women border-l-4 border-l-pink-500 shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100 dark:bg-pink-950">
              <User className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            Información Específica para Mujeres
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="womenSpecific.embarazada"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
              <div className="space-y-1 pr-4">
                <FormLabel className="text-base font-medium">¿Está embarazada?</FormLabel>
                <FormDescription className="text-sm leading-relaxed">
                  Información relevante para tratamientos dentales
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={(checked) => {
                    form.setValue("womenSpecific", {
                      ...form.getValues("womenSpecific"),
                      embarazada: checked ? true : null,
                    })
                  }}
                  disabled={!canEdit}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("womenSpecific.embarazada") && (
          <div className="space-y-6 rounded-xl border-2 border-pink-200 bg-pink-50/50 p-6 dark:border-pink-900 dark:bg-pink-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="womenSpecific.semanasEmbarazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Semanas de embarazo</FormLabel>
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
                        placeholder="1-42"
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Duración del embarazo en semanas</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="womenSpecific.ultimaMenstruacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Última menstruación</FormLabel>
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
                        disabled={!canEdit}
                        className="h-11 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="womenSpecific.planificacionFamiliar"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Planificación familiar</FormLabel>
              <FormControl>
                <Textarea
                  value={field.value || ""}
                  onChange={(e) => {
                    form.setValue("womenSpecific", {
                      ...form.getValues("womenSpecific"),
                      planificacionFamiliar: e.target.value,
                    })
                  }}
                  placeholder="Notas sobre planificación familiar..."
                  rows={3}
                  maxLength={500}
                  disabled={!canEdit}
                  className="text-base leading-relaxed resize-none"
                />
              </FormControl>
              <FormDescription className="text-sm">Métodos anticonceptivos u otros aspectos relevantes</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
