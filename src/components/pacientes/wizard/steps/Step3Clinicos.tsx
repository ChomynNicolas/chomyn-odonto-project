"use client"

import type { UseFormReturn } from "react-hook-form"
import { FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step3ClinicosProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step3Clinicos({ form }: Step3ClinicosProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Información clínica opcional pero recomendada para un mejor tratamiento
      </p>

      <Collapsible open={openSections.alergias} onOpenChange={() => toggleSection("alergias")}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
          <span className="font-medium">Alergias</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.alergias ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <FormField
            control={form.control}
            name="alergias"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} placeholder="Ej: Penicilina, látex, anestesia local" rows={3} maxLength={500} />
                </FormControl>
                <FormDescription>Incluya alergias a medicamentos, materiales dentales o anestésicos</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.medicacion} onOpenChange={() => toggleSection("medicacion")}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
          <span className="font-medium">Medicación Actual</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.medicacion ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <FormField
            control={form.control}
            name="medicacion"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Ej: Anticoagulantes (Warfarina 5mg/día), Antihipertensivos"
                    rows={3}
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>Liste medicamentos de uso continuo con dosis</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.antecedentes} onOpenChange={() => toggleSection("antecedentes")}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
          <span className="font-medium">Antecedentes Médicos</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.antecedentes ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <FormField
            control={form.control}
            name="antecedentes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Ej: Diabetes tipo 2, hipertensión arterial, cirugías previas"
                    rows={4}
                    maxLength={1000}
                  />
                </FormControl>
                <FormDescription>Enfermedades crónicas, cirugías, hospitalizaciones previas</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      <Collapsible open={openSections.observaciones} onOpenChange={() => toggleSection("observaciones")}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50">
          <span className="font-medium">Observaciones Generales</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${openSections.observaciones ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Cualquier información adicional relevante"
                    rows={3}
                    maxLength={500}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
