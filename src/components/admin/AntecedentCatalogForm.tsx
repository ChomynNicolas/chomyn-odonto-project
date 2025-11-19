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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  fetchAntecedentCatalog,
  createAntecedentCatalog,
  updateAntecedentCatalog,
  type AntecedentCatalogCreateBody,
  type AntecedentCatalogUpdateBody,
} from "@/lib/api/antecedent-catalog"
import { toast } from "sonner"
import type { AntecedentCategory } from "@/app/api/antecedent-catalog/_schemas"

const CATEGORY_LABELS: Record<AntecedentCategory, string> = {
  CARDIOVASCULAR: "Cardiovascular",
  ENDOCRINE: "Endocrino",
  RESPIRATORY: "Respiratorio",
  GASTROINTESTINAL: "Gastrointestinal",
  NEUROLOGICAL: "Neurológico",
  SURGICAL_HISTORY: "Historial Quirúrgico",
  SMOKING: "Tabaquismo",
  ALCOHOL: "Alcohol",
  OTHER: "Otro",
}

const antecedentCatalogFormSchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  category: z.enum([
    "CARDIOVASCULAR",
    "ENDOCRINE",
    "RESPIRATORY",
    "GASTROINTESTINAL",
    "NEUROLOGICAL",
    "SURGICAL_HISTORY",
    "SMOKING",
    "ALCOHOL",
    "OTHER",
  ]),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

type AntecedentCatalogFormValues = z.infer<typeof antecedentCatalogFormSchema>

interface AntecedentCatalogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  antecedentId?: number
  onSuccess: () => void
}

export default function AntecedentCatalogForm({
  open,
  onOpenChange,
  antecedentId,
  onSuccess,
}: AntecedentCatalogFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAntecedent, setIsLoadingAntecedent] = useState(false)
  const [referenceCount, setReferenceCount] = useState(0)
  const [createdAt, setCreatedAt] = useState<Date | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const isEditing = !!antecedentId

  const form = useForm<AntecedentCatalogFormValues>({
    resolver: zodResolver(antecedentCatalogFormSchema),
    defaultValues: {
      code: "",
      name: "",
      category: "OTHER",
      description: null,
      isActive: true,
    },
  })

  // Cargar datos del antecedente si está editando
  useEffect(() => {
    if (open && antecedentId && isEditing) {
      setIsLoadingAntecedent(true)
      fetchAntecedentCatalog(antecedentId)
        .then((antecedent) => {
          setReferenceCount(antecedent.referenceCount)
          setCreatedAt(antecedent.createdAt)
          setUpdatedAt(antecedent.updatedAt)
          form.reset({
            code: antecedent.code,
            name: antecedent.name,
            category: antecedent.category,
            description: antecedent.description,
            isActive: antecedent.isActive,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar antecedente")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingAntecedent(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        code: "",
        name: "",
        category: "OTHER",
        description: null,
        isActive: true,
      })
      setReferenceCount(0)
      setCreatedAt(null)
      setUpdatedAt(null)
    }
  }, [open, antecedentId, isEditing, form, onOpenChange])

  const onSubmit = async (values: AntecedentCatalogFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && antecedentId) {
        const updateData: AntecedentCatalogUpdateBody = {
          // Only allow code update if no references exist
          code: referenceCount === 0 ? values.code : undefined,
          name: values.name,
          category: values.category,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await updateAntecedentCatalog(antecedentId, updateData)
      } else {
        const createData: AntecedentCatalogCreateBody = {
          code: values.code,
          name: values.name,
          category: values.category,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await createAntecedentCatalog(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar antecedente"
      
      // Handle duplicate code error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("code", {
          type: "manual",
          message: "Ya existe un antecedente con ese código",
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
            {isEditing ? "Editar antecedente" : "Nuevo antecedente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del antecedente."
              : "Completa el formulario para crear un nuevo antecedente."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingAntecedent ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando antecedente...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isEditing && (
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">ID:</span> {antecedentId}
                  </div>
                  {createdAt && (
                    <div>
                      <span className="font-medium">Creado:</span> {new Date(createdAt).toLocaleDateString()}
                    </div>
                  )}
                  {updatedAt && (
                    <div className="col-span-2">
                      <span className="font-medium">Actualizado:</span> {new Date(updatedAt).toLocaleDateString()}
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
                        placeholder="Ej: HYPERTENSION"
                        {...field}
                        disabled={isEditing && referenceCount > 0}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing && referenceCount > 0
                        ? "El código actúa como identificador estable. No se puede modificar porque está siendo utilizado en anamnesis."
                        : "Código único del antecedente. El código actúa como identificador estable. No se recomienda modificarlo después de la creación."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Hipertensión arterial" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre descriptivo del antecedente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categoría médica del antecedente
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
                        placeholder="Descripción opcional del antecedente..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción detallada del antecedente (opcional)
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
                        Los antecedentes inactivos no estarán disponibles para seleccionar en nuevas anamnesis pero permanecerán en registros históricos
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

