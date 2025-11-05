"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { PatientRecord } from "@/lib/types/patient"

// Form validation schema
const editPatientSchema = z.object({
  firstName: z.string().min(1, "Nombre requerido").max(100),
  lastName: z.string().min(1, "Apellido requerido").max(100),
  secondLastName: z.string().max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().optional(),
  documentType: z.enum(["CI", "PASSPORT", "RUC", "OTHER"]).optional(),
  documentNumber: z.string().max(50).optional(),
  documentCountry: z.enum(["PY", "AR", "BR", "OTHER"]).optional(),
  ruc: z.string().max(50).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().min(6, "Teléfono debe tener al menos 6 dígitos").max(20).optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  insurance: z.string().max(120).optional(),
  emergencyContactName: z.string().max(160).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
})

type EditPatientFormData = z.infer<typeof editPatientSchema>

interface EditPatientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
  onSuccess?: () => void
}

export function EditPatientSheet({ open, onOpenChange, patient, onSuccess }: EditPatientSheetProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get primary contacts
  const primaryPhone = patient.contacts?.find((c) => c.type === "PHONE" && c.isPrimary)
  const primaryEmail = patient.contacts?.find((c) => c.type === "EMAIL" && c.isPrimary)

  const form = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      secondLastName: patient.secondLastName || "",
      gender: patient.gender || "OTHER",
      dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : "",
      documentType: patient.documentType || "CI",
      documentNumber: patient.documentNumber || "",
      documentCountry: patient.documentCountry || "PY",
      ruc: patient.ruc || "",
      email: primaryEmail?.value || "",
      phone: primaryPhone?.value || "",
      address: patient.address || "",
      city: patient.city || "",
      insurance: patient.insurance || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      status: patient.status || "ACTIVE",
    },
  })

  const onSubmit = async (data: EditPatientFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare request body
      const requestBody = {
        firstName: data.firstName,
        lastName: data.lastName,
        secondLastName: data.secondLastName || null,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        documentCountry: data.documentCountry,
        ruc: data.ruc || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        insurance: data.insurance || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
        status: data.status,
        updatedAt: patient.updatedAt, // For concurrency control
      }

      const response = await fetch(`/api/pacientes/${patient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error codes
        if (response.status === 409) {
          if (result.code === "VERSION_CONFLICT") {
            setError("El paciente fue actualizado por otro usuario. Por favor, recarga la página e intenta nuevamente.")
          } else if (result.code === "DUPLICATE_DOCUMENT") {
            setError("Ya existe un paciente con este tipo y número de documento")
          } else if (result.code === "DUPLICATE_EMAIL") {
            setError("Ya existe un paciente con este email")
          } else {
            setError(result.error || "Error al actualizar paciente")
          }
          return
        }

        throw new Error(result.error || "Error al actualizar paciente")
      }

      // Success
      toast("Paciente actualizado",{
        description: "Los datos del paciente se actualizaron correctamente",
      })

      // Refresh data and close sheet
      router.refresh()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error("Error updating patient:", err)
      setError(err.message || "Error al actualizar paciente")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle phone input - format as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only digits, +, spaces, parentheses, and hyphens
    const cleaned = value.replace(/[^\d+\s()-]/g, "")
    form.setValue("phone", cleaned)
  }

  // Handle email input - lowercase on blur
  const handleEmailBlur = () => {
    const email = form.getValues("email")
    if (email) {
      form.setValue("email", email.toLowerCase().trim())
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Paciente</SheetTitle>
          <SheetDescription>Actualiza los datos demográficos y de contacto del paciente</SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Información Personal</h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  {...form.register("firstName")}
                  aria-invalid={!!form.formState.errors.firstName}
                />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Apellido <span className="text-destructive">*</span>
                </Label>
                <Input id="lastName" {...form.register("lastName")} aria-invalid={!!form.formState.errors.lastName} />
                {form.formState.errors.lastName && (
                  <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondLastName">Segundo Apellido</Label>
                <Input id="secondLastName" {...form.register("secondLastName")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value as any)}>
                    <SelectTrigger id="gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Masculino</SelectItem>
                      <SelectItem value="FEMALE">Femenino</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                  <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
                </div>
              </div>
            </div>
          </div>

          {/* Document */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Documento</h3>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentType">Tipo</Label>
                  <Select
                    value={form.watch("documentType")}
                    onValueChange={(value) => form.setValue("documentType", value as any)}
                  >
                    <SelectTrigger id="documentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CI">Cédula</SelectItem>
                      <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                      <SelectItem value="RUC">RUC</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Número</Label>
                  <Input id="documentNumber" {...form.register("documentNumber")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="documentCountry">País</Label>
                  <Select
                    value={form.watch("documentCountry")}
                    onValueChange={(value) => form.setValue("documentCountry", value as any)}
                  >
                    <SelectTrigger id="documentCountry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PY">Paraguay</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="OTHER">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ruc">RUC</Label>
                  <Input id="ruc" {...form.register("ruc")} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contacto</h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+595 XXX XXX XXX"
                  {...form.register("phone")}
                  onChange={handlePhoneChange}
                  aria-invalid={!!form.formState.errors.phone}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                )}
                <p className="text-xs text-muted-foreground">Formato: +595 XXX XXX XXX o 0XXX XXX XXX</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  onBlur={handleEmailBlur}
                  aria-invalid={!!form.formState.errors.email}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dirección</h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea id="address" {...form.register("address")} rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" {...form.register("city")} />
              </div>
            </div>
          </div>

          {/* Insurance & Emergency */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Otros Datos</h3>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance">Obra Social / Seguro</Label>
                <Input id="insurance" {...form.register("insurance")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contacto de Emergencia</Label>
                <Input
                  id="emergencyContactName"
                  placeholder="Nombre completo"
                  {...form.register("emergencyContactName")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Teléfono de Emergencia</Label>
                <Input
                  id="emergencyContactPhone"
                  type="tel"
                  placeholder="+595 XXX XXX XXX"
                  {...form.register("emergencyContactPhone")}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Estado</h3>

            <div className="space-y-2">
              <Label htmlFor="status">Estado del Paciente</Label>
              <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as any)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Activo</SelectItem>
                  <SelectItem value="INACTIVE">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
