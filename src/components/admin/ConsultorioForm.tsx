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
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  fetchConsultorio,
  createConsultorio,
  updateConsultorio,
  type ConsultorioCreateInput,
  type ConsultorioUpdateInput,
} from "@/lib/api/consultorios"
import { toast } from "sonner"

const consultorioFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre no puede exceder 100 caracteres"),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "El color debe ser un código hexadecimal válido (ej: #FF5733)")
    .optional()
    .nullable(),
  activo: z.boolean().default(true),
})

type ConsultorioFormValues = z.input<typeof consultorioFormSchema>

interface ConsultorioFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultorioId?: number
  onSuccess: () => void
}

export default function ConsultorioForm({
  open,
  onOpenChange,
  consultorioId,
  onSuccess,
}: ConsultorioFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingConsultorio, setIsLoadingConsultorio] = useState(false)
  const isEditing = !!consultorioId

  const form = useForm<ConsultorioFormValues>({
    resolver: zodResolver(consultorioFormSchema),
    defaultValues: {
      nombre: "",
      colorHex: null,
      activo: true,
    },
  })

  // Cargar datos del consultorio si está editando
  useEffect(() => {
    if (open && consultorioId && isEditing) {
      setIsLoadingConsultorio(true)
      fetchConsultorio(consultorioId)
        .then((consultorio) => {
          form.reset({
            nombre: consultorio.nombre,
            colorHex: consultorio.colorHex,
            activo: consultorio.activo,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar consultorio")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingConsultorio(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        nombre: "",
        colorHex: null,
        activo: true,
      })
    }
  }, [open, consultorioId, isEditing, form, onOpenChange])

  const onSubmit = async (values: ConsultorioFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && consultorioId) {
        const updateData: ConsultorioUpdateInput = {
          nombre: values.nombre,
          colorHex: values.colorHex ?? null,
          activo: values.activo ?? true,
        }
        await updateConsultorio(consultorioId, updateData)
      } else {
        const createData: ConsultorioCreateInput = {
          nombre: values.nombre,
          colorHex: values.colorHex ?? null,
          activo: values.activo ?? true,
        }
        await createConsultorio(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar consultorio"

      // Handle duplicate nombre error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("nombre", {
          type: "manual",
          message: "Ya existe un consultorio con ese nombre",
        })
      } else if (errorMessage.includes("citas futuras")) {
        form.setError("activo", {
          type: "manual",
          message: errorMessage,
        })
        toast.error(errorMessage)
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
          <DialogTitle>{isEditing ? "Editar consultorio" : "Nuevo consultorio"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del consultorio."
              : "Completa el formulario para crear un nuevo consultorio."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingConsultorio ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando consultorio...</div>
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
                      <Input placeholder="Ej: Consultorio 1" {...field} />
                    </FormControl>
                    <FormDescription>Nombre único del consultorio (sala de atención)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="colorHex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color (hexadecimal)</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="color"
                          className="h-10 w-20 cursor-pointer"
                          {...field}
                          value={field.value || "#3B82F6"}
                          onChange={(e) => {
                            field.onChange(e.target.value)
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <Input
                          placeholder="#FF5733"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === "") {
                              field.onChange(null)
                            } else {
                              field.onChange(value)
                            }
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      Color usado en la agenda para identificar este consultorio (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado</FormLabel>
                      <FormDescription>
                        Los consultorios inactivos no estarán disponibles para nuevas citas
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

