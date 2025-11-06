"use client"

import { useState } from "react"
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
  Shield,
  Star,
  MessageSquare,
  AlertTriangle,
} from "lucide-react"
import { EditPatientSheet } from "@/components/pacientes/EditPatientSheet"

interface PersonalInfoTabProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate: () => void
}

export function PersonalInfoTab({ patient, userRole, onUpdate }: PersonalInfoTabProps) {
  const [editSheetOpen, setEditSheetOpen] = useState(false)
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

  return (
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

            {patient.ruc && (
              <>
                <Separator />
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">RUC</p>
                    <p className="text-sm font-medium">{patient.ruc}</p>
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

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Estado</p>
              <Badge variant={patient.status === "ACTIVE" ? "default" : "secondary"}>
                {patient.status === "ACTIVE" ? "Activo" : "Inactivo"}
              </Badge>
            </div>
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
                          <div className="flex flex-wrap gap-1">
                            {contact.isWhatsAppCapable && (
                              <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950">
                                WhatsApp
                              </Badge>
                            )}
                            {contact.isSmsCapable && (
                              <Badge variant="outline" className="text-xs">
                                SMS
                              </Badge>
                            )}
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
                            {party.hasLegalAuthority && (
                              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">
                                <Shield className="mr-1 h-2 w-2" />
                                Autoridad Legal
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {party.person.contacts && party.person.contacts.length > 0 && (
                      <div className="mt-2 space-y-1 pl-10">
                        {party.person.contacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-2 text-xs">
                            {contact.type === "EMAIL" ? (
                              <>
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="break-all">{contact.value}</span>
                              </>
                            ) : (
                              <>
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{formatPhoneNumber(contact.value)}</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
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

      <EditPatientSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        patient={patient}
        onSuccess={() => {
          onUpdate()
          setEditSheetOpen(false)
        }}
      />
    </div>
  )
}
