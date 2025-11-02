// src/app/api/dashboard/kpi/_dto.ts  (reemplazo de tipos ampliado)
import type { EstadoCita } from "@prisma/client";

export type KpiCitasHoyDTO = {
  total: number;
  confirmadas: number;
  canceladas: number;
  noShow: number;
  // Nuevos
  confirmRate: number;   // 0..100 (redondeado)
  cancelRate: number;    // 0..100
  noShowRate: number;    // 0..100
  sinConfirmar24h: number; // cantidad (para card rápida)
};

export type KpiTiemposDTO = {
  atencionesHoy: number;
  promedioMin: number | null;
  medianaMin: number | null;
};

export type ProximaCitaItem = {
  idCita: number;
  inicioISO: string;
  estado: EstadoCita;
  paciente: string;
  profesional: string;
  consultorio?: string | null;
};

export type CitaAtrasadaItem = {
  idCita: number;
  inicioISO: string;       // ya pasó
  minutosAtraso: number;   // ahora - inicio
  paciente: string;
  profesional: string;
  consultorio?: string | null;
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
    proximas10: ProximaCitaItem[];
    atrasadas: CitaAtrasadaItem[];   // 👈 NUEVO
    // ocupacion: KpiOcupacionItem[]; // 👈 REMOVIDO DEL TAB HOY, pero lo dejamos por si lo reusas en otro tab
    tiempos: KpiTiemposDTO;
    alertas: {
      sinConfirmar24h: AlertaSinConfirmar[];
      bloqueosActivos: AlertaBloqueo[];
      conflictos: ConflictoAgenda[];
    };
    colas: ColaDTO;
  };
} | { ok: false; error: string; details?: unknown };
