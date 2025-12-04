"use client"

import { useEffect, useState, useCallback } from "react"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2, Save } from "lucide-react"
import {
  fetchTreatmentPlanCatalog,
  createTreatmentPlanCatalog,
  updateTreatmentPlanCatalog,
  type TreatmentPlanCatalogCreateBody,
  type TreatmentPlanCatalogUpdateBody,
} from "@/lib/api/treatment-plan-catalog"
import { toast } from "sonner"
import { DienteSuperficie } from "@prisma/client"

const DienteSuperficieSchema = z.nativeEnum(DienteSuperficie)

const stepSchema = z.object({
  order: z.number().int().positive(),
  procedureId: z.number().int().positive().nullable().optional(),
  serviceType: z.string().max(200).nullable().optional(),
  toothNumber: z
    .number()
    .int()
    .refine((n) => (n >= 1 && n <= 32) || (n >= 51 && n <= 85), {
      message: "toothNumber debe estar entre 1-32 o 51-85",
    })
    .nullable()
    .optional(),
  toothSurface: DienteSuperficieSchema.nullable().optional(),
  estimatedDurationMin: z.number().int().positive().nullable().optional(),
  estimatedCostCents: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  requiresMultipleSessions: z.boolean().optional(),
  totalSessions: z.number().int().min(2).max(10).nullable().optional(),
  currentSession: z.number().int().positive().nullable().optional(),
})

const treatmentPlanCatalogFormSchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  nombre: z.string().min(1, "El nombre es requerido").max(200, "El nombre no puede exceder 200 caracteres"),
  descripcion: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
  steps: z.array(stepSchema).min(1, "Debe haber al menos un paso en el plan"),
})

type TreatmentPlanCatalogFormValues = z.input<typeof treatmentPlanCatalogFormSchema>

interface TreatmentPlanCatalogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogId?: number
  onSuccess: () => void
}

interface ProcedimientoCatalogoDTO {
  id: number
  code: string
  nombre: string
  descripcion: string | null
  defaultPriceCents: number | null
  aplicaDiente: boolean
  aplicaSuperficie: boolean
}

