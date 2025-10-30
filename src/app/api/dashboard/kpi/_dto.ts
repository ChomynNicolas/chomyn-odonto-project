// src/app/api/dashboard/kpi/_dto.ts
import type { EstadoCita } from "@prisma/client";

export type KpiCitasHoyDTO = {
  total: number;
  confirmadas: number;
  canceladas: number;
  noShow: number;
};

export type KpiOcupacionItem = {
  consultorioId: number;
  nombre: string;
  colorHex?: string | null;
  slots: number;
  ocupadas: number;
  bloqueos: number;
  libres: number;
};

export type KpiTiemposDTO = {
  atencionesHoy: number;            // cantidad con startedAt & completedAt hoy
  promedioMin: number | null;       // promedio en minutos
  medianaMin: number | null;        // opcional
};

export type AlertaSinConfirmar = {
  idCita: number;
  inicioISO: string;
  paciente: string;
  profesional: string;
  horasFaltantes: number;
};

export type AlertaBloqueo = {
  idBloqueoAgenda: number;
  desdeISO: string;
  hastaISO: string;
  tipo: string;
  consultorio?: string | null;
  profesional?: string | null;
};

export type ConflictoAgenda = {
  recurso: "PROFESIONAL" | "CONSULTORIO";
  recursoId: number;
  idCitaA: number;
  idCitaB: number;
  solapadoMin: number;
};

export type ColaDTO = {
  checkIn: Array<{ idCita: number; hora: string; paciente: string; consultorio?: string | null }>;
  enAtencion: Array<{ idCita: number; hora: string; paciente: string; profesional: string }>;
};

export type DashboardKpiResponse = {
  ok: true;
  data: {
    fecha: string; // YYYY-MM-DD
    kpis: KpiCitasHoyDTO;
    proximas10: Array<{
      idCita: number;
      inicioISO: string;
      estado: EstadoCita;
      paciente: string;
      profesional: string;
      consultorio?: string | null;
    }>;
    ocupacion: KpiOcupacionItem[];
    tiempos: KpiTiemposDTO;
    alertas: {
      sinConfirmar24h: AlertaSinConfirmar[];
      bloqueosActivos: AlertaBloqueo[];
      conflictos: ConflictoAgenda[];
    };
    colas: ColaDTO;
  };
} | { ok: false; error: string; details?: unknown };
