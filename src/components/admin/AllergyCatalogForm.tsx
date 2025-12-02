"use client"

import { useEffect, useState } from "react"
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
  fetchAllergyCatalog,
  createAllergyCatalog,
  updateAllergyCatalog,
  type AllergyCatalogCreateBody,
  type AllergyCatalogUpdateBody,
} from "@/lib/api/allergies"
import { toast } from "sonner"

const allergyCatalogFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean(),
})

type AllergyCatalogFormValues = z.infer<typeof allergyCatalogFormSchema>

interface AllergyCatalogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allergyId?: number
  onSuccess: () => void
}

export default function AllergyCatalogForm({
  open,
  onOpenChange,
  allergyId,
  onSuccess,
}: AllergyCatalogFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAllergy, setIsLoadingAllergy] = useState(false)
  const [referenceCount, setReferenceCount] = useState(0)
  const isEditing = !!allergyId

  const form = useForm<AllergyCatalogFormValues>({
    resolver: zodResolver(allergyCatalogFormSchema),
    defaultValues: {
      name: "",
      description: null,
      isActive: true,
    },
  })

  // Cargar datos de la alergia si está editando
  useEffect(() => {
    if (open && allergyId && isEditing) {
      setIsLoadingAllergy(true)
      fetchAllergyCatalog(allergyId)
        .then((allergy) => {
          setReferenceCount(allergy.referenceCount)
          form.reset({
            name: allergy.name,
            description: allergy.description,
            isActive: allergy.isActive,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar alergia")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingAllergy(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        name: "",
        description: null,
        isActive: true,
      })
      setReferenceCount(0)
    }
  }, [open, allergyId, isEditing, form, onOpenChange])

  const onSubmit = async (values: AllergyCatalogFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && allergyId) {
        const updateData: AllergyCatalogUpdateBody = {
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await updateAllergyCatalog(allergyId, updateData)
      } else {
        const createData: AllergyCatalogCreateBody = {
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await createAllergyCatalog(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar alergia"

      // Handle duplicate name error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("name", {
          type: "manual",
          message: "Ya existe una alergia con ese nombre",
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar alergia" : "Nueva alergia"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la alergia."
              : "Completa el formulario para crear una nueva alergia."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingAllergy ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando alergia...</div>
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
                      <Input placeholder="Ej: Penicilina" {...field} />
                    </FormControl>
                    <FormDescription>Nombre descriptivo de la alergia</FormDescription>
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
                        placeholder="Descripción opcional de la alergia..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Descripción detallada de la alergia (opcional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && referenceCount > 0 && (
                <div className="rounded-lg border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
                  Esta alergia está siendo utilizada en {referenceCount} alergia(s) de paciente(s).
                </div>
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado</FormLabel>
                      <FormDescription>
                        Las alergias inactivas no estarán disponibles para seleccionar en nuevas alergias de pacientes
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
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

