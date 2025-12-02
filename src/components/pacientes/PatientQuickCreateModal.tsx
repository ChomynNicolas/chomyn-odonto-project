"use client"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { pacienteQuickCreateSchema } from "@/app/api/pacientes/quick/_schemas"
import type { QuickCreateResult } from "@/app/api/pacientes/quick/_service.quick"
import { useQueryClient } from "@tanstack/react-query"
import { validatePhone, normalizePhone, isMobilePhone } from "@/lib/phone-utils"

interface PatientQuickCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (idPaciente: number) => void
}

// Use z.input for form input type (before transforms)
type FormInput = z.input<typeof pacienteQuickCreateSchema>

export function PatientQuickCreateModal({ open, onOpenChange, onCreated }: PatientQuickCreateModalProps) {
  const [isPending, setIsPending] = useState(false)
  const [phoneValidation, setPhoneValidation] = useState<{ isValid: boolean; error?: string; isMobile?: boolean }>({
    isValid: true,
  })
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<FormInput>({
    resolver: zodResolver(pacienteQuickCreateSchema) as Resolver<FormInput>,
    defaultValues: {
      nombreCompleto: "",
      tipoDocumento: "CI",
      dni: "",
      telefono: "",
      email: "",
      fechaNacimiento: "",
      genero: "NO_ESPECIFICADO",
    },
  })

  const phoneValue = watch("telefono")

  // Validate phone number in real-time
  useEffect(() => {
    if (!phoneValue || phoneValue.trim() === "") {
      setPhoneValidation({ isValid: true }) // Don't show error for empty field until submit
      return
    }

    const validation = validatePhone(phoneValue)
    const normalized = normalizePhone(phoneValue)
    const isMobile = normalized ? isMobilePhone(normalized) : false

    setPhoneValidation({
      isValid: validation.isValid,
      error: validation.error,
      isMobile,
    })
  }, [phoneValue])

  const onSubmit = async (data: FormInput) => {
    setIsPending(true)

    try {
      // Parse to get output type (after transforms)
      const validated = pacienteQuickCreateSchema.parse(data)

      const idempotencyKey = crypto.randomUUID()

      const response = await fetch("/api/pacientes/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(validated),
      })

      const jsonResponse = await response.json() as
        | { ok: true; data: QuickCreateResult }
        | { ok: false; error: string; code?: string }

      if (!response.ok || !jsonResponse.ok) {
        const errorMessage = "error" in jsonResponse ? jsonResponse.error : "Error al crear paciente"
        throw new Error(errorMessage)
      }

      // TypeScript now knows jsonResponse is { ok: true; data: QuickCreateResult }
      if (jsonResponse.data.idPaciente && onCreated) {
        onCreated(jsonResponse.data.idPaciente)
      }

      await queryClient.invalidateQueries({ queryKey: ["pacientes"] })

      toast.success("Paciente creado exitosamente", {
        description: `${validated.nombreCompleto} ha sido registrado. Podrás completar sus datos más tarde.`,
      })

      reset()
      onOpenChange(false)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado"
      toast.error("Error al crear paciente", {
        description: errorMessage,
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alta Rápida de Paciente</DialogTitle>
          <DialogDescription className="flex items-start gap-2 text-sm">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>Registra los datos esenciales del paciente. Podrás completar información adicional más tarde.</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombreCompleto">
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nombreCompleto"
              placeholder="Ej: Juan Carlos Pérez"
              {...register("nombreCompleto")}
              aria-invalid={!!errors.nombreCompleto}
              aria-describedby={errors.nombreCompleto ? "nombreCompleto-error" : undefined}
              autoFocus
            />
            {errors.nombreCompleto && (
              <p id="nombreCompleto-error" className="text-sm text-destructive">
                {errors.nombreCompleto.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento">
                Tipo <span className="text-destructive">*</span>
              </Label>
              <select
                id="tipoDocumento"
                {...register("tipoDocumento")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-invalid={!!errors.tipoDocumento}
              >
                <option value="CI">CI</option>
                <option value="DNI">DNI</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="RUC">RUC</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni">
                Número de Documento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dni"
                placeholder="Ej: 1234567"
                {...register("dni")}
                aria-invalid={!!errors.dni}
                aria-describedby={errors.dni ? "dni-error" : undefined}
              />
              {errors.dni && (
                <p id="dni-error" className="text-sm text-destructive">
                  {errors.dni.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaNacimiento">
                Fecha de Nacimiento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fechaNacimiento"
                type="date"
                {...register("fechaNacimiento")}
                aria-invalid={!!errors.fechaNacimiento}
                aria-describedby={errors.fechaNacimiento ? "fechaNacimiento-error" : undefined}
                max={new Date().toISOString().split("T")[0]}
              />
              {errors.fechaNacimiento && (
                <p id="fechaNacimiento-error" className="text-sm text-destructive">
                  {errors.fechaNacimiento.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero">
                Género <span className="text-destructive">*</span>
              </Label>
              <select
                id="genero"
                {...register("genero")}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-invalid={!!errors.genero}
                aria-describedby={errors.genero ? "genero-error" : undefined}
              >
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
                <option value="OTRO">Otro</option>
                <option value="NO_ESPECIFICADO">Prefiero no especificar</option>
              </select>
              {errors.genero && (
                <p id="genero-error" className="text-sm text-destructive">
                  {errors.genero.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="0991234567 o +595991234567"
              {...register("telefono", {
                onBlur: (e) => {
                  // Normalize phone on blur
                  const normalized = normalizePhone(e.target.value)
                  if (normalized && normalized !== e.target.value) {
                    setValue("telefono", normalized, { shouldValidate: true })
                  }
                },
              })}
              aria-invalid={!!errors.telefono || (phoneValue && !phoneValidation.isValid) ? true : false}
              aria-describedby={
                errors.telefono || (phoneValue && !phoneValidation.isValid) ? "telefono-error" : undefined
              }
            />
            {phoneValue && phoneValidation.isMobile && (
              <p className="text-sm text-green-600">✓ Número móvil detectado (WhatsApp/SMS disponible)</p>
            )}
            {(errors.telefono || (phoneValue && !phoneValidation.isValid)) && (
              <p id="telefono-error" className="text-sm text-destructive" role="alert">
                {errors.telefono?.message || phoneValidation.error || "Teléfono inválido"}
              </p>
            )}
            {!phoneValue && (
              <p className="text-sm text-muted-foreground">
                Formato: 09XXXXXXXX o +595XXXXXXXXX. Se detectará automáticamente si es móvil.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">
              Email <span className="text-xs">(opcional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              {...register("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear Paciente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
