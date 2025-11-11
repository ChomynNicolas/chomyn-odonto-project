// app/api/agenda/citas/[id]/reprogramar/_dto.ts
import type { EstadoCita, TipoCita } from "@prisma/client";

export type CitaMini = {
  idCita: number;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo?: string | null;
  profesional: { id: number; nombre: string };
  paciente: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };
};

/**
 * Información de conflicto detectado
 */
export type ConflictInfo = {
  citaId: number;
  inicioISO: string;
  finISO: string;
  profesional: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string };
};

export type ReprogramarResponse =
  | { ok: true; data: { nueva: CitaMini; anterior: CitaMini } }
  | { ok: false; error: string; code?: string; conflicts?: ConflictInfo[]; details?: unknown };
