// src/components/consulta-clinica/modules/anamnesis/sections/PediatricSection.tsx
"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Baby, Milk } from "lucide-react"
import type { AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import type { AnamnesisAgeRules } from "@/lib/utils/age-utils"

interface PediatricSectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
  ageRules: AnamnesisAgeRules
}

export function PediatricSection({ form, canEdit, ageRules }: PediatricSectionProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Baby className="h-5 w-5 text-primary" />
          Información Pediátrica
        </CardTitle>
        <CardDescription>Información específica para pacientes pediátricos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Historial de lactancia */}
        {ageRules.canShowLactationHistory && (
          <FormField
            control={form.control}
            name="lactanciaRegistrada"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Milk className="h-4 w-4" />
                  ¿El niño/a recibió lactancia materna?
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={
                      typeof field.value === "string"
                        ? field.value
                        : field.value === undefined || field.value === null
                        ? undefined
                        : undefined // Don't convert boolean to enum, let user select
                    }
                    disabled={!canEdit}
                    className="flex flex-col space-y-2"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="EXCLUSIVA" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Lactancia materna exclusiva</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="MIXTA" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Lactancia mixta</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="FORMULA" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Solo fórmula</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="NO_APLICA" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">No aplica / No se sabe</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Hábitos de succión */}
        {ageRules.canShowSuctionHabits && (
          <FormField
            control={form.control}
            name="tieneHabitosSuccion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Tiene hábitos de succión? (chupete, dedo, biberón prolongado)</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value === undefined ? undefined : String(field.value)}
                    disabled={!canEdit}
                    className="flex gap-6"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="true" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Sí</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="false" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">No</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Notas adicionales */}
        <FormField
          control={form.control}
          name="customNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones adicionales del tutor</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Información adicional proporcionada por el padre/madre/tutor..."
                  className="min-h-[100px] resize-none"
                  disabled={!canEdit}
                  maxLength={2000}
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">{field.value?.length || 0}/2000 caracteres</p>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
