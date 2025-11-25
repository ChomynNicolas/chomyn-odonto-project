// src/components/consulta-clinica/modules/anamnesis/sections/MedicalHistorySection.tsx

"use client"

import type { UseFormReturn } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import type { AnamnesisCreateUpdateBody } from "@/app/api/pacientes/[id]/anamnesis/_schemas"
import { Heart, Cigarette, Moon, Brush } from "lucide-react"
import { Input } from "@/components/ui/input"
import { AntecedentSelector } from "../components/AntecedentSelector"
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
    <Card className="section-medical border-l-4 border-l-rose-500 shadow-sm">
      <CardHeader className="pb-6 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950">
              <Heart className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
            Antecedentes Médicos
          </CardTitle>
          <SectionCompletionIndicator isComplete={isComplete} />
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormField
          control={form.control}
          name="tieneEnfermedadesCronicas"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-5 transition-colors hover:bg-muted/50">
              <div className="space-y-1 pr-4">
                <FormLabel className="text-base font-medium">¿Tiene enfermedades crónicas?</FormLabel>
                <FormDescription className="text-sm leading-relaxed">
                  Indique si el paciente tiene enfermedades crónicas conocidas
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="antecedents"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Antecedentes específicos</FormLabel>
              <FormControl>
                <AntecedentSelector value={field.value || []} onChange={field.onChange} disabled={!canEdit} />
              </FormControl>
              <FormDescription className="text-sm leading-relaxed">
                Seleccione antecedentes del catálogo o agregue personalizados
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h3 className="text-base font-medium">Hábitos y Factores de Riesgo</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="expuestoHumoTabaco"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                      <Cigarette className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <FormLabel className="text-sm font-medium cursor-pointer">Expuesto a humo de tabaco</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
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
                <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950">
                      <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <FormLabel className="text-sm font-medium cursor-pointer">Bruxismo</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                      disabled={!canEdit}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-medium flex items-center gap-2">
            <Brush className="h-4 w-4 text-muted-foreground" />
            Higiene Dental
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="higieneCepilladosDia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Cepillados por día</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number.parseInt(e.target.value, 10) : null
                        field.onChange(value && value >= 0 && value <= 10 ? value : null)
                      }}
                      disabled={!canEdit}
                      placeholder="Número de cepillados"
                      className="h-11 text-base"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Frecuencia diaria de cepillado</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="usaHiloDental"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border-2 bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                  <FormLabel className="text-sm font-medium cursor-pointer">Usa hilo dental</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={(checked) => field.onChange(checked ? true : null)}
                      disabled={!canEdit}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
