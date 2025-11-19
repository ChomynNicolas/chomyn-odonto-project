// src/components/consulta-clinica/modules/anamnesis/sections/GeneralInformationSection.tsx

"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText } from "lucide-react"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface GeneralInformationSectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
}

export function GeneralInformationSection({ form, canEdit }: GeneralInformationSectionProps) {
  // Calculate completion
  const motivoConsulta = form.watch("motivoConsulta")
  const tieneDolorActual = form.watch("tieneDolorActual")
  const dolorIntensidad = form.watch("dolorIntensidad")
  const isComplete = !!motivoConsulta && (!tieneDolorActual || (tieneDolorActual && dolorIntensidad !== null && dolorIntensidad !== undefined))

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Información General
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="motivoConsulta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Motivo de consulta <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ej: Dolor en muela superior derecha"
                  maxLength={200}
                  disabled={!canEdit}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/200 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tieneDolorActual"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Tiene dolor actual?</FormLabel>
                <FormDescription>
                  Indique si el paciente presenta dolor en este momento
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canEdit}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("tieneDolorActual") && (
          <FormField
            control={form.control}
            name="dolorIntensidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intensidad del dolor (1-10)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : null
                      field.onChange(value && value >= 1 && value <= 10 ? value : null)
                    }}
                    placeholder="1-10"
                    disabled={!canEdit}
                    className="w-32"
                  />
                </FormControl>
                <FormDescription>
                  Escala de 1 (leve) a 10 (severo)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="urgenciaPercibida"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Urgencia percibida</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
                disabled={!canEdit}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione la urgencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="RUTINA">Rutina</SelectItem>
                  <SelectItem value="PRIORITARIO">Prioritario</SelectItem>
                  <SelectItem value="URGENCIA">Urgencia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ultimaVisitaDental"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Última visita dental</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                  disabled={!canEdit}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas adicionales</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Notas adicionales sobre la consulta..."
                  rows={3}
                  maxLength={5000}
                  disabled={!canEdit}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/5000 caracteres
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}

