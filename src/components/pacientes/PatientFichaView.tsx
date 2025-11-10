"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { calculateAge, formatGender, formatDate, formatPhoneNumber } from "@/lib/utils/patient-helpers"
import { getPermissions } from "@/lib/utils/rbac"
import { usePatientContext } from "@/context/PatientDataContext"
import { toast } from "sonner"
import {
  User,
  Calendar,
  MapPin,
  FileText,
  Phone,
  Mail,
  Users,
  Edit,
  Star,
  MessageSquare,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  Check,
  X,
  Loader2,
} from "lucide-react"

interface PatientFichaViewProps {
  patient: PatientRecord
}

type EditingSection = "personal" | "document" | "address" | "contact" | "emergency" | null

export function PatientFichaView({ patient: initialPatient }: PatientFichaViewProps) {
  const { patient, mutate, etag } = usePatientContext()
  const [userRole] = useState<UserRole>("ADMIN")
  const router = useRouter()
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use context patient if available, otherwise fallback to initial
  const currentPatient = patient || initialPatient

  const permissions = getPermissions(userRole)
  const age = calculateAge(currentPatient.dateOfBirth)

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

  const getRelationLabel = (relation: string) => {
    const labels: Record<string, string> = {
      PADRE: "Padre",
      MADRE: "Madre",
      TUTOR: "Tutor",
      CONYUGE: "Cónyuge",
      HIJO: "Hijo/a",
      HERMANO: "Hermano/a",
      OTRO: "Otro",
    }
    return labels[relation] || relation
  }

  const phoneContacts = currentPatient.contacts?.filter((c) => ["PHONE", "MOBILE", "WHATSAPP"].includes(c.type)) || []
  const emailContacts = currentPatient.contacts?.filter((c) => c.type === "EMAIL") || []

  const now = new Date()
  const upcomingAppointments =
    currentPatient.appointments?.filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED").length || 0

  const recentAppointments =
    currentPatient.appointments?.filter((apt) => new Date(apt.scheduledAt) <= now && apt.status === "COMPLETED").length || 0

  const activeTreatments = currentPatient.treatmentPlans?.filter((tp) => tp.status === "ACTIVE").length || 0

  // Get primary contacts
  const primaryPhone = currentPatient.contacts?.find((c) => c.type === "PHONE" && c.isPrimary)
  const primaryEmail = currentPatient.contacts?.find((c) => c.type === "EMAIL" && c.isPrimary)

  const handleSave = async (section: EditingSection, data: Record<string, string | null>) => {
    if (!section) return

    setIsSaving(true)
    setError(null)

    try {
      const requestBody: Record<string, string | null> = {
        updatedAt: currentPatient.updatedAt, // For concurrency control
      }

      // Prepare data based on section
      if (section === "personal") {
        requestBody.firstName = data.firstName
        requestBody.lastName = data.lastName
        requestBody.secondLastName = data.secondLastName || null
        requestBody.gender = data.gender
        requestBody.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null
      } else if (section === "document") {
        requestBody.documentType = data.documentType
        requestBody.documentNumber = data.documentNumber
        requestBody.documentCountry = data.documentCountry
        requestBody.ruc = data.ruc || null
      } else if (section === "address") {
        requestBody.address = data.address || null
        requestBody.city = data.city || null
      } else if (section === "contact") {
        requestBody.email = data.email || null
        requestBody.phone = data.phone || null
      } else if (section === "emergency") {
        requestBody.emergencyContactName = data.emergencyContactName || null
        requestBody.emergencyContactPhone = data.emergencyContactPhone || null
      }

      const response = await fetch(`/api/pacientes/${currentPatient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(etag && { "If-Match": etag }),
        },
        body: JSON.stringify(requestBody),
      })

      const result = await response.json()

      if (!response.ok) {
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
      toast.success("Datos actualizados", {
        description: "Los datos del paciente se actualizaron correctamente",
      })

      // Refresh data
      mutate()
      router.refresh()
      setEditingSection(null)
    } catch (err: unknown) {
      console.error("Error updating patient:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar paciente"
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingSection(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      {/* KPIs Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingAppointments}</div>
            <p className="text-xs text-muted-foreground">Citas agendadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Realizadas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAppointments}</div>
            <p className="text-xs text-muted-foreground">Historial completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tratamientos Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTreatments}</div>
            <p className="text-xs text-muted-foreground">En progreso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Visita</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPatient.appointments && currentPatient.appointments.length > 0
                ? formatDate(
                    currentPatient.appointments
                      .filter((apt) => new Date(apt.scheduledAt) <= now)
                      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0]
                      ?.scheduledAt,
                  )
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Fecha de última consulta</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Data Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">Datos Personales</CardTitle>
              <CardDescription>Información demográfica del paciente</CardDescription>
            </div>
            {permissions.canEditDemographics && (
              <>
                {editingSection === "personal" ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        const form = document.getElementById("personal-form") as HTMLFormElement
                        if (form) {
                          const formData = new FormData(form)
                          const data = {
                            firstName: formData.get("firstName") as string,
                            lastName: formData.get("lastName") as string,
                            secondLastName: (formData.get("secondLastName") as string) || "",
                            gender: formData.get("gender") as string,
                            dateOfBirth: formData.get("dateOfBirth") as string,
                          }
                          handleSave("personal", data)
                        }
                      }}
                      size="sm"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Guardar
                    </Button>
                    <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
                      <X className="mr-2 h-4 w-4" />
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setEditingSection("personal")} size="sm" variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                )}
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && editingSection === "personal" && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {editingSection === "personal" ? (
              <form id="personal-form" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    defaultValue={currentPatient.firstName}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    defaultValue={currentPatient.lastName}
                    required
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondLastName">Segundo Apellido</Label>
                  <Input
                    id="secondLastName"
                    name="secondLastName"
                    defaultValue={currentPatient.secondLastName || ""}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Género</Label>
                    <Select
                      name="gender"
                      defaultValue={currentPatient.gender}
                      disabled={isSaving}
                    >
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
                      defaultValue={currentPatient.dateOfBirth ? currentPatient.dateOfBirth.split("T")[0] : ""}
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
                      {currentPatient.firstName} {currentPatient.lastName}
                      {currentPatient.secondLastName && ` ${currentPatient.secondLastName}`}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                      <p className="text-sm font-medium">
                        {formatDate(currentPatient.dateOfBirth)}
                        <Badge variant="secondary" className="ml-2">
                          {age} años
                        </Badge>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-purple-500/10 p-2">
                      <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Género</p>
                      <p className="text-sm font-medium">{formatGender(currentPatient.gender)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Card */}
        {(currentPatient.documentType || currentPatient.documentNumber || editingSection === "document") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Documento</CardTitle>
                <CardDescription>Información de identificación</CardDescription>
              </div>
              {permissions.canEditDemographics && (
                <>
                  {editingSection === "document" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const form = document.getElementById("document-form") as HTMLFormElement
                          if (form) {
                            const formData = new FormData(form)
                            const data = {
                              documentType: formData.get("documentType") as string,
                              documentNumber: formData.get("documentNumber") as string,
                              documentCountry: formData.get("documentCountry") as string,
                              ruc: (formData.get("ruc") as string) || "",
                            }
                            handleSave("document", data)
                          }
                        }}
                        size="sm"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                      <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setEditingSection("document")} size="sm" variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && editingSection === "document" && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {editingSection === "document" ? (
                <form id="document-form" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="documentType">Tipo</Label>
                      <Select
                        name="documentType"
                        defaultValue={currentPatient.documentType || "CI"}
                        disabled={isSaving}
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
                      <Input
                        id="documentNumber"
                        name="documentNumber"
                        defaultValue={currentPatient.documentNumber || ""}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="documentCountry">País</Label>
                      <Select
                        name="documentCountry"
                        defaultValue={currentPatient.documentCountry || "PY"}
                        disabled={isSaving}
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
                      <Input id="ruc" name="ruc" defaultValue={currentPatient.ruc || ""} disabled={isSaving} />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Documento</p>
                    <p className="text-sm font-medium">
                      {getDocumentTypeLabel(currentPatient.documentType)}: {currentPatient.documentNumber || "-"}
                    </p>
                    {currentPatient.documentCountry && (
                      <p className="text-xs text-muted-foreground">{getCountryLabel(currentPatient.documentCountry)}</p>
                    )}
                    {currentPatient.ruc && (
                      <p className="text-xs text-muted-foreground">RUC: {currentPatient.ruc}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Address Card */}
        {(currentPatient.address || currentPatient.city || editingSection === "address") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Dirección</CardTitle>
                <CardDescription>Información de ubicación</CardDescription>
              </div>
              {permissions.canEditDemographics && (
                <>
                  {editingSection === "address" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const form = document.getElementById("address-form") as HTMLFormElement
                          if (form) {
                            const formData = new FormData(form)
                            const data = {
                              address: formData.get("address") as string,
                              city: formData.get("city") as string,
                            }
                            handleSave("address", data)
                          }
                        }}
                        size="sm"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                      <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setEditingSection("address")} size="sm" variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && editingSection === "address" && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {editingSection === "address" ? (
                <form id="address-form" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={currentPatient.address || ""}
                      rows={2}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" name="city" defaultValue={currentPatient.city || ""} disabled={isSaving} />
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
                      {currentPatient.address || "Sin dirección"}
                      {currentPatient.city && `, ${currentPatient.city}`}
                    </p>
                    {currentPatient.country && (
                      <p className="text-xs text-muted-foreground">{getCountryLabel(currentPatient.country)}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact Information Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Información de Contacto</CardTitle>
                <CardDescription>Teléfonos y emails del paciente</CardDescription>
              </div>
              {permissions.canEditDemographics && (
                <>
                  {editingSection === "contact" ? (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const form = document.getElementById("contact-form") as HTMLFormElement
                          if (form) {
                            const formData = new FormData(form)
                            const data = {
                              email: (formData.get("email") as string) || "",
                              phone: (formData.get("phone") as string) || "",
                            }
                            handleSave("contact", data)
                          }
                        }}
                        size="sm"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Guardar
                      </Button>
                      <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setEditingSection("contact")} size="sm" variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {error && editingSection === "contact" && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              {editingSection === "contact" ? (
                <form id="contact-form" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono Principal</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+595 XXX XXX XXX"
                      defaultValue={primaryPhone?.value || ""}
                      disabled={isSaving}
                    />
                    <p className="text-xs text-muted-foreground">Formato: +595 XXX XXX XXX o 0XXX XXX XXX</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Principal</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={primaryEmail?.value || ""}
                      disabled={isSaving}
                    />
                  </div>
                </form>
              ) : phoneContacts.length === 0 && emailContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay contactos registrados</p>
              ) : (
                <>
                  {phoneContacts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Teléfonos</p>
                      {phoneContacts.map((contact) => (
                        <div key={contact.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="rounded-lg bg-blue-500/10 p-2">
                            {contact.type === "WHATSAPP" ? (
                              <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{formatPhoneNumber(contact.value)}</p>
                              {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            {contact.notes && <p className="text-xs text-muted-foreground">{contact.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {emailContacts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Emails</p>
                      {emailContacts.map((contact) => (
                        <div key={contact.id} className="flex items-start gap-3 rounded-lg border p-3">
                          <div className="rounded-lg bg-purple-500/10 p-2">
                            <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium break-all">{contact.value}</p>
                              {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            {contact.notes && <p className="text-xs text-muted-foreground">{contact.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Responsible Parties Card */}
          {currentPatient.responsibleParties && currentPatient.responsibleParties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responsables</CardTitle>
                <CardDescription>Personas responsables del paciente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentPatient.responsibleParties.map((party) => (
                    <div key={party.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-indigo-500/10 p-2">
                            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {party.person.firstName} {party.person.lastName}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getRelationLabel(party.relation)}
                              </Badge>
                              {party.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  <Star className="mr-1 h-2 w-2" />
                                  Principal
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emergency Contact Card */}
          {(currentPatient.emergencyContactName || currentPatient.emergencyContactPhone || editingSection === "emergency") && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Contacto de Emergencia
                </CardTitle>
                {permissions.canEditDemographics && (
                  <>
                    {editingSection === "emergency" ? (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const form = document.getElementById("emergency-form") as HTMLFormElement
                            if (form) {
                              const formData = new FormData(form)
                              const data = {
                                emergencyContactName: (formData.get("emergencyContactName") as string) || "",
                                emergencyContactPhone: (formData.get("emergencyContactPhone") as string) || "",
                              }
                              handleSave("emergency", data)
                            }
                          }}
                          size="sm"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Guardar
                        </Button>
                        <Button onClick={handleCancel} size="sm" variant="outline" disabled={isSaving}>
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setEditingSection("emergency")} size="sm" variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </>
                )}
              </CardHeader>
              <CardContent>
                {error && editingSection === "emergency" && (
                  <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {editingSection === "emergency" ? (
                  <form id="emergency-form" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactName">Nombre</Label>
                      <Input
                        id="emergencyContactName"
                        name="emergencyContactName"
                        placeholder="Nombre completo"
                        defaultValue={currentPatient.emergencyContactName || ""}
                        disabled={isSaving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContactPhone">Teléfono</Label>
                      <Input
                        id="emergencyContactPhone"
                        name="emergencyContactPhone"
                        type="tel"
                        placeholder="+595 XXX XXX XXX"
                        defaultValue={currentPatient.emergencyContactPhone || ""}
                        disabled={isSaving}
                      />
                    </div>
                  </form>
                ) : (
                  <div className="space-y-2">
                    {currentPatient.emergencyContactName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                        <p className="text-sm font-semibold">{currentPatient.emergencyContactName}</p>
                      </div>
                    )}
                    {currentPatient.emergencyContactPhone && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                        <p className="text-sm font-semibold">{formatPhoneNumber(currentPatient.emergencyContactPhone)}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
