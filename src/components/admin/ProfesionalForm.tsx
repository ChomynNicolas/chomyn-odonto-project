"use client"

import { useEffect, useState } from "react"
import { useForm, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import {
  fetchProfesional,
  createProfesional,
  updateProfesional,
  type ProfesionalCreateInput,
  type ProfesionalUpdateInput,
} from "@/lib/api/admin/profesionales"
import type { EspecialidadListItem } from "@/app/api/especialidades/_service"
import PersonaSelector from "./PersonaSelector"
import UsuarioODONTSelector from "./UsuarioODONTSelector"
import DisponibilidadEditor from "./DisponibilidadEditor"
import EspecialidadesSelector from "./EspecialidadesSelector"
import { toast } from "sonner"
import type { Disponibilidad } from "@/app/api/profesionales/_schemas"

const profesionalFormSchema = z.object({
  personaId: z.number().int().positive("Debe seleccionar una persona"),
  userId: z.number().int().positive("Debe seleccionar un usuario ODONT"),
  numeroLicencia: z.string().max(100).optional().nullable(),
  estaActivo: z.boolean().default(true),
  disponibilidad: z.any().optional().nullable(),
  especialidadIds: z.array(z.number().int().positive()).default([]),
})

type ProfesionalFormValues = z.input<typeof profesionalFormSchema>

interface ProfesionalFormProps {
  profesionalId?: number
  onSuccess?: () => void
}

export default function ProfesionalForm({ profesionalId, onSuccess }: ProfesionalFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [especialidades, setEspecialidades] = useState<EspecialidadListItem[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [usuarioODONTData, setUsuarioODONTData] = useState<{
    nombreApellido: string
    email: string | null
  } | null>(null)
  const isEditing = !!profesionalId
  const totalSteps = 3

  const form = useForm<ProfesionalFormValues>({
    resolver: zodResolver(profesionalFormSchema),
    defaultValues: {
      personaId: 0,
      userId: 0,
      numeroLicencia: null,
      estaActivo: true,
      disponibilidad: null,
      especialidadIds: [],
    },
  })

  // Cargar especialidades y datos del profesional si está editando
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true)
      try {
        const [espResponse, profesionalData] = await Promise.all([
          fetch("/api/especialidades").then((res) => res.json()),
          profesionalId ? fetchProfesional(profesionalId) : null,
        ])
        if (espResponse.ok) {
          setEspecialidades(espResponse.data)
        }

        if (profesionalData) {
          form.reset({
            personaId: profesionalData.persona.idPersona,
            userId: profesionalData.usuario.idUsuario,
            numeroLicencia: profesionalData.numeroLicencia,
            estaActivo: profesionalData.estaActivo,
            disponibilidad: profesionalData.disponibilidad as Disponibilidad | null,
            especialidadIds: profesionalData.especialidades.map((e) => e.idEspecialidad),
          })
          // Cargar datos del usuario para mostrar en PersonaSelector (aunque esté deshabilitado)
          setUsuarioODONTData({
            nombreApellido: profesionalData.usuario.nombreApellido,
            email: profesionalData.usuario.email,
          })
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar datos")
        router.back()
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [profesionalId, form, router])

  const onSubmit = async (data: ProfesionalFormValues) => {
    // Asegurarse de que estamos en el último paso antes de enviar
    if (currentStep !== totalSteps) {
      toast.error("Por favor completa todos los pasos antes de guardar")
      return
    }

    // Validar todos los campos antes de enviar
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Por favor completa todos los campos requeridos")
      return
    }

    setIsLoading(true)
    try {
      if (isEditing) {
        const updateData: ProfesionalUpdateInput = {
          numeroLicencia: data.numeroLicencia,
          estaActivo: data.estaActivo ?? true,
          disponibilidad: data.disponibilidad || null,
          especialidadIds: data.especialidadIds ?? [],
        }
        await updateProfesional(profesionalId!, updateData)
      } else {
        const createData: ProfesionalCreateInput = {
          personaId: data.personaId,
          userId: data.userId,
          numeroLicencia: data.numeroLicencia || null,
          estaActivo: data.estaActivo ?? true,
          disponibilidad: data.disponibilidad || null,
          especialidadIds: data.especialidadIds ?? [],
        }
        await createProfesional(createData)
      }
      toast.success(`Profesional ${isEditing ? "actualizado" : "creado"} correctamente`)
      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/configuracion/profesionales")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar profesional")
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevenir cualquier comportamiento por defecto del formulario
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    let fieldsToValidate: (keyof ProfesionalFormValues)[] = []
    
    if (currentStep === 1) {
      fieldsToValidate = ["personaId", "userId"]
    } else if (currentStep === 2) {
      fieldsToValidate = ["numeroLicencia", "estaActivo"]
    }

    // Validar solo los campos del paso actual sin disparar el submit
    const isValid = await form.trigger(fieldsToValidate as FieldPath<ProfesionalFormValues>[], { shouldFocus: true })
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    } else {
      // Mostrar mensaje de error si la validación falla
      toast.error("Por favor completa todos los campos requeridos antes de continuar")
    }
  }

  const prevStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevenir cualquier comportamiento por defecto del formulario
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                currentStep >= step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={`h-1 w-16 ${
                  currentStep > step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Form {...form}>
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            // Solo permitir submit si estamos en el último paso
            if (currentStep === totalSteps) {
              form.handleSubmit(onSubmit)(e)
            } else {
              // Si no estamos en el último paso, avanzar al siguiente paso
              nextStep()
            }
          }} 
          onKeyDown={(e) => {
            // Prevenir submit cuando se presiona Enter en campos del formulario
            // excepto cuando estamos en el último paso
            if (e.key === "Enter" && currentStep !== totalSteps) {
              const target = e.target as HTMLElement
              // Solo prevenir si no es un textarea o un botón
              if (target.tagName !== "TEXTAREA" && target.tagName !== "BUTTON") {
                e.preventDefault()
              }
            }
          }}
          className="space-y-6"
        >
          {/* Paso 1: Persona y Usuario */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Paso 1: Usuario ODONT y Persona</CardTitle>
                <CardDescription>
                  Primero selecciona el usuario ODONT, luego selecciona o crea la persona asociada. Si creas una nueva persona después de seleccionar el usuario, los datos se pre-llenarán automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <UsuarioODONTSelector
                          value={field.value || null}
                          onSelect={(userId, usuarioData) => {
                            field.onChange(userId)
                            // Guardar datos del usuario para pre-llenar Persona
                            if (usuarioData) {
                              setUsuarioODONTData(usuarioData)
                            }
                          }}
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEditing
                          ? "El usuario no puede ser cambiado después de la creación"
                          : "Solo se muestran usuarios ODONT que no están vinculados a otro profesional"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PersonaSelector
                          value={field.value || null}
                          onSelect={field.onChange}
                          disabled={isEditing}
                          usuarioODONTData={usuarioODONTData}
                        />
                      </FormControl>
                      <FormDescription>
                        {usuarioODONTData
                          ? "Si creas una nueva persona, se pre-llenarán los datos del usuario ODONT seleccionado"
                          : "Selecciona una persona existente o crea una nueva"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Paso 2: Datos del Profesional */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Paso 2: Datos del Profesional</CardTitle>
                <CardDescription>
                  Completa la información básica del profesional
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="numeroLicencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Licencia</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: 12345"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormDescription>Opcional. Debe ser único si se proporciona.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estaActivo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Profesional activo</FormLabel>
                        <FormDescription>
                          Los profesionales inactivos no aparecerán en las listas de selección
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Paso 3: Disponibilidad y Especialidades */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Paso 3: Disponibilidad y Especialidades</CardTitle>
                <CardDescription>
                  Configura la disponibilidad semanal y las especialidades del profesional
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="disponibilidad"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <DisponibilidadEditor
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <FormField
                  control={form.control}
                  name="especialidadIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <EspecialidadesSelector
                          especialidades={especialidades}
                          selectedIds={field.value ?? []}
                          onSelectionChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Navegación */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (currentStep === 1) {
                  router.back()
                } else {
                  prevStep(e)
                }
              }}
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep === 1 ? "Cancelar" : "Anterior"}
            </Button>
            {currentStep < totalSteps ? (
              <Button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  nextStep(e)
                }} 
                disabled={isLoading}
              >
                Siguiente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : isEditing ? (
                  "Guardar cambios"
                ) : (
                  "Crear profesional"
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

