// src/lib/patient-utils.ts
/**
 * Utility functions for patient-related operations
 * Centralized helpers for consistent behavior across components
 */

import type { PacienteListItemDTO } from "@/lib/api/pacientes.types"
import { isValidForWhatsApp } from "./phone-utils"

/**
 * Determines if a WhatsApp icon should be shown for a patient
 * 
 * Requirements:
 * - Patient must have a contact
 * - Contact must be of type PHONE
 * - Contact must have whatsappCapaz flag set to true
 * - OR contact value must be valid for WhatsApp (fallback check)
 * 
 * @param paciente - Patient list item DTO
 * @returns true if WhatsApp icon should be displayed
 */
export function canShowWhatsAppIcon(paciente: PacienteListItemDTO): boolean {
  const contacto = paciente.contactoPrincipal

  if (!contacto) {
    return false
  }

  // Must be a phone contact
  if (contacto.tipo !== "PHONE") {
    return false
  }

  // Primary check: whatsappCapaz flag from database
  if (contacto.whatsappCapaz === true) {
    return true
  }

  // Fallback: validate phone number directly
  // This handles edge cases where the flag might not be set correctly
  if (contacto.valor) {
    return isValidForWhatsApp(contacto.valor)
  }

  return false
}

/**
 * Determines if a patient contact is capable of SMS
 * Similar logic to WhatsApp (mobile numbers)
 * 
 * @param paciente - Patient list item DTO
 * @returns true if SMS is available
 */
export function canShowSMSIcon(paciente: PacienteListItemDTO): boolean {
  // For now, SMS capability is the same as WhatsApp (mobile numbers)
  // This can be extended in the future if needed
  return canShowWhatsAppIcon(paciente)
}

