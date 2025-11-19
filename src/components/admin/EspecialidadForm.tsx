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
  fetchEspecialidad,
  createEspecialidad,
  updateEspecialidad,
  type EspecialidadCreateInput,
  type EspecialidadUpdateInput,
} from "@/lib/api/admin/especialidades"
import { toast } from "sonner"

const especialidadFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

type EspecialidadFormValues = z.infer<typeof especialidadFormSchema>

interface EspecialidadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  especialidadId?: number
  onSuccess: () => void
}

export default function EspecialidadForm({
  open,
  onOpenChange,
  especialidadId,
  onSuccess,
}: EspecialidadFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEspecialidad, setIsLoadingEspecialidad] = useState(false)
  const isEditing = !!especialidadId

  const form = useForm<EspecialidadFormValues>({
    resolver: zodResolver(especialidadFormSchema),
    defaultValues: {
      nombre: "",
      descripcion: null,
      isActive: true,
    },
  })

  // Cargar datos de la especialidad si está editando
  useEffect(() => {
    if (open && especialidadId && isEditing) {
      setIsLoadingEspecialidad(true)
      fetchEspecialidad(especialidadId)
        .then((especialidad) => {
          form.reset({
            nombre: especialidad.nombre,
            descripcion: especialidad.descripcion,
            isActive: especialidad.isActive,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar especialidad")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingEspecialidad(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        nombre: "",
        descripcion: null,
        isActive: true,
      })
    }
  }, [open, especialidadId, isEditing, form, onOpenChange])

  const onSubmit = async (values: EspecialidadFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && especialidadId) {
        const updateData: EspecialidadUpdateInput = {
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          isActive: values.isActive,
        }
        await updateEspecialidad(especialidadId, updateData)
      } else {
        const createData: EspecialidadCreateInput = {
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          isActive: values.isActive,
        }
        await createEspecialidad(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar especialidad"
      
      // Handle duplicate nombre error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("nombre", {
          type: "manual",
          message: "Ya existe una especialidad con ese nombre",
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
          <DialogTitle>
            {isEditing ? "Editar especialidad" : "Nueva especialidad"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos de la especialidad."
              : "Completa el formulario para crear una nueva especialidad."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingEspecialidad ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando especialidad...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Ortodoncia" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre único de la especialidad dental
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción opcional de la especialidad..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción detallada de la especialidad (opcional)
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
                        Las especialidades inactivas no estarán disponibles para asignar a nuevos profesionales
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

