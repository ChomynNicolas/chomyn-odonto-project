"use client"

import type { PatientContact, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPhoneNumber } from "@/lib/utils/patient-helpers"
import { Edit, Plus, Phone, Mail, MessageSquare, Star } from "lucide-react"
import { getPermissions } from "@/lib/utils/rbac"

interface ContactsSectionProps {
  contacts: PatientContact[]
  userRole: UserRole
  onAdd?: () => void
  onEdit?: (contactId: string) => void
}

export function ContactsSection({ contacts, userRole, onAdd, onEdit }: ContactsSectionProps) {
  const permissions = getPermissions(userRole)

  const getContactIcon = (type: PatientContact["type"]) => {
    switch (type) {
      case "PHONE":
      case "MOBILE":
        return Phone
      case "EMAIL":
        return Mail
      case "WHATSAPP":
        return MessageSquare
      default:
        return Phone
    }
  }

  const getContactTypeLabel = (type: PatientContact["type"]) => {
    const labels: Record<PatientContact["type"], string> = {
      PHONE: "Teléfono",
      MOBILE: "Móvil",
      EMAIL: "Email",
      WHATSAPP: "WhatsApp",
    }
    return labels[type] || type
  }

  const formatContactValue = (contact: PatientContact) => {
    if (contact.type === "EMAIL") return contact.value
    if (contact.type === "PHONE" || contact.type === "MOBILE" || contact.type === "WHATSAPP") {
      return formatPhoneNumber(contact.value)
    }
    return contact.value
  }

  // Group by type
  const phoneContacts = contacts.filter((c) => ["PHONE", "MOBILE", "WHATSAPP"].includes(c.type))
  const emailContacts = contacts.filter((c) => c.type === "EMAIL")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Contactos</CardTitle>
        {permissions.canEditContacts && (
          <Button onClick={onAdd} size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Agregar contacto</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay contactos registrados</p>
        ) : (
          <>
            {/* Phone contacts */}
            {phoneContacts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Teléfonos</p>
                <div className="space-y-2">
                  {phoneContacts.map((contact) => {
                    const Icon = getContactIcon(contact.type)
                    return (
                      <div
                        key={contact.id}
                        className="group flex items-start justify-between gap-2 rounded-lg border p-2"
                      >
                        <div className="flex flex-1 items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{formatContactValue(contact)}</p>
                              {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getContactTypeLabel(contact.type)}
                              </Badge>
                              {contact.isWhatsAppCapable && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200"
                                >
                                  WhatsApp
                                </Badge>
                              )}
                              {contact.isSmsCapable && (
                                <Badge variant="outline" className="text-xs">
                                  SMS
                                </Badge>
                              )}
                            </div>
                            {contact.notes && <p className="mt-1 text-xs text-muted-foreground">{contact.notes}</p>}
                          </div>
                        </div>
                        {permissions.canEditContacts && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit?.(contact.id)}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Email contacts */}
            {emailContacts.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Emails</p>
                <div className="space-y-2">
                  {emailContacts.map((contact) => {
                    const Icon = getContactIcon(contact.type)
                    return (
                      <div
                        key={contact.id}
                        className="group flex items-start justify-between gap-2 rounded-lg border p-2"
                      >
                        <div className="flex flex-1 items-start gap-2">
                          <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium break-all">{contact.value}</p>
                              {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            {contact.notes && <p className="mt-1 text-xs text-muted-foreground">{contact.notes}</p>}
                          </div>
                        </div>
                        {permissions.canEditContacts && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit?.(contact.id)}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
