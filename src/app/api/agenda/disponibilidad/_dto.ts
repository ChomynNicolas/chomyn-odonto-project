// ============================================================================
// DTOs - Disponibilidad
// ============================================================================

export interface SlotDTO {
  slotStart: string // ISO
  slotEnd: string // ISO
  motivoBloqueo: string | null
}
