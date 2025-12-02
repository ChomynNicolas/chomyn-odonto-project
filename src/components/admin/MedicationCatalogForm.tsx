"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  useMedicationCatalog,
  useCreateMedicationCatalog,
  useUpdateMedicationCatalog,
} from "@/hooks/useMedicationCatalog"
import { toast } from "sonner"

const medicationFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

type MedicationFormValues = z.input<typeof medicationFormSchema>

interface MedicationCatalogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  medicationId?: number
  onSuccess: () => void
}

export default function MedicationCatalogForm({
  open,
  onOpenChange,
  medicationId,
  onSuccess,
}: MedicationCatalogFormProps) {
  const isEditing = !!medicationId
  const { data: medication, isLoading: isLoadingMedication } = useMedicationCatalog(
    medicationId ?? null
  )
  const createMutation = useCreateMedicationCatalog()
  const updateMutation = useUpdateMedicationCatalog()

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      name: "",
      description: null,
      isActive: true,
    },
  })

  // Cargar datos del medicamento si está editando
  useEffect(() => {
    if (open && medication && isEditing) {
      form.reset({
        name: medication.name,
        description: medication.description,
        isActive: medication.isActive,
      })
    } else if (open && !isEditing) {
      form.reset({
        name: "",
        description: null,
        isActive: true,
      })
    }
  }, [open, medication, isEditing, form])

  const onSubmit = async (values: MedicationFormValues) => {
    try {
      if (isEditing && medicationId) {
        await updateMutation.mutateAsync({
          id: medicationId,
          data: {
            name: values.name,
            description: values.description ?? null,
            isActive: values.isActive ?? true,
          },
        })
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive ?? true,
        })
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar medicamento"

      // Handle duplicate name error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("name", {
          type: "manual",
          message: "Ya existe un medicamento con ese nombre",
        })
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar medicamento" : "Nuevo medicamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del medicamento."
              : "Completa el formulario para crear un nuevo medicamento."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingMedication ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando medicamento...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Amoxicilina" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre único del medicamento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción opcional del medicamento..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción detallada del medicamento (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado</FormLabel>
                      <FormDescription>
                        Los medicamentos inactivos no estarán disponibles para asignar a pacientes
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

