// src/components/pacientes/ficha/components/ContactMethodCard.tsx
"use client"

import { Phone, Mail, Star, MessageCircle } from "lucide-react"
import { formatPhoneNumber } from "@/lib/utils/patient-helpers"
import type { PatientContact } from "@/lib/types/patient"
import { TimestampDisplay } from "./TimestampDisplay"

interface ContactMethodCardProps {
  contact: PatientContact
  showTimestamps?: boolean
}

export function ContactMethodCard({ contact, showTimestamps = false }: ContactMethodCardProps) {
  const isPhone = contact.type === "PHONE"
  const displayValue = isPhone ? formatPhoneNumber(contact.value) : contact.value

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className={`rounded-lg p-2 ${isPhone ? "bg-blue-500/10" : "bg-purple-500/10"}`}>
        {isPhone ? (
          <Phone className={`h-4 w-4 ${isPhone ? "text-blue-600 dark:text-blue-400" : ""}`} />
        ) : (
          <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium break-all">{displayValue}</p>
          {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          {contact.isWhatsAppCapable && isPhone && (
            <MessageCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
          )}
        </div>
        {contact.notes && <p className="text-xs text-muted-foreground">{contact.notes}</p>}
        {showTimestamps && contact.createdAt && (
          <TimestampDisplay timestamp={contact.createdAt} showRelative />
        )}
      </div>
    </div>
  )
}