export default function TreatmentPlanCatalogForm({
  open,
  onOpenChange,
  catalogId,
  onSuccess,
}: TreatmentPlanCatalogFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [catalogOptions, setCatalogOptions] = useState<ProcedimientoCatalogoDTO[]>([])
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const isEditing = !!catalogId

  const form = useForm<TreatmentPlanCatalogFormValues>({
    resolver: zodResolver(treatmentPlanCatalogFormSchema),
    defaultValues: {
      code: "",
      nombre: "",
      descripcion: null,
      isActive: true,
      steps: [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "steps",
  })

  const loadCatalog = useCallback(async () => {
    try {
      setIsLoadingCatalog(true)
      const res = await fetch("/api/procedimientos/catalogo?activo=true")
      if (!res.ok) throw new Error("Error al cargar catálogo")
      const data = await res.json()
      if (data.ok) {
        setCatalogOptions(data.data)
      }
    } catch (error) {
      console.error("Error loading catalog:", error)
      toast.error("Error al cargar catálogo de procedimientos")
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [])

  // Cargar datos del catálogo si está editando
  useEffect(() => {
    if (open && catalogId && isEditing) {
      setIsLoading(true)
      fetchTreatmentPlanCatalog(catalogId)
        .then((catalog) => {
          form.reset({
            code: catalog.code,
            nombre: catalog.nombre,
            descripcion: catalog.descripcion,
            isActive: catalog.isActive,
            steps: catalog.steps.map((step) => ({
              order: step.order,
              procedureId: step.procedureId,
              serviceType: step.serviceType,
              toothNumber: step.toothNumber,
              toothSurface: step.toothSurface,
              estimatedDurationMin: step.estimatedDurationMin,
              estimatedCostCents: step.estimatedCostCents,
              priority: step.priority,
              notes: step.notes,
              requiresMultipleSessions: step.requiresMultipleSessions,
              totalSessions: step.totalSessions,
              currentSession: step.currentSession,
            })),
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar plan de tratamiento")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        code: "",
        nombre: "",
        descripcion: null,
        isActive: true,
        steps: [],
      })
    }

    if (open) {
      loadCatalog()
    }
  }, [open, catalogId, isEditing, form, onOpenChange, loadCatalog])

  const handleAddStep = () => {
    const currentSteps = form.getValues("steps")
    const newOrder = currentSteps.length > 0 ? Math.max(...currentSteps.map((s) => s.order)) + 1 : 1
    append({
      order: newOrder,
      procedureId: null,
      serviceType: "",
      toothNumber: null,
      toothSurface: null,
      estimatedDurationMin: null,
      estimatedCostCents: null,
      priority: null,
      notes: "",
      requiresMultipleSessions: false,
      totalSessions: null,
      currentSession: 1,
    })
    setEditingStepIndex(currentSteps.length)
  }

  const handleDeleteStep = (index: number) => {
    remove(index)
    const currentSteps = form.getValues("steps")
    // Reorder steps
    currentSteps.forEach((step, i) => {
      if (i >= index) {
        update(i, { ...step, order: i + 1 })
      }
    })
    setEditingStepIndex(null)
  }

  const handleCatalogSelect = (index: number, catalogId: string) => {
    if (!catalogId || catalogId === "__none__") {
      const currentStep = form.getValues(`steps.${index}`)
      form.setValue(`steps.${index}`, {
        ...currentStep,
        procedureId: null,
        serviceType: "",
        toothNumber: null,
        toothSurface: null,
      })
      return
    }

    const id = Number.parseInt(catalogId, 10)
    const catalogItem = catalogOptions.find((item) => item.id === id)
    if (!catalogItem) return

    const currentStep = form.getValues(`steps.${index}`)
    form.setValue(`steps.${index}`, {
      ...currentStep,
      procedureId: id,
      serviceType: catalogItem.nombre,
      toothNumber: catalogItem.aplicaDiente ? currentStep.toothNumber : null,
      toothSurface: catalogItem.aplicaSuperficie ? currentStep.toothSurface : null,
    })
  }

  const onSubmit = async (values: TreatmentPlanCatalogFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && catalogId) {
        const updateData: TreatmentPlanCatalogUpdateBody = {
          code: values.code,
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          isActive: values.isActive,
          steps: values.steps.map((step) => ({
            id: undefined, // New steps don't have IDs
            order: step.order,
            procedureId: step.procedureId ?? null,
            serviceType: step.serviceType ?? null,
            toothNumber: step.toothNumber ?? null,
            toothSurface: step.toothSurface ?? null,
            estimatedDurationMin: step.estimatedDurationMin ?? null,
            estimatedCostCents: step.estimatedCostCents ?? null,
            priority: step.priority ?? null,
            notes: step.notes ?? null,
            requiresMultipleSessions: step.requiresMultipleSessions ?? false,
            totalSessions: step.totalSessions ?? null,
            currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
          })),
        }
        await updateTreatmentPlanCatalog(catalogId, updateData)
      } else {
        const createData: TreatmentPlanCatalogCreateBody = {
          code: values.code,
          nombre: values.nombre,
          descripcion: values.descripcion ?? null,
          isActive: values.isActive ?? true,
          steps: values.steps.map((step) => ({
            order: step.order,
            procedureId: step.procedureId ?? null,
            serviceType: step.serviceType ?? null,
            toothNumber: step.toothNumber ?? null,
            toothSurface: step.toothSurface ?? null,
            estimatedDurationMin: step.estimatedDurationMin ?? null,
            estimatedCostCents: step.estimatedCostCents ?? null,
            priority: step.priority ?? null,
            notes: step.notes ?? null,
            requiresMultipleSessions: step.requiresMultipleSessions ?? false,
            totalSessions: step.totalSessions ?? null,
            currentSession: step.currentSession ?? (step.requiresMultipleSessions ? 1 : null),
          })),
        }
        await createTreatmentPlanCatalog(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar plan de tratamiento"
      
      // Handle duplicate code error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("code", {
          type: "manual",
          message: "Ya existe un plan de tratamiento con ese código",
        })
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const steps = form.watch("steps")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar plan de tratamiento" : "Nuevo plan de tratamiento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del plan de tratamiento."
              : "Completa el formulario para crear un nuevo plan de tratamiento."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando plan de tratamiento...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: PLAN-001"
                        {...field}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      Código único del plan de tratamiento
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
                      <Input placeholder="Ej: Plan de tratamiento inicial" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre descriptivo del plan de tratamiento
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
                        placeholder="Descripción opcional del plan..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción detallada del plan de tratamiento (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Steps List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Pasos del Plan *</Label>
                  <Button type="button" onClick={handleAddStep} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Paso
                  </Button>
                </div>

                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay pasos agregados. Haga clic en &quot;Agregar Paso&quot; para comenzar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const step = steps[index]
                      const isEditing = editingStepIndex === index
                      return (
                        <Card key={field.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">Paso #{step?.order || index + 1}</CardTitle>
                              <div className="flex gap-2">
                                {isEditing ? (
                                  <Button
                                    type="button"
                                    onClick={() => setEditingStepIndex(null)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Guardar
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    onClick={() => setEditingStepIndex(index)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  onClick={() => handleDeleteStep(index)}
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {isEditing ? (
                            <CardContent className="space-y-4">
                              {/* Catalog Selector */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.procedureId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Procedimiento del Catálogo <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <Select
                                      value={field.value?.toString() || "__none__"}
                                      onValueChange={(value) => handleCatalogSelect(index, value)}
                                      disabled={isLoadingCatalog}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder={isLoadingCatalog ? "Cargando..." : "Seleccionar procedimiento..."} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="__none__">Entrada manual</SelectItem>
                                        {catalogOptions.map((item) => (
                                          <SelectItem key={item.id} value={item.id.toString()}>
                                            {item.code} - {item.nombre}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Service Type */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.serviceType`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Tipo de Procedimiento{" "}
                                      {!step?.procedureId && <span className="text-destructive">*</span>}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ej: Obturación, Limpieza, Endodoncia..."
                                        {...field}
                                        value={field.value ?? ""}
                                        disabled={!!step?.procedureId}
                                        className={step?.procedureId ? "bg-muted" : ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Tooth Number */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.toothNumber`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Número de Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        max="85"
                                        placeholder="1-32 o 51-85"
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                                        disabled={
                                          step?.procedureId
                                            ? !catalogOptions.find((item) => item.id === step.procedureId)?.aplicaDiente
                                            : false
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Tooth Surface */}
                              {(step?.procedureId
                                ? catalogOptions.find((item) => item.id === step.procedureId)?.aplicaSuperficie
                                : step?.toothNumber) && (
                                <FormField
                                  control={form.control}
                                  name={`steps.${index}.toothSurface`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Superficie del Diente <span className="text-muted-foreground text-xs">(opcional)</span>
                                      </FormLabel>
                                      <Select
                                        value={field.value || "__none__"}
                                        onValueChange={(value) =>
                                          field.onChange(value === "__none__" ? null : (value as DienteSuperficie))
                                        }
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar superficie..." />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="__none__">Sin superficie</SelectItem>
                                          {Object.values(DienteSuperficie).map((surface) => (
                                            <SelectItem key={surface} value={surface}>
                                              {surface}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              {/* Priority */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.priority`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Prioridad <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <Select
                                      value={field.value?.toString() || "__none__"}
                                      onValueChange={(value) =>
                                        field.onChange(value === "__none__" ? null : Number.parseInt(value, 10))
                                      }
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Seleccionar prioridad..." />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="__none__">Sin prioridad</SelectItem>
                                        <SelectItem value="1">1 - Muy Alta</SelectItem>
                                        <SelectItem value="2">2 - Alta</SelectItem>
                                        <SelectItem value="3">3 - Media</SelectItem>
                                        <SelectItem value="4">4 - Baja</SelectItem>
                                        <SelectItem value="5">5 - Muy Baja</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Multiple Sessions */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.requiresMultipleSessions`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                      <FormLabel className="text-base">Requiere múltiples sesiones</FormLabel>
                                    </div>
                                    <FormControl>
                                      <Switch
                                        checked={field.value ?? false}
                                        onCheckedChange={(checked) => {
                                          field.onChange(checked)
                                          if (checked) {
                                            form.setValue(`steps.${index}.totalSessions`, 2)
                                            form.setValue(`steps.${index}.currentSession`, 1)
                                          } else {
                                            form.setValue(`steps.${index}.totalSessions`, null)
                                            form.setValue(`steps.${index}.currentSession`, null)
                                          }
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              {step?.requiresMultipleSessions && (
                                <FormField
                                  control={form.control}
                                  name={`steps.${index}.totalSessions`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>
                                        Total de Sesiones <span className="text-destructive">*</span>
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={2}
                                          max={10}
                                          placeholder="Ej: 3"
                                          {...field}
                                          value={field.value ?? ""}
                                          onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}

                              {/* Estimated Duration */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.estimatedDurationMin`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Duración Estimada (minutos) <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="1"
                                        placeholder="Ej: 30"
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Estimated Cost */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.estimatedCostCents`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Costo Estimado (guaraníes) <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="Ej: 50000"
                                        {...field}
                                        value={field.value ?? ""}
                                        onChange={(e) => field.onChange(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {/* Notes */}
                              <FormField
                                control={form.control}
                                name={`steps.${index}.notes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Notas <span className="text-muted-foreground text-xs">(opcional)</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Notas adicionales sobre este paso..."
                                        rows={3}
                                        {...field}
                                        value={field.value ?? ""}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          ) : (
                            <CardContent>
                              <div className="space-y-2">
                                <p className="font-medium">
                                  {step?.procedureId
                                    ? catalogOptions.find((item) => item.id === step.procedureId)?.nombre || step.serviceType
                                    : step?.serviceType || "Procedimiento sin especificar"}
                                </p>
                                {step?.toothNumber && (
                                  <p className="text-sm text-muted-foreground">
                                    Diente {step.toothNumber}
                                    {step.toothSurface && ` - Superficie: ${step.toothSurface}`}
                                  </p>
                                )}
                                {step?.priority && (
                                  <p className="text-sm text-muted-foreground">
                                    Prioridad: {step.priority}
                                  </p>
                                )}
                                {step?.notes && <p className="text-sm text-muted-foreground">{step.notes}</p>}
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Estado</FormLabel>
                      <FormDescription>
                        Los planes inactivos no estarán disponibles para seleccionar en nuevas consultas
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
                  {isLoading ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? "Actualizar" : "Crear"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

