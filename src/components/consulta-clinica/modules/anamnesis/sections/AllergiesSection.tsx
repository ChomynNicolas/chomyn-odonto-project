// src/components/consulta-clinica/modules/anamnesis/sections/AllergiesSection.tsx

"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { type AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AllergySelector } from "../components/AllergySelector"
import { AlertTriangle } from "lucide-react"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface AllergiesSectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
  pacienteId: number
}

export function AllergiesSection({ form, canEdit, pacienteId }: AllergiesSectionProps) {
  const tieneAlergias = form.watch("tieneAlergias")
  const allergies = form.watch("allergies")
  const isComplete = !tieneAlergias || (tieneAlergias && allergies && allergies.length > 0)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
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
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Tiene alergias conocidas?</FormLabel>
                <FormDescription>
                  Indique si el paciente tiene alergias conocidas
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

        <FormItem>
          <FormLabel>Alergias específicas</FormLabel>
          <FormControl>
            <AllergySelector
              form={form}
              pacienteId={pacienteId}
              disabled={!canEdit}
            />
          </FormControl>
          <FormDescription>
            Busque alergias del paciente, del catálogo común, o agregue una personalizada. 
            Las alergias se vincularán automáticamente a la anamnesis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </CardContent>
    </Card>
  )
}

