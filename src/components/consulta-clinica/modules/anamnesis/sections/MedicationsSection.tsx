// src/components/consulta-clinica/modules/anamnesis/sections/MedicationsSection.tsx

"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { type AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { MedicationSelector } from "../components/MedicationSelector"

interface MedicationsSectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
  pacienteId: number
}

export function MedicationsSection({ form, canEdit, pacienteId }: MedicationsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Medicación Actual</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="tieneMedicacionActual"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Tiene medicación actual?</FormLabel>
                <FormDescription>
                  Indique si el paciente está tomando medicamentos actualmente
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
          <FormLabel>Medicaciones</FormLabel>
          <FormControl>
            <MedicationSelector
              form={form}
              pacienteId={pacienteId}
              disabled={!canEdit}
            />
          </FormControl>
          <FormDescription>
            Busque medicaciones del paciente, del catálogo común, o agregue una personalizada. 
            Las medicaciones se vincularán automáticamente a la anamnesis.
          </FormDescription>
          <FormMessage />
        </FormItem>
      </CardContent>
    </Card>
  )
}

