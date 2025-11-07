"use client"

import type { UseFormReturn } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Pill, FileText, StickyNote } from "lucide-react"
import { PacienteCreateDTOClient } from "@/lib/schema/paciente.schema"

interface Step3ClinicosProps {
  form: UseFormReturn<PacienteCreateDTOClient>
}

export function Step3Clinicos({ form }: Step3ClinicosProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Datos Clínicos</h2>
        <p className="text-muted-foreground mt-1">
          Información médica relevante del paciente (opcional pero recomendado)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Alergias
          </CardTitle>
          <CardDescription>
            Registre cualquier alergia conocida (medicamentos, alimentos, materiales dentales, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="alergias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alergias conocidas</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="alergias"
                    placeholder="Ej: Penicilina, látex, anestesia local..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pill className="h-5 w-5 text-primary" />
            Medicación Actual
          </CardTitle>
          <CardDescription>Medicamentos que el paciente está tomando actualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="medicacion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medicamentos actuales</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="medicacion"
                    placeholder="Ej: Aspirina 100mg (1 vez al día), Losartán 50mg..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Antecedentes Médicos
          </CardTitle>
          <CardDescription>Historial médico relevante (enfermedades crónicas, cirugías previas, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="antecedentes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antecedentes médicos</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="antecedentes"
                    placeholder="Ej: Diabetes tipo 2, hipertensión, cirugía cardíaca (2020)..."
                    className="min-h-[120px] resize-none"
                    maxLength={1000}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/1000 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StickyNote className="h-5 w-5 text-primary" />
            Observaciones
          </CardTitle>
          <CardDescription>Notas adicionales sobre el paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones generales</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="observaciones"
                    placeholder="Cualquier información adicional relevante..."
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0}/500 caracteres</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
