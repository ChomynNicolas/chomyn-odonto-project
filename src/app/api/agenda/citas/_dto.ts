// app/api/agenda/citas/_dto.ts
import { TipoCita, EstadoCita } from "@prisma/client";

export type CitaListItemDTO = {
  idCita: number;
  inicio: string; // ISO
  fin: string;    // ISO
  duracionMinutos: number;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo?: string | null;

  profesional: { id: number; nombre: string };
  paciente: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };
};

export type CitaListResponse = {
  ok: true;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  data: CitaListItemDTO[];
};

export type CitaCreatedResponse =
  | { ok: true; data: CitaListItemDTO }
  | { ok: false; error: string; details?: unknown };