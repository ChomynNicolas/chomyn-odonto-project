// app/api/agenda/disponibilidad/_dto.ts
export type SlotDTO = {
  slotStart: string; // ISO
  slotEnd: string;   // ISO
  motivoBloqueo?: string | null; // normalmente null porque devolvemos libres; reservado para “soft-blocks”
};

export type DisponibilidadResponse =
  | { ok: true; meta: { fecha: string; duracionMinutos: number; intervalo: number }; data: SlotDTO[] }
  | { ok: false; error: string; details?: unknown };
