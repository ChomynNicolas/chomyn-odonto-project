// app/api/agenda/citas/[id]/estado/_dto.ts
import type { EstadoCita, TipoCita } from "@prisma/client";

export type CitaEstadoDTO = {
  idCita: number;
  inicio: string;
  fin: string;
  duracionMinutos: number;
  tipo: TipoCita;
  estado: EstadoCita;

  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;

  profesional: { id: number; nombre: string };
  paciente: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };
};
