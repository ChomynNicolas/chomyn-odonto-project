"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PatientRecord, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { calculateAge, formatGender, formatDate, formatPhoneNumber } from "@/lib/utils/patient-helpers"
import { getPermissions } from "@/lib/utils/rbac"
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
} from "lucide-react"
import { EditPatientSheet } from "@/components/pacientes/EditPatientSheet"

interface PatientFichaViewProps {
  patient: PatientRecord
}

export function PatientFichaView({ patient }: PatientFichaViewProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [userRole] = useState<UserRole>("ADMIN")
  const router = useRouter()

  const permissions = getPermissions(userRole)
  const age = calculateAge(patient.dateOfBirth)

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

  const phoneContacts = patient.contacts?.filter((c) => ["PHONE", "MOBILE", "WHATSAPP"].includes(c.type)) || []
  const emailContacts = patient.contacts?.filter((c) => c.type === "EMAIL") || []

  const now = new Date()
  const upcomingAppointments =
    patient.appointments?.filter((apt) => new Date(apt.scheduledAt) > now && apt.status !== "CANCELLED").length || 0

  const recentAppointments =
    patient.appointments?.filter((apt) => new Date(apt.scheduledAt) <= now && apt.status === "COMPLETED").length || 0

  const activeTreatments = patient.treatmentPlans?.filter((tp) => tp.status === "IN_PROGRESS").length || 0

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
              {patient.appointments && patient.appointments.length > 0
                ? formatDate(
                    patient.appointments
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
              <Button onClick={() => setEditSheetOpen(true)} size="sm" variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
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

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="text-sm font-medium">
                      {formatDate(patient.dateOfBirth)}
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
                    <p className="text-sm font-medium">{formatGender(patient.gender)}</p>
                  </div>
                </div>
              </div>

              {(patient.documentType || patient.documentNumber) && (
                <>
                  <Separator />
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
                    </div>
                  </div>
                </>
              )}

              {patient.address && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-red-500/10 p-2">
                      <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                      <p className="text-sm font-medium">
                        {patient.address}
                        {patient.city && `, ${patient.city}`}
                      </p>
                      {patient.country && (
                        <p className="text-xs text-muted-foreground">{getCountryLabel(patient.country)}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Contacto</CardTitle>
              <CardDescription>Teléfonos y emails del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {phoneContacts.length === 0 && emailContacts.length === 0 ? (
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
          {patient.responsibleParties && patient.responsibleParties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Responsables</CardTitle>
                <CardDescription>Personas responsables del paciente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patient.responsibleParties.map((party) => (
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
          {(patient.emergencyContactName || patient.emergencyContactPhone) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Contacto de Emergencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {patient.emergencyContactName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                      <p className="text-sm font-semibold">{patient.emergencyContactName}</p>
                    </div>
                  )}
                  {patient.emergencyContactPhone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                      <p className="text-sm font-semibold">{formatPhoneNumber(patient.emergencyContactPhone)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EditPatientSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        patient={patient}
        onSuccess={() => {
          router.refresh()
          setEditSheetOpen(false)
        }}
      />
    </div>
  )
}
