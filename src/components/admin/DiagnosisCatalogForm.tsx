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
  fetchDiagnosisCatalog,
  createDiagnosisCatalog,
  updateDiagnosisCatalog,
  type DiagnosisCatalogCreateBody,
  type DiagnosisCatalogUpdateBody,
} from "@/lib/api/diagnosis-catalog"
import { toast } from "sonner"

const diagnosisCatalogFormSchema = z.object({
  code: z.string().min(1, "El código es requerido").max(50, "El código no puede exceder 50 caracteres"),
  name: z.string().min(1, "El nombre es requerido").max(255, "El nombre no puede exceder 255 caracteres"),
  description: z.string().max(1000, "La descripción no puede exceder 1000 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
})

type DiagnosisCatalogFormValues = z.infer<typeof diagnosisCatalogFormSchema>

interface DiagnosisCatalogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  diagnosisId?: number
  onSuccess: () => void
}

export default function DiagnosisCatalogForm({
  open,
  onOpenChange,
  diagnosisId,
  onSuccess,
}: DiagnosisCatalogFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState(false)
  const [referenceCount, setReferenceCount] = useState(0)
  const isEditing = !!diagnosisId

  const form = useForm<DiagnosisCatalogFormValues>({
    resolver: zodResolver(diagnosisCatalogFormSchema),
    defaultValues: {
      code: "",
      name: "",
      description: null,
      isActive: true,
    },
  })

  // Cargar datos del diagnóstico si está editando
  useEffect(() => {
    if (open && diagnosisId && isEditing) {
      setIsLoadingDiagnosis(true)
      fetchDiagnosisCatalog(diagnosisId)
        .then((diagnosis) => {
          setReferenceCount(diagnosis.referenceCount)
          form.reset({
            code: diagnosis.code,
            name: diagnosis.name,
            description: diagnosis.description,
            isActive: diagnosis.isActive,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar diagnóstico")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingDiagnosis(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        code: "",
        name: "",
        description: null,
        isActive: true,
      })
      setReferenceCount(0)
    }
  }, [open, diagnosisId, isEditing, form, onOpenChange])

  const onSubmit = async (values: DiagnosisCatalogFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing && diagnosisId) {
        const updateData: DiagnosisCatalogUpdateBody = {
          // Only allow code update if no references exist
          code: referenceCount === 0 ? values.code : undefined,
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await updateDiagnosisCatalog(diagnosisId, updateData)
      } else {
        const createData: DiagnosisCatalogCreateBody = {
          code: values.code,
          name: values.name,
          description: values.description ?? null,
          isActive: values.isActive,
        }
        await createDiagnosisCatalog(createData)
      }
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar diagnóstico"
      
      // Handle duplicate code error
      if (errorMessage.includes("ya existe") || errorMessage.includes("Ya existe")) {
        form.setError("code", {
          type: "manual",
          message: "Ya existe un diagnóstico con ese código",
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
            {isEditing ? "Editar diagnóstico" : "Nuevo diagnóstico"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del diagnóstico."
              : "Completa el formulario para crear un nuevo diagnóstico."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDiagnosis ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando diagnóstico...</div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: K02.0"
                        {...field}
                        disabled={isEditing && referenceCount > 0}
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing && referenceCount > 0
                        ? "El código actúa como identificador estable. No se puede modificar porque está siendo utilizado en diagnósticos de pacientes."
                        : "Código único del diagnóstico (ej: ICD-10 o código interno). El código actúa como identificador estable. No se recomienda modificarlo después de la creación."}
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
                      <Input placeholder="Ej: Caries dental" {...field} />
                    </FormControl>
                    <FormDescription>
                      Nombre descriptivo del diagnóstico
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
                        placeholder="Descripción opcional del diagnóstico..."
                        className="resize-none"
                        rows={4}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Descripción detallada del diagnóstico (opcional)
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
                        Los diagnósticos inactivos no estarán disponibles para seleccionar en nuevos diagnósticos de pacientes
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

