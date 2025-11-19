// src/components/consulta-clinica/modules/anamnesis/sections/MedicalHistorySection.tsx

"use client"

import { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { type AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { AntecedentSelector } from "../components/AntecedentSelector"
import { Heart } from "lucide-react"
import { SectionCompletionIndicator } from "../components/SectionCompletionIndicator"

interface MedicalHistorySectionProps {
  form: UseFormReturn<AnamnesisCreateUpdateBody>
  canEdit: boolean
  pacienteId: number
}

export function MedicalHistorySection({ form, canEdit }: MedicalHistorySectionProps) {
  const tieneEnfermedadesCronicas = form.watch("tieneEnfermedadesCronicas")
  const antecedents = form.watch("antecedents")
  const isComplete = !tieneEnfermedadesCronicas || (tieneEnfermedadesCronicas && antecedents && antecedents.length > 0)

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" />
            Antecedentes Médicos
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="tieneEnfermedadesCronicas"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">¿Tiene enfermedades crónicas?</FormLabel>
                <FormDescription>
                  Indique si el paciente tiene enfermedades crónicas conocidas
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

        <FormField
          control={form.control}
          name="antecedents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Antecedentes específicos</FormLabel>
              <FormControl>
                <AntecedentSelector
                  value={field.value || []}
                  onChange={field.onChange}
                  disabled={!canEdit}
                />
              </FormControl>
              <FormDescription>
                Seleccione antecedentes del catálogo o agregue personalizados
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expuestoHumoTabaco"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Expuesto a humo de tabaco</FormLabel>
                <FormDescription>
                  Relevante especialmente para pacientes pediátricos
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                  disabled={!canEdit}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bruxismo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bruxismo</FormLabel>
                <FormDescription>
                  Rechinar o apretar los dientes
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value || false}
                  onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                  disabled={!canEdit}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="higieneCepilladosDia"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cepillados por día</FormLabel>
                <FormControl>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={field.value || ""}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : null
                      field.onChange(value && value >= 0 && value <= 10 ? value : null)
                    }}
                    disabled={!canEdit}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="usaHiloDental"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm">Usa hilo dental</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={field.value || false}
                    onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                    disabled={!canEdit}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

