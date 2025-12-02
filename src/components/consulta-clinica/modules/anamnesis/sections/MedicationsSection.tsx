// src/components/consulta-clinica/modules/anamnesis/sections/MedicationsSection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { AnamnesisCreateUpdateBodySchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import { Pill } from "lucide-react"
import { MedicationSelector } from "../components/MedicationSelector"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface MedicationsSectionProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
  canEdit: boolean
  pacienteId: number
}

export function MedicationsSection({ form, canEdit, pacienteId }: MedicationsSectionProps) {
  const tieneMedicacionActual = form.watch("tieneMedicacionActual")
  const medications = form.watch("medications")
  const isComplete = Boolean(!tieneMedicacionActual || (tieneMedicacionActual && medications && medications.length > 0))

  return (
    <Card className="section-medications border-l-4 border-l-purple-500 shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Pill className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            Medicación Actual
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="tieneMedicacionActual"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
              <div className="space-y-1 pr-4">
                <FormLabel className="text-base font-medium">¿Tiene medicación actual?</FormLabel>
                <FormDescription className="text-sm leading-relaxed">
                  Indique si el paciente está tomando medicamentos actualmente
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel className="text-base font-medium">Medicaciones</FormLabel>
          <FormControl>
            <MedicationSelector form={form} pacienteId={pacienteId} disabled={!canEdit} />
          </FormControl>
          <FormDescription className="text-sm leading-relaxed">
            Busque medicaciones del paciente, del catálogo común, o agregue una personalizada. Las medicaciones se
            vincularán automáticamente a la anamnesis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </CardContent>
    </Card>
  )
}
