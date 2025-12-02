// src/components/consulta-clinica/modules/anamnesis/sections/AllergiesSection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { AnamnesisCreateUpdateBodySchema } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { z } from "zod"
import { AlertTriangle } from "lucide-react"
import { AllergySelector } from "../components/AllergySelector"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface AllergiesSectionProps {
  form: UseFormReturn<z.input<typeof AnamnesisCreateUpdateBodySchema>>
  canEdit: boolean
  pacienteId: number
}

export function AllergiesSection({ form, canEdit, pacienteId }: AllergiesSectionProps) {
  const tieneAlergias = form.watch("tieneAlergias")
  const allergies = form.watch("allergies")
  const isComplete = Boolean(!tieneAlergias || (tieneAlergias && allergies && allergies.length > 0))

  return (
    <Card className="section-allergies border-l-4 border-l-amber-500 shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            Alergias
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="tieneAlergias"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
              <div className="space-y-1 pr-4">
                <FormLabel className="text-base font-medium">¿Tiene alergias conocidas?</FormLabel>
                <FormDescription className="text-sm leading-relaxed">
                  Indique si el paciente tiene alergias conocidas
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel className="text-base font-medium">Alergias específicas</FormLabel>
          <FormControl>
            <AllergySelector form={form} pacienteId={pacienteId} disabled={!canEdit} />
          </FormControl>
          <FormDescription className="text-sm leading-relaxed">
            Busque alergias del paciente, del catálogo común, o agregue una personalizada. Las alergias se vincularán
            automáticamente a la anamnesis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </CardContent>
    </Card>
  )
}
