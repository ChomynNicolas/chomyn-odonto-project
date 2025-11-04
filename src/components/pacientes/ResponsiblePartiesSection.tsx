"use client"

import type { ResponsibleParty, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPhoneNumber } from "@/lib/utils/patient-helpers"
import { Plus, Users, Phone, Mail, Shield, Star } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface ResponsiblePartiesSectionProps {
  responsibleParties: ResponsibleParty[]
  userRole: UserRole
  onAdd?: () => void
}

export function ResponsiblePartiesSection({ responsibleParties, userRole, onAdd }: ResponsiblePartiesSectionProps) {
  const permissions = getPermissions(userRole)

  const getRelationLabel = (relation: ResponsibleParty["relation"]) => {
    const labels: Record<ResponsibleParty["relation"], string> = {
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

  const getDocumentTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      CI: "CI",
      PASSPORT: "Pasaporte",
      RUC: "RUC",
      OTHER: "Otro",
    }
    return type ? labels[type] || type : ""
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Responsables</CardTitle>
        {permissions.canEditDemographics && (
          <Button onClick={onAdd} size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Agregar responsable</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {responsibleParties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay responsables registrados</p>
        ) : (
          <div className="space-y-3">
            {responsibleParties.map((party) => (
              <div key={party.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
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
                          <Badge
                            variant="outline"
                            className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200"
                          >
                            <Shield className="mr-1 h-2 w-2" />
                            Autoridad Legal
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {(party.person.documentType || party.person.documentNumber) && (
                  <p className="text-xs text-muted-foreground">
                    {getDocumentTypeLabel(party.person.documentType)} {party.person.documentNumber}
                  </p>
                )}

                {party.person.contacts && party.person.contacts.length > 0 && (
                  <div className="mt-2 space-y-1">
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
        )}
      </CardContent>
    </Card>
  )
}
