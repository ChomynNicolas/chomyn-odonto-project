// src/components/consulta-clinica/modules/anamnesis/sections/WomenSpecificSection.tsx

"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { type AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
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
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Está embarazada?</FormLabel>
                <FormDescription>
                  Información relevante para tratamientos dentales
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
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
          <>
            <FormField
              control={form.control}
              name="womenSpecific.semanasEmbarazo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Semanas de embarazo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={42}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value, 10) : null
                        form.setValue("womenSpecific", {
                          ...form.getValues("womenSpecific"),
                          semanasEmbarazo: value && value >= 1 && value <= 42 ? value : null,
                        })
                      }}
                      disabled={!canEdit}
                      className="w-32"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="womenSpecific.ultimaMenstruacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Última menstruación</FormLabel>
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="womenSpecific.planificacionFamiliar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Planificación familiar</FormLabel>
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
                  rows={2}
                  maxLength={500}
                  disabled={!canEdit}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

