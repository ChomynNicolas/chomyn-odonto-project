"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Code2 } from "lucide-react"
import {
  fetchAnamnesisConfig,
  createAnamnesisConfig,
  updateAnamnesisConfig,
  type AnamnesisConfigCreateInput,
  type AnamnesisConfigUpdateInput,
} from "@/lib/api/anamnesis-config"
import { KNOWN_KEY_SCHEMAS, HIGH_IMPACT_KEYS } from "@/app/api/anamnesis-config/_schemas"
import { toast } from "sonner"

// Form schema - dynamic based on whether we're creating or editing
const createAnamnesisConfigFormSchema = z.object({
  key: z
    .string()
    .min(1, "La clave es requerida")
    .max(100)
    .regex(/^[A-Z0-9_]+$/, "La clave debe contener solo letras mayúsculas, números y guiones bajos"),
  value: z.unknown(),
  description: z.string().max(500).optional().nullable(),
})

const updateAnamnesisConfigFormSchema = z.object({
  value: z.unknown(),
  description: z.string().max(500).optional().nullable(),
})

type CreateAnamnesisConfigFormValues = z.infer<typeof createAnamnesisConfigFormSchema>
type UpdateAnamnesisConfigFormValues = z.infer<typeof updateAnamnesisConfigFormSchema>

interface AnamnesisConfigFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configId?: number
  onSuccess: () => void
}

