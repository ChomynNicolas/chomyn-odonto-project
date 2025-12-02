// src/components/pacientes/ficha/sections/EmergencyContactSection.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Check, X, Loader2, AlertTriangle, Phone } from "lucide-react"
import { formatPhoneNumber } from "@/lib/utils/patient-helpers"
import type { PatientRecord } from "@/lib/types/patient"
import { getPermissions } from "@/lib/utils/rbac"
import type { UserRole } from "@/lib/types/patient"
import { toast } from "sonner"

interface EmergencyContactSectionProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function EmergencyContactSection({ patient, userRole, onUpdate }: EmergencyContactSectionProps) {
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const permissions = getPermissions(userRole)

  const handleSave = async () => {
    const form = document.getElementById("emergency-form") as HTMLFormElement
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
          emergencyContactName: (formData.get("emergencyContactName") as string) || null,
          emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || null,
          emergencyContactRelation: (formData.get("emergencyContactRelation") as string) || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      setEditing(false)
      toast.success("Contacto de emergencia actualizado")
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  if (!patient.emergencyContactName && !patient.emergencyContactPhone && !editing) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Contacto de Emergencia
        </CardTitle>
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
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {editing ? (
          <form id="emergency-form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Nombre</Label>
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                placeholder="Nombre completo"
                defaultValue={patient.emergencyContactName || ""}
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                <Input
                  id="emergencyContactPhone"
                  name="emergencyContactPhone"
                  type="tel"
                  placeholder="+595 XXX XXX XXX"
                  defaultValue={patient.emergencyContactPhone || ""}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelation">Relación</Label>
                <Input
                  id="emergencyContactRelation"
                  name="emergencyContactRelation"
                  placeholder="Ej: Padre, Madre, Cónyuge..."
                  defaultValue={patient.emergencyContactRelation || ""}
                  disabled={isSaving}
                />
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            {patient.emergencyContactName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-sm font-semibold">{patient.emergencyContactName}</p>
              </div>
            )}
            {patient.emergencyContactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-semibold">{formatPhoneNumber(patient.emergencyContactPhone)}</p>
                </div>
              </div>
            )}
            {patient.emergencyContactRelation && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relación</p>
                <p className="text-sm font-semibold">{patient.emergencyContactRelation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

