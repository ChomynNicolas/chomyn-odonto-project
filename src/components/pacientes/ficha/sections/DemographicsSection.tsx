// src/components/pacientes/ficha/sections/DemographicsSection.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Check, X, Loader2, User, Calendar, FileText } from "lucide-react"
import { formatGender, formatDate, calculateAge } from "@/lib/utils/patient-helpers"
import type { PatientRecord } from "@/lib/types/patient"
import { getPermissions } from "@/lib/utils/rbac"
import type { UserRole } from "@/lib/types/patient"
import { toast } from "sonner"

interface DemographicsSectionProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function DemographicsSection({ patient, userRole, onUpdate }: DemographicsSectionProps) {
  const [editingPersonal, setEditingPersonal] = useState(false)
  const [editingDocument, setEditingDocument] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const permissions = getPermissions(userRole)
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null

  const getDocumentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      CI: "Cédula",
      PASSPORT: "Pasaporte",
      RUC: "RUC",
      OTHER: "Otro",
    }
    return type ? labels[type] || type : "-"
  }

  const getCountryLabel = (country?: string) => {
    const labels: Record<string, string> = {
      PY: "Paraguay",
      AR: "Argentina",
      BR: "Brasil",
      OTHER: "Otro",
    }
    return country ? labels[country] || country : "-"
  }

  const handleSavePersonal = async () => {
    const form = document.getElementById("personal-form") as HTMLFormElement
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
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          secondLastName: (formData.get("secondLastName") as string) || null,
          gender: formData.get("gender") as string,
          dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string).toISOString() : null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      setEditingPersonal(false)
      toast.success("Datos personales actualizados")
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveDocument = async () => {
    const form = document.getElementById("document-form") as HTMLFormElement
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
          documentType: formData.get("documentType") as string,
          documentNumber: formData.get("documentNumber") as string,
          documentCountry: formData.get("documentCountry") as string,
          documentIssueDate: formData.get("documentIssueDate") ? new Date(formData.get("documentIssueDate") as string).toISOString() : null,
          documentExpiryDate: formData.get("documentExpiryDate") ? new Date(formData.get("documentExpiryDate") as string).toISOString() : null,
          ruc: (formData.get("ruc") as string) || null,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Error al actualizar")
      }

      setEditingDocument(false)
      toast.success("Documento actualizado")
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Personal Information Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Datos Personales</CardTitle>
            <CardDescription>Información demográfica del paciente</CardDescription>
          </div>
          {permissions.canEditDemographics && (
            <>
              {editingPersonal ? (
                <div className="flex gap-2">
                  <Button onClick={handleSavePersonal} size="sm" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Guardar
                  </Button>
                  <Button onClick={() => { setEditingPersonal(false); setError(null) }} size="sm" variant="outline" disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setEditingPersonal(true)} size="sm" variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && editingPersonal && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {editingPersonal ? (
            <form id="personal-form" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre <span className="text-destructive">*</span></Label>
                <Input id="firstName" name="firstName" defaultValue={patient.firstName} required disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido <span className="text-destructive">*</span></Label>
                <Input id="lastName" name="lastName" defaultValue={patient.lastName} required disabled={isSaving} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondLastName">Segundo Apellido</Label>
                <Input id="secondLastName" name="secondLastName" defaultValue={patient.secondLastName || ""} disabled={isSaving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Género</Label>
                  <Select name="gender" defaultValue={patient.gender} disabled={isSaving}>
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
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    defaultValue={patient.dateOfBirth ? patient.dateOfBirth.split("T")[0] : ""}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p>
                  <p className="text-base font-semibold">
                    {patient.firstName} {patient.lastName}
                    {patient.secondLastName && ` ${patient.secondLastName}`}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="text-sm font-medium">
                      {patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "No especificada"}
                      {age !== null && (
                        <Badge variant="secondary" className="ml-2">
                          {age} años
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Género</p>
                    <p className="text-sm font-medium">{formatGender(patient.gender)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Card */}
      {(patient.documentType || patient.documentNumber || editingDocument) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Documento</CardTitle>
              <CardDescription>Información de identificación</CardDescription>
            </div>
            {permissions.canEditDemographics && (
              <>
                {editingDocument ? (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveDocument} size="sm" disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Guardar
                    </Button>
                    <Button onClick={() => { setEditingDocument(false); setError(null) }} size="sm" variant="outline" disabled={isSaving}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setEditingDocument(true)} size="sm" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                )}
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && editingDocument && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {editingDocument ? (
              <form id="document-form" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo</Label>
                    <Select name="documentType" defaultValue={patient.documentType || "CI"} disabled={isSaving}>
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
                    <Input id="documentNumber" name="documentNumber" defaultValue={patient.documentNumber || ""} disabled={isSaving} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentCountry">País</Label>
                    <Select name="documentCountry" defaultValue={patient.documentCountry || "PY"} disabled={isSaving}>
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
                    <Input id="ruc" name="ruc" defaultValue={patient.ruc || ""} disabled={isSaving} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentIssueDate">Fecha de Emisión</Label>
                    <Input
                      id="documentIssueDate"
                      name="documentIssueDate"
                      type="date"
                      defaultValue={patient.documentIssueDate ? patient.documentIssueDate.split("T")[0] : ""}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentExpiryDate">Fecha de Vencimiento</Label>
                    <Input
                      id="documentExpiryDate"
                      name="documentExpiryDate"
                      type="date"
                      defaultValue={patient.documentExpiryDate ? patient.documentExpiryDate.split("T")[0] : ""}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Documento</p>
                    <p className="text-sm font-medium">
                      {getDocumentTypeLabel(patient.documentType)}: {patient.documentNumber || "-"}
                    </p>
                    {patient.documentCountry && (
                      <p className="text-xs text-muted-foreground">{getCountryLabel(patient.documentCountry)}</p>
                    )}
                    {patient.ruc && (
                      <p className="text-xs text-muted-foreground">RUC: {patient.ruc}</p>
                    )}
                  </div>
                </div>
                {/* Document Dates */}
                {(patient.documentIssueDate || patient.documentExpiryDate) && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    {patient.documentIssueDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha de Emisión</p>
                        <p className="text-sm font-medium">{formatDate(patient.documentIssueDate)}</p>
                      </div>
                    )}
                    {patient.documentExpiryDate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
                        <p className="text-sm font-medium">
                          {formatDate(patient.documentExpiryDate)}
                          {new Date(patient.documentExpiryDate) < new Date() && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Vencido
                            </Badge>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

