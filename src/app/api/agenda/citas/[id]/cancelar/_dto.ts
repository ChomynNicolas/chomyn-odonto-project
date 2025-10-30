// app/api/agenda/citas/[id]/cancelar/_dto.ts
import type { EstadoCita, TipoCita, MotivoCancelacion } from "@prisma/client";

export type CitaMiniDTO = {
  idCita: number;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo?: string | null;
  cancelReason?: MotivoCancelacion | null;
  cancelledAt?: string | null;
  profesional: { id: number; nombre: string };
  paciente: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };
};

export type CancelarResponse =
  | { ok: true; data: CitaMiniDTO }
  | { ok: false; error: string; details?: unknown };
