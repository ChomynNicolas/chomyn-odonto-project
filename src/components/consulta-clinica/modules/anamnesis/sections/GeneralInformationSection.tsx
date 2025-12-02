// src/components/consulta-clinica/modules/anamnesis/sections/GeneralInformationSection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnamnesisCreateUpdateBodySchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { FileText, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"
import { PainSlider } from "../components/PainSlider"

interface GeneralInformationSectionProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
  canEdit: boolean
}

export function GeneralInformationSection({ form, canEdit }: GeneralInformationSectionProps) {
  // Calculate completion (motivoConsulta removed - it's now in consulta)
  const tieneDolorActual = form.watch("tieneDolorActual")
  const dolorIntensidad = form.watch("dolorIntensidad")
  const isComplete =
    (!tieneDolorActual || (tieneDolorActual && dolorIntensidad !== null && dolorIntensidad !== undefined))

  return (
    <Card className="section-general border-l-4 border-l-primary shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Información General
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormField
          control={form.control}
          name="tieneDolorActual"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
              <div className="space-y-1 pr-4">
                <FormLabel className="text-base font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  ¿Tiene dolor actual?
                </FormLabel>
                <FormDescription className="text-sm leading-relaxed">
                  Indique si el paciente presenta dolor en este momento
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("tieneDolorActual") && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-6 space-y-4 dark:border-amber-900 dark:bg-amber-950/30">
            <FormField
              control={form.control}
              name="dolorIntensidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Intensidad del dolor</FormLabel>
                  <FormControl>
                    <PainSlider value={field.value} onChange={field.onChange} disabled={!canEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="urgenciaPercibida"
            render={({ field }) => {
              // Si field.value es nulo o undefined, forzamos que sea "RUTINA"
              const currentValue = field.value ?? "RUTINA";
              // Cuando cambias la selección, actualiza a ese valor
              return (
                <FormItem>
                  <FormLabel className="text-base font-medium">Urgencia percibida</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={currentValue}
                    disabled={!canEdit}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Seleccione la urgencia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent >
                      <SelectItem value="RUTINA" >Rutina</SelectItem>
                      <SelectItem value="PRIORITARIO">Prioritario</SelectItem>
                      <SelectItem value="URGENCIA">Urgencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <FormField
            control={form.control}
            name="ultimaVisitaDental"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Última visita dental</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    disabled={!canEdit}
                    className="h-11 text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="customNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium flex items-center gap-2">
                Notas adicionales
                <Badge variant="outline" className="ml-auto">
                  {field.value?.length || 0}/5000
                </Badge>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Notas adicionales sobre la consulta..."
                  rows={4}
                  maxLength={5000}
                  disabled={!canEdit}
                  className="text-base leading-relaxed resize-none"
                />
              </FormControl>
              <FormDescription className="text-sm">
                Información complementaria relevante para el tratamiento
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
