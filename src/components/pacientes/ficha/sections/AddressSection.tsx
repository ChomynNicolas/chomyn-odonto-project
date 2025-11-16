// src/components/pacientes/ficha/sections/AddressSection.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Check, X, Loader2, MapPin } from "lucide-react"
import type { PatientRecord } from "@/lib/types/patient"
import { getPermissions } from "@/lib/utils/rbac"
import type { UserRole } from "@/lib/types/patient"
import { toast } from "sonner"

interface AddressSectionProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function AddressSection({ patient, userRole, onUpdate }: AddressSectionProps) {
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const permissions = getPermissions(userRole)

  const getCountryLabel = (country?: string) => {
    const labels: Record<string, string> = {
      PY: "Paraguay",
      AR: "Argentina",
      BR: "Brasil",
      OTHER: "Otro",
    }
    return country ? labels[country] || country : "-"
  }

  const handleSave = async () => {
    const form = document.getElementById("address-form") as HTMLFormElement
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
          address: (formData.get("address") as string) || null,
          city: (formData.get("city") as string) || null,
          country: (formData.get("country") as string) || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      setEditing(false)
      toast.success("Dirección actualizada")
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  if (!patient.address && !patient.city && !editing) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Dirección</CardTitle>
          <CardDescription>Información de ubicación</CardDescription>
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
          <form id="address-form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                name="address"
                defaultValue={patient.address || ""}
                rows={2}
                disabled={isSaving}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" defaultValue={patient.city || ""} disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select name="country" defaultValue={patient.country || "PY"} disabled={isSaving}>
                  <SelectTrigger id="country">
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
            </div>
          </form>
        ) : (
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Dirección</p>
              <p className="text-sm font-medium">
                {patient.address || "Sin dirección"}
                {patient.city && `, ${patient.city}`}
              </p>
              {patient.country && (
                <p className="text-xs text-muted-foreground">{getCountryLabel(patient.country)}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

