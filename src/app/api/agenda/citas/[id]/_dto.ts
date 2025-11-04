import { EstadoCita, TipoCita, MotivoCancelacion } from "@prisma/client";

export type UsuarioMini = { id: number; nombre: string };

export type CitaDetailDTO = {
  idCita: number;
  inicio: string;            // ISO
  fin: string;               // ISO
  duracionMinutos: number;
  tipo: TipoCita;
  estado: EstadoCita;
  motivo?: string | null;
  notas?: string | null;

  // Operativo
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;

  // Auditoría de cancelación y creación
  cancelReason?: MotivoCancelacion | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;

  creadoPor: UsuarioMini;
  canceladoPor?: UsuarioMini | null;

  // Relaciones
  profesional: { id: number; nombre: string };
  paciente: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };

  // Reprogramación
  reprogramadaDesdeId?: number | null;
  reprogramacionesHijas: number[];
};

export type CitaDetailResponse =
  | { ok: true; data: CitaDetailDTO }
  | { ok: false; error: string; details?: unknown };
