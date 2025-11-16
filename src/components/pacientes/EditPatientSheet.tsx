"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import type { PatientRecord } from "@/lib/types/patient"
import { patientUpdateBodySchema, type PatientUpdateBody } from "@/app/api/pacientes/[id]/_schemas"
import { toast } from "sonner"

interface EditPatientSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient: PatientRecord
  onSuccess?: () => void
}

// Use the original schema, but we'll ensure updatedAt is always set
const editPatientSchema = patientUpdateBodySchema

type EditPatientFormData = z.infer<typeof editPatientSchema>

export function EditPatientSheet({ open, onOpenChange, patient, onSuccess }: EditPatientSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get primary email and phone from contacts
  const primaryEmail = patient.contacts?.find((c) => c.type === "EMAIL" && c.isPrimary)?.value || undefined
  const primaryPhone = patient.contacts?.find((c) => (c.type === "PHONE" || c.type === "MOBILE") && c.isPrimary)?.value || undefined

  const form = useForm<EditPatientFormData>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      secondLastName: patient.secondLastName || null,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString() : null,
      documentType: patient.documentType,
      documentNumber: patient.documentNumber || undefined,
      documentCountry: patient.documentCountry,
      ruc: patient.ruc || null,
      email: primaryEmail || null,
      phone: primaryPhone || null,
      address: patient.address || null,
      city: patient.city || null,
      // insurance is optional and not available in PatientRecord, so omit it
      emergencyContactName: patient.emergencyContactName || null,
      emergencyContactPhone: patient.emergencyContactPhone || null,
      status: patient.status,
      updatedAt: patient.updatedAt,
    },
  })

  // Reset form when patient changes
  useEffect(() => {
    if (open && patient) {
      const primaryEmail = patient.contacts?.find((c) => c.type === "EMAIL" && c.isPrimary)?.value || undefined
      const primaryPhone = patient.contacts?.find((c) => (c.type === "PHONE" || c.type === "MOBILE") && c.isPrimary)?.value || undefined

      form.reset({
        firstName: patient.firstName,
        lastName: patient.lastName,
        secondLastName: patient.secondLastName || null,
        gender: patient.gender,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString() : null,
        documentType: patient.documentType,
        documentNumber: patient.documentNumber || undefined,
        documentCountry: patient.documentCountry,
        ruc: patient.ruc || null,
        email: primaryEmail || null,
        phone: primaryPhone || null,
        address: patient.address || null,
        city: patient.city || null,
        // insurance is optional and not available in PatientRecord, so omit it
        emergencyContactName: patient.emergencyContactName || null,
        emergencyContactPhone: patient.emergencyContactPhone || null,
        status: patient.status,
        updatedAt: patient.updatedAt,
      })
    }
  }, [open, patient, form])

  const onSubmit = async (data: EditPatientFormData) => {
    setIsSubmitting(true)

    try {
      // Ensure updatedAt is set from patient (required for concurrency control)
      const updateData: PatientUpdateBody = {
        ...data,
        updatedAt: patient.updatedAt,
      }

      const response = await fetch(`/api/pacientes/${patient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(patient.etag && { "If-Match": patient.etag }),
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(errorData.error || "Error al actualizar paciente")
      }

      toast.success("Paciente actualizado correctamente")
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating patient:", error)
      toast.error(error instanceof Error ? error.message : "Error al actualizar paciente")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Editar Paciente</SheetTitle>
          <SheetDescription>Actualiza la información del paciente. Los campos marcados con * son obligatorios.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Personal</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Apellido <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apellido" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="secondLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segundo Apellido</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Segundo Apellido (opcional)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value ? new Date(value).toISOString() : null)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar género" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Masculino</SelectItem>
                          <SelectItem value="FEMALE">Femenino</SelectItem>
                          <SelectItem value="OTHER">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Document Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documento</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CI">CI</SelectItem>
                          <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                          <SelectItem value="RUC">RUC</SelectItem>
                          <SelectItem value="OTHER">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Documento</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Número" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ruc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUC</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="RUC (opcional)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="documentCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>País de Emisión</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="País" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PY">Paraguay</SelectItem>
                        <SelectItem value="AR">Argentina</SelectItem>
                        <SelectItem value="BR">Brasil</SelectItem>
                        <SelectItem value="OTHER">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contacto</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="tel" placeholder="Teléfono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="email" placeholder="Email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dirección</h3>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} placeholder="Dirección" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Ciudad" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contacto de Emergencia</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Nombre del contacto" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} type="tel" placeholder="Teléfono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Estado</h3>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Paciente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Activo</SelectItem>
                        <SelectItem value="INACTIVE">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