export default function AnamnesisConfigForm({
  open,
  onOpenChange,
  configId,
  onSuccess,
}: AnamnesisConfigFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!configId
  const [useJsonEditor, setUseJsonEditor] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null)

  // Fetch config if editing
  const { data: configData, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["anamnesis-config", configId],
    queryFn: () => fetchAnamnesisConfig(configId!),
    enabled: isEditing && open && !!configId,
  })

  const config = configData?.data
  const isHighImpact = config ? (HIGH_IMPACT_KEYS as readonly string[]).includes(config.key) : false
  const keySchema = config ? KNOWN_KEY_SCHEMAS[config.key] : null
  const isBooleanKey = keySchema === KNOWN_KEY_SCHEMAS.MANDATORY_FIRST_CONSULTATION ||
    keySchema === KNOWN_KEY_SCHEMAS.ALLOW_EDIT_SUBSEQUENT ||
    keySchema === KNOWN_KEY_SCHEMAS.ALERT_IF_SEVERE_ALLERGY

  // Create form with appropriate schema
  const createForm = useForm<CreateAnamnesisConfigFormValues>({
    resolver: zodResolver(createAnamnesisConfigFormSchema),
    defaultValues: {
      key: "",
      value: false,
      description: null,
    },
  })

  const updateForm = useForm<UpdateAnamnesisConfigFormValues>({
    resolver: zodResolver(updateAnamnesisConfigFormSchema),
    defaultValues: {
      value: false,
      description: null,
    },
  })

  // Load config data when editing
  useEffect(() => {
    if (open && config) {
      if (isEditing) {
        updateForm.reset({
          value: config.value,
          description: config.description,
        })
        // Determine if we should use JSON editor based on key type
        setUseJsonEditor(!isBooleanKey)
      } else {
        createForm.reset({
          key: "",
          value: false,
          description: null,
        })
        setUseJsonEditor(false)
      }
    } else if (open && !isEditing) {
      createForm.reset({
        key: "",
        value: false,
        description: null,
      })
      setUseJsonEditor(false)
    }
  }, [open, config, isEditing, createForm, updateForm, isBooleanKey])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: AnamnesisConfigCreateInput) => createAnamnesisConfig(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis-configs"] })
      toast.success("Configuración creada correctamente")
      onSuccess()
    },
    onError: (error: Error) => {
      if (error.message.includes("Ya existe")) {
        createForm.setError("key", {
          type: "manual",
          message: error.message,
        })
      } else {
        toast.error(error.message || "Error al crear configuración")
      }
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: AnamnesisConfigUpdateInput }) =>
      updateAnamnesisConfig(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis-configs"] })
      queryClient.invalidateQueries({ queryKey: ["anamnesis-config", configId] })
      toast.success("Configuración actualizada correctamente")
      onSuccess()
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar configuración")
    },
  })

  const handleSubmit = (values: CreateAnamnesisConfigFormValues | UpdateAnamnesisConfigFormValues) => {
    // Check if high-impact key requires confirmation
    if (isEditing && isHighImpact) {
      setPendingSubmit(() => () => {
        const updateValues = values as UpdateAnamnesisConfigFormValues
        updateMutation.mutate({
          id: configId!,
          input: {
            value: updateValues.value,
            description: updateValues.description,
          },
        })
      })
      setShowConfirmDialog(true)
      return
    }

    // Proceed with submission
    if (isEditing) {
      const updateValues = values as UpdateAnamnesisConfigFormValues
      updateMutation.mutate({
        id: configId!,
        input: {
          value: updateValues.value,
          description: updateValues.description,
        },
      })
    } else {
      const createValues = values as CreateAnamnesisConfigFormValues
      createMutation.mutate({
        key: createValues.key,
        value: createValues.value,
        description: createValues.description,
      })
    }
  }

  const handleConfirmSubmit = () => {
    if (pendingSubmit) {
      pendingSubmit()
      setPendingSubmit(null)
    }
    setShowConfirmDialog(false)
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? "Editar configuración" : "Nueva configuración"}
              {isHighImpact && (
                <Badge variant="destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Crítico
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica el valor y descripción de la configuración. La clave no puede ser modificada."
                : "Completa el formulario para crear una nueva configuración."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando configuración...</div>
            </div>
          ) : isEditing ? (
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Key display (read-only when editing) */}
                {config && (
                  <FormItem>
                    <FormLabel>Clave</FormLabel>
                    <Input value={config.key} disabled className="font-mono bg-muted" />
                    <FormDescription>La clave no puede ser modificada después de la creación</FormDescription>
                  </FormItem>
                )}

                {/* Value field - typed or JSON editor */}
                <FormField
                  control={updateForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Valor *</FormLabel>
                        {isBooleanKey && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseJsonEditor(!useJsonEditor)}
                          >
                            <Code2 className="mr-2 h-4 w-4" />
                            {useJsonEditor ? "Usar toggle" : "Editor JSON"}
                          </Button>
                        )}
                      </div>
                      {isBooleanKey && !useJsonEditor ? (
                        <FormControl>
                          <div className="flex items-center space-x-2 rounded-lg border p-4">
                            <Switch
                              checked={field.value as boolean}
                              onCheckedChange={field.onChange}
                            />
                            <span className="text-sm">
                              {field.value ? "Habilitado" : "Deshabilitado"}
                            </span>
                          </div>
                        </FormControl>
                      ) : (
                        <FormControl>
                          <Textarea
                            placeholder='Ingrese el valor JSON (ej: true, "texto", {"key": "value"})'
                            className="font-mono min-h-[120px]"
                            value={
                              typeof field.value === "string"
                                ? field.value
                                : JSON.stringify(field.value, null, 2)
                            }
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                field.onChange(parsed)
                              } catch {
                                // Keep raw string if not valid JSON yet
                                field.onChange(e.target.value)
                              }
                            }}
                          />
                        </FormControl>
                      )}
                      <FormDescription>
                        {isBooleanKey && !useJsonEditor
                          ? "Toggle para valores booleanos"
                          : "Valor en formato JSON. Use el editor JSON para valores complejos."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description field */}
                <FormField
                  control={updateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción de qué hace esta configuración..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Descripción opcional de la configuración y su propósito
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* High-impact warning */}
                {isHighImpact && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-destructive">
                          Configuración de alto impacto
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Esta configuración afecta el comportamiento crítico de los flujos de anamnesis.
                          Se requerirá confirmación antes de guardar cambios.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
          ) : (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Key field (only when creating) */}
                <FormField
                  control={createForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clave *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: MANDATORY_FIRST_CONSULTATION"
                          {...field}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormDescription>
                        Clave única en mayúsculas, números y guiones bajos (ej: MANDATORY_FIRST_CONSULTATION)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Value field - typed or JSON editor */}
                <FormField
                  control={createForm.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
                      <FormControl>
                        {useJsonEditor ? (
                          <Textarea
                            placeholder='{"key": "value"}'
                            className="font-mono min-h-[120px]"
                            {...field}
                            value={typeof field.value === "string" ? field.value : JSON.stringify(field.value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                field.onChange(parsed)
                              } catch {
                                field.onChange(e.target.value)
                              }
                            }}
                          />
                        ) : (
                          <Input
                            type="text"
                            placeholder="Valor"
                            {...field}
                            value={typeof field.value === "string" ? field.value : String(field.value ?? "")}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === "true") field.onChange(true)
                              else if (val === "false") field.onChange(false)
                              else if (!isNaN(Number(val)) && val !== "") field.onChange(Number(val))
                              else field.onChange(val)
                            }}
                          />
                        )}
                      </FormControl>
                      <FormDescription>
                        {useJsonEditor
                          ? "Ingrese el valor en formato JSON"
                          : "Ingrese el valor (texto, número o booleano)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description field */}
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción de qué hace esta configuración..."
                          className="min-h-[80px]"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Descripción opcional de la configuración y su propósito
                      </FormDescription>
                      <FormMessage />
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
                    {isLoading ? "Guardando..." : "Crear"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for high-impact keys */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar cambio crítico
            </DialogTitle>
            <DialogDescription>
              Está a punto de modificar una configuración de alto impacto que afecta el comportamiento
              crítico de los flujos de anamnesis. Esta acción será registrada en el log de auditoría.
              ¿Desea continuar?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setPendingSubmit(null)
                setShowConfirmDialog(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar y guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

