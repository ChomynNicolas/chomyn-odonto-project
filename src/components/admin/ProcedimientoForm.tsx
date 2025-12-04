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
  getProcedimientoById,
  createProcedimiento,
  updateProcedimiento,
  type ProcedimientoCreateInput,
  type ProcedimientoUpdateInput,
} from "@/lib/api/admin/procedimientos"
import { toast } from "sonner"

const procedimientoFormSchema = z
  .object({
    code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
    nombre: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
    descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
    defaultDurationMin: z
      .number()
      .int()
      .positive("La duración debe ser un número positivo")
      .max(1440, "La duración no puede exceder 1440 minutos (24 horas)")
      .optional()
      .nullable(),
    defaultPriceCents: z
      .number()
      .int()
      .nonnegative("El precio debe ser un número positivo o cero")
      .optional()
      .nullable(),
    aplicaDiente: z.boolean().default(false),
    aplicaSuperficie: z.boolean().default(false),
    activo: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // If aplicaSuperficie is true, aplicaDiente must also be true
      return !data.aplicaSuperficie || data.aplicaDiente
    },
    {
      message: "Si aplica a superficie, debe aplicar a diente",
      path: ["aplicaSuperficie"],
    }
  )

type ProcedimientoFormValues = z.input<typeof procedimientoFormSchema>

interface ProcedimientoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  procedimientoId?: number
  onSuccess: () => void
}

export default function ProcedimientoForm({
  open,
  onOpenChange,
  procedimientoId,
  onSuccess,
}: ProcedimientoFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProcedimiento, setIsLoadingProcedimiento] = useState(false)
  const [canChangeCode, setCanChangeCode] = useState(true)
  const [readOnlyFields, setReadOnlyFields] = useState<{
    idProcedimiento?: number
    createdAt?: string
    updatedAt?: string
  }>({})
  const isEditing = !!procedimientoId

  const form = useForm<ProcedimientoFormValues>({
    resolver: zodResolver(procedimientoFormSchema),
    defaultValues: {
      code: "",
      nombre: "",
      descripcion: null,
      defaultDurationMin: null,
      defaultPriceCents: null,
      aplicaDiente: false,
      aplicaSuperficie: false,
      activo: true,
    },
  })

  // Watch aplicaSuperficie to auto-check aplicaDiente
  const aplicaSuperficie = form.watch("aplicaSuperficie")
  useEffect(() => {
    if (aplicaSuperficie && !form.getValues("aplicaDiente")) {
      form.setValue("aplicaDiente", true)
    }
  }, [aplicaSuperficie, form])

  // Cargar datos del procedimiento si está editando
  useEffect(() => {
    if (open && procedimientoId && isEditing) {
      setIsLoadingProcedimiento(true)
      getProcedimientoById(procedimientoId)
        .then((procedimiento) => {
          setCanChangeCode(procedimiento.canChangeCode)
          setReadOnlyFields({
            idProcedimiento: procedimiento.idProcedimiento,
            createdAt: procedimiento.createdAt,
            updatedAt: procedimiento.updatedAt,
          })
          form.reset({
            code: procedimiento.code,
            nombre: procedimiento.nombre,
            descripcion: procedimiento.descripcion,
            defaultDurationMin: procedimiento.defaultDurationMin,
            defaultPriceCents: procedimiento.defaultPriceCents,
            aplicaDiente: procedimiento.aplicaDiente,
            aplicaSuperficie: procedimiento.aplicaSuperficie,
            activo: procedimiento.activo,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar procedimiento")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingProcedimiento(false)
        })
    } else if (open && !isEditing) {
      setCanChangeCode(true)
      setReadOnlyFields({})
      form.reset({
        code: "",
        nombre: "",
        descripcion: null,
        defaultDurationMin: null,
        defaultPriceCents: null,
        aplicaDiente: false,
        aplicaSuperficie: false,
        activo: true,
      })
    }
  }, [open, procedimientoId, isEditing, form, onOpenChange])

  const onSubmit = async (values: ProcedimientoFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && procedimientoId) {
        const updateData: ProcedimientoUpdateInput = {
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          defaultDurationMin: values.defaultDurationMin ?? null,
          defaultPriceCents: values.defaultPriceCents ?? null,
          aplicaDiente: values.aplicaDiente ?? false,
          aplicaSuperficie: values.aplicaSuperficie ?? false,
          activo: values.activo ?? true,
        }
        // Only include code if it can be changed
        if (canChangeCode && values.code !== form.getValues("code")) {
          updateData.code = values.code
        }
        await updateProcedimiento(procedimientoId, updateData)
      } else {
        const createData: ProcedimientoCreateInput = {
          code: values.code,
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          defaultDurationMin: values.defaultDurationMin ?? null,
          defaultPriceCents: values.defaultPriceCents ?? null,
          aplicaDiente: values.aplicaDiente ?? false,
          aplicaSuperficie: values.aplicaSuperficie ?? false,
          activo: values.activo ?? true,
        }
        await createProcedimiento(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar procedimiento"

      // Handle duplicate code error
      if (errorMessage.includes("código") || errorMessage.includes("Ya existe")) {
        form.setError("code", {
          type: "manual",
          message: "Ya existe un procedimiento con ese código",
        })
      } else if (errorMessage.includes("referencias")) {
        form.setError("code", {
          type: "manual",
          message: "No se puede cambiar el código porque tiene referencias",
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar procedimiento" : "Nuevo procedimiento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del procedimiento. Algunos campos pueden estar deshabilitados si el procedimiento tiene referencias."
              : "Completa el formulario para crear un nuevo procedimiento en el catálogo."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProcedimiento ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando procedimiento...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Read-only fields when editing */}
              {isEditing && readOnlyFields.idProcedimiento && (
                <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">ID:</span> {readOnlyFields.idProcedimiento}
                  </div>
                  {readOnlyFields.createdAt && (
                    <div>
                      <span className="font-medium">Creado:</span>{" "}
                      {new Date(readOnlyFields.createdAt).toLocaleDateString("es-AR")}
                    </div>
                  )}
                  {readOnlyFields.updatedAt && (
                    <div>
                      <span className="font-medium">Actualizado:</span>{" "}
                      {new Date(readOnlyFields.updatedAt).toLocaleDateString("es-AR")}
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: C11, ADA001"
                        {...field}
                        disabled={isEditing && !canChangeCode}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing && !canChangeCode
                        ? "El código no se puede cambiar porque el procedimiento tiene referencias en tratamientos o consultas"
                        : "Código único del procedimiento (similar a código de facturación)"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Limpieza dental, Obturación" {...field} />
                    </FormControl>
                    <FormDescription>Nombre descriptivo del procedimiento</FormDescription>
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
                        placeholder="Descripción opcional del procedimiento..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>Descripción detallada del procedimiento (opcional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultPriceCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio por defecto (guaraníes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseInt(e.target.value, 10)
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Precio por defecto en guaraníes (ej: 350000 = ₲350.000)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultDurationMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración por defecto (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? null : parseInt(e.target.value, 10)
                            field.onChange(value)
                          }}
                        />
                      </FormControl>
                      <FormDescription>Duración estimada en minutos (máx. 1440)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="aplicaDiente"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Aplica a diente</FormLabel>
                      <FormDescription>
                        Indica si este procedimiento se aplica a un diente específico
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                        Los procedimientos inactivos no aparecerán en nuevas selecciones
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

