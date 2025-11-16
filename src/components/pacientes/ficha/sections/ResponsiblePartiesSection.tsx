// src/components/pacientes/ficha/sections/ResponsiblePartiesSection.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Star, Phone, Mail, FileText } from "lucide-react"
import { formatDate, formatPhoneNumber } from "@/lib/utils/patient-helpers"
import type { PatientRecord } from "@/lib/types/patient"

interface ResponsiblePartiesSectionProps {
  patient: PatientRecord
}

export function ResponsiblePartiesSection({ patient }: ResponsiblePartiesSectionProps) {
  if (!patient.responsibleParties || patient.responsibleParties.length === 0) {
    return null
  }

  const getRelationLabel = (relation: string) => {
    const labels: Record<string, string> = {
      PADRE: "Padre",
      MADRE: "Madre",
      TUTOR: "Tutor",
      CONYUGE: "Cónyuge",
      FAMILIAR: "Familiar",
      HIJO: "Hijo",
      EMPRESA: "Empresa",
      OTRO: "Otro",
    }
    return labels[relation] || relation
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Responsables</CardTitle>
        <CardDescription>Personas responsables del paciente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patient.responsibleParties.map((party) => (
            <div key={party.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="rounded-lg bg-indigo-500/10 p-2">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 space-y-2">
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
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                            Autoridad Legal
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Contact Information */}
                    {party.person.contacts && party.person.contacts.length > 0 && (
                      <div className="pt-2 border-t space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">Contacto:</p>
                        {party.person.contacts.map((contact, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {contact.type === "PHONE" ? (
                              <Phone className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Mail className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-muted-foreground">
                              {contact.type === "PHONE" ? formatPhoneNumber(contact.value) : contact.value}
                            </span>
                            {contact.isPrimary && (
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Document Information */}
                    {party.person.documentNumber && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {party.person.documentType || "Doc"}: {party.person.documentNumber}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Validity Period */}
                    {(party.validFrom || party.validUntil) && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Vigencia:</p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {party.validFrom && (
                            <p>Desde: {formatDate(party.validFrom)}</p>
                          )}
                          {party.validUntil ? (
                            <p>Hasta: {formatDate(party.validUntil)}</p>
                          ) : (
                            <p className="text-green-600 dark:text-green-400">Vigente actualmente</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {party.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Notas:</p>
                        <p className="text-xs text-muted-foreground">{party.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

