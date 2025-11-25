// src/app/(dashboard)/pacientes/[id]/_components/anamnesis/AnamnesisQuickEditForm.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ExternalLink, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { PatientAnamnesisDTO } from "@/types/patient"

const quickEditSchema = z.object({
  motivoConsulta: z.string().max(500).optional().nullable(),
  tieneDolorActual: z.boolean(),
  dolorIntensidad: z.number().min(0).max(10).optional().nullable(),
  urgenciaPercibida: z.enum(["RUTINA", "PRIORITARIO", "URGENCIA"]).optional().nullable(),
  tieneEnfermedadesCronicas: z.boolean(),
  tieneAlergias: z.boolean(),
  tieneMedicacionActual: z.boolean(),
})

type QuickEditFormData = z.infer<typeof quickEditSchema>

interface AnamnesisQuickEditFormProps {
  patientId: number
  initialData: PatientAnamnesisDTO | null
  onSave: () => void
  onCancel: () => void
}

export function AnamnesisQuickEditForm({
  patientId,
  initialData,
  onSave,
  onCancel,
}: AnamnesisQuickEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<QuickEditFormData>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      motivoConsulta: initialData?.motivoConsulta || "",
      tieneDolorActual: initialData?.tieneDolorActual || false,
      dolorIntensidad: initialData?.dolorIntensidad || null,
      urgenciaPercibida: initialData?.urgenciaPercibida || null,
      tieneEnfermedadesCronicas: initialData?.tieneEnfermedadesCronicas || false,
      tieneAlergias: initialData?.tieneAlergias || false,
      tieneMedicacionActual: initialData?.tieneMedicacionActual || false,
    },
  })

  const onSubmit = async (data: QuickEditFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/pacientes/${patientId}/anamnesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          // Include other required fields from initialData to maintain consistency
          bruxismo: initialData?.bruxismo ?? null,
          higieneCepilladosDia: initialData?.higieneCepilladosDia ?? null,
          usaHiloDental: initialData?.usaHiloDental ?? null,
          ultimaVisitaDental: initialData?.ultimaVisitaDental ?? null,
          expuestoHumoTabaco: initialData?.expuestoHumoTabaco ?? null,
          tieneHabitosSuccion: initialData?.tieneHabitosSuccion ?? null,
          lactanciaRegistrada: initialData?.lactanciaRegistrada ?? null,
          embarazada: initialData?.embarazada ?? null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al guardar anamnesis")
      }

      toast.success("Anamnesis actualizada correctamente")
      onSave()
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      toast.error(error instanceof Error ? error.message : "Error al guardar anamnesis")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFullEdit = () => {
    router.push(`/agenda/citas?patientId=${patientId}&action=edit-anamnesis`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta es una edición rápida con los campos más frecuentemente modificados. Para editar todos los campos,
            use la edición completa.
          </AlertDescription>
        </Alert>

        {/* Motivo de Consulta */}
        <FormField
          control={form.control}
          name="motivoConsulta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de Consulta</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describa el motivo de la consulta..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>Máximo 500 caracteres</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dolor Actual */}
        <FormField
          control={form.control}
          name="tieneDolorActual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿Tiene dolor actual?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === "true")}
                  value={field.value ? "true" : "false"}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="dolor-si" />
                    <Label htmlFor="dolor-si">Sí</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="dolor-no" />
                    <Label htmlFor="dolor-no">No</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Intensidad del Dolor */}
        {form.watch("tieneDolorActual") && (
          <FormField
            control={form.control}
            name="dolorIntensidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intensidad del dolor: {field.value ?? 0}/10</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={10}
                    step={1}
                    value={[field.value ?? 0]}
                    onValueChange={([value]) => field.onChange(value)}
                    className="w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Urgencia Percibida */}
        <FormField
          control={form.control}
          name="urgenciaPercibida"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Urgencia Percibida</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="RUTINA" id="urgencia-rutina" />
                    <Label htmlFor="urgencia-rutina">Rutina</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PRIORITARIO" id="urgencia-prioritario" />
                    <Label htmlFor="urgencia-prioritario">Prioritario</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="URGENCIA" id="urgencia-urgencia" />
                    <Label htmlFor="urgencia-urgencia">Urgencia</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Flags principales */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="tieneEnfermedadesCronicas"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enfermedades Crónicas</FormLabel>
                  <FormDescription>¿Tiene enfermedades crónicas?</FormDescription>
                </div>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="cronicas-si" />
                      <Label htmlFor="cronicas-si">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="cronicas-no" />
                      <Label htmlFor="cronicas-no">No</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tieneAlergias"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Alergias</FormLabel>
                  <FormDescription>¿Tiene alergias conocidas?</FormDescription>
                </div>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="alergias-si" />
                      <Label htmlFor="alergias-si">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="alergias-no" />
                      <Label htmlFor="alergias-no">No</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tieneMedicacionActual"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Medicación Actual</FormLabel>
                  <FormDescription>¿Está tomando medicamentos actualmente?</FormDescription>
                </div>
                <FormControl>
                  <RadioGroup
                    onValueChange={(value) => field.onChange(value === "true")}
                    value={field.value ? "true" : "false"}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="medicacion-si" />
                      <Label htmlFor="medicacion-si">Sí</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="medicacion-no" />
                      <Label htmlFor="medicacion-no">No</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleFullEdit}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Edición Completa
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}

