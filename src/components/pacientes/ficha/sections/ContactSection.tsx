// src/components/pacientes/ficha/sections/ContactSection.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Check, X, Loader2, Phone, Mail, Plus } from "lucide-react"
import { ContactMethodCard } from "../components/ContactMethodCard"
import type { PatientRecord } from "@/lib/types/patient"
import { getPermissions } from "@/lib/utils/rbac"
import type { UserRole } from "@/lib/types/patient"
import { toast } from "sonner"

interface ContactSectionProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function ContactSection({ patient, userRole, onUpdate }: ContactSectionProps) {
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const permissions = getPermissions(userRole)
  const phoneContacts = patient.contacts.filter((c) => c.type === "PHONE")
  const emailContacts = patient.contacts.filter((c) => c.type === "EMAIL")

  const handleSave = async () => {
    const form = document.getElementById("contact-form") as HTMLFormElement
    if (!form) return

    setIsSaving(true)
    setError(null)

    try {
      const formData = new FormData(form)
      const response = await fetch(`/api/pacientes/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updatedAt: patient.updatedAt,
          phone: (formData.get("phone") as string) || null,
          email: (formData.get("email") as string) || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      setEditing(false)
      toast.success("Información de contacto actualizada")
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Información de Contacto</CardTitle>
          <CardDescription>Teléfonos y correos electrónicos</CardDescription>
        </div>
        {permissions.canEditDemographics && (
          <>
            {editing ? (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
                <Button onClick={() => { setEditing(false); setError(null) }} size="sm" variant="outline" disabled={isSaving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button onClick={() => setEditing(true)} size="sm" variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && editing && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {editing ? (
          <form id="contact-form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono Principal</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+595 XXX XXX XXX"
                defaultValue={phoneContacts.find((c) => c.isPrimary)?.value || ""}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Principal</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                defaultValue={emailContacts.find((c) => c.isPrimary)?.value || ""}
                disabled={isSaving}
              />
            </div>
          </form>
        ) : (
          <>
            {phoneContacts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-muted-foreground">Teléfonos</p>
                </div>
                {phoneContacts.map((contact) => (
                  <ContactMethodCard key={contact.id} contact={contact} showTimestamps />
                ))}
              </div>
            )}

            {emailContacts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-muted-foreground">Emails</p>
                </div>
                {emailContacts.map((contact) => (
                  <ContactMethodCard key={contact.id} contact={contact} showTimestamps />
                ))}
              </div>
            )}

            {phoneContacts.length === 0 && emailContacts.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No hay información de contacto registrada</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

