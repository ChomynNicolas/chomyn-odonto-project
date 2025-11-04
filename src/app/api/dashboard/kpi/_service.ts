// src/app/api/dashboard/kpi/_service.ts  (actualiza cálculos)
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, differenceInMinutes, addHours, isBefore } from "date-fns";
import type { GetKpiQuery } from "./_schemas";
import type {
  KpiCitasHoyDTO, KpiOcupacionItem, KpiTiemposDTO,
  AlertaSinConfirmar, AlertaBloqueo, ConflictoAgenda, DashboardKpiResponse, CitaAtrasadaItem
} from "./_dto";
import { EstadoCita } from "@prisma/client";

const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED","CONFIRMED","CHECKED_IN","IN_PROGRESS"];

export async function buildDashboardKpi(params: GetKpiQuery, role: "RECEP" | "ODONT" | "ADMIN") : Promise<DashboardKpiResponse> {
  const hoy = params.fecha ? new Date(params.fecha) : new Date();
  const desde = startOfDay(hoy);
  const hasta = endOfDay(hoy);
  const ahora = new Date();

  // Scopes por rol
  const scopeCita:any = { inicio: { gte: desde, lte: hasta } };
  if (role === "ODONT" && params.profesionalId) scopeCita.profesionalId = params.profesionalId;
  if (role !== "ADMIN" && params.consultorioId) scopeCita.consultorioId = params.consultorioId;

  // 1) KPIs rápidos + tasas
  const [total, confirmadas, canceladas, noShow] = await Promise.all([
    prisma.cita.count({ where: scopeCita }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CONFIRMED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CANCELLED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "NO_SHOW" } }),
  ]);

  const pct = (n:number, d:number) => d > 0 ? Math.round((n / d) * 100) : 0;

  // 5.a) Sin confirmación (<24h) para card rápida
  const dentro24h = addHours(ahora, 24);
  const sinConfCount = await prisma.cita.count({
    where: { ...scopeCita, estado: "SCHEDULED", inicio: { gte: ahora, lte: dentro24h } },
  });

  const kpis: KpiCitasHoyDTO = {
    total, confirmadas, canceladas, noShow,
    confirmRate: pct(confirmadas, total),
    cancelRate: pct(canceladas, total),
    noShowRate: pct(noShow, total),
    sinConfirmar24h: sinConfCount,
  };

  // 2) Próximas 10
  const proximas = await prisma.cita.findMany({
    where: { ...scopeCita, inicio: { gte: ahora } },
    orderBy: { inicio: "asc" },
    take: 10,
    select: {
      idCita: true, inicio: true, estado: true,
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { nombre: true } },
    }
  });

  // NUEVO: 2.b) Citas atrasadas (inicio < ahora y estado no finalizado/cancelado/no-show)
  const atrasadasRaw = await prisma.cita.findMany({
    where: {
      ...scopeCita,
      inicio: { lt: ahora },
      estado: { in: ["SCHEDULED","CONFIRMED","CHECKED_IN"] },
    },
    orderBy: { inicio: "asc" },
    select: {
      idCita: true, inicio: true,
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { nombre: true } },
    }
  });

  const atrasadas: CitaAtrasadaItem[] = atrasadasRaw.map(a => ({
    idCita: a.idCita,
    inicioISO: a.inicio.toISOString(),
    minutosAtraso: Math.max(0, differenceInMinutes(ahora, a.inicio)),
    paciente: `${a.paciente.persona.nombres} ${a.paciente.persona.apellidos}`.trim(),
    profesional: `${a.profesional.persona.nombres} ${a.profesional.persona.apellidos}`.trim(),
    consultorio: a.consultorio?.nombre ?? null,
  }));

  // 3) (dejamos ocupación calculable pero NO lo usamos en TabHoy)
  const consultorios = await prisma.consultorio.findMany({
    where: { activo: true },
    select: { idConsultorio: true, nombre: true, colorHex: true }
  });
  const slot = params.slotMin ?? 30;
  const totalSlots = Math.ceil(differenceInMinutes(hasta, desde) / slot);
  const [citasDia, bloqueosDia] = await Promise.all([
    prisma.cita.groupBy({
      by: ["consultorioId"],
      where: { ...scopeCita, estado: { in: ACTIVE_STATES } },
      _count: { _all: true },
    }),
    prisma.bloqueoAgenda.groupBy({
      by: ["consultorioId"],
      where: { activo: true, desde: { lte: hasta }, hasta: { gte: desde } },
      _count: { _all: true },
    })
  ]);
  const citasCount = new Map<number, number>();
  citasDia.forEach(r => { if (r.consultorioId) citasCount.set(r.consultorioId, r._count._all); });
  const bloqueosCount = new Map<number, number>();
  bloqueosDia.forEach(r => { if (r.consultorioId) bloqueosCount.set(r.consultorioId, r._count._all); });
  const ocupacion = consultorios.map(c => ({
    consultorioId: c.idConsultorio,
    nombre: c.nombre,
    colorHex: c.colorHex,
    slots: totalSlots,
    ocupadas: citasCount.get(c.idConsultorio) ?? 0,
    bloqueos: bloqueosCount.get(c.idConsultorio) ?? 0,
    libres: Math.max(totalSlots - (citasCount.get(c.idConsultorio) ?? 0) - (bloqueosCount.get(c.idConsultorio) ?? 0), 0),
  }));

  // 4) Tiempos
  const atencionesHoy = await prisma.cita.findMany({
    where: { ...scopeCita, startedAt: { gte: desde }, completedAt: { lte: hasta } },
    select: { startedAt: true, completedAt: true },
  });
  const duraciones = atencionesHoy
    .map(a => differenceInMinutes(a.completedAt!, a.startedAt!))
    .filter(n => Number.isFinite(n) && n >= 0)
    .sort((a,b)=>a-b);

  const promedio = duraciones.length ? Math.round(duraciones.reduce((s,n)=>s+n,0) / duraciones.length) : null;
  const mediana = duraciones.length
    ? (duraciones.length%2===1
      ? duraciones[(duraciones.length-1)/2]
      : Math.round((duraciones[duraciones.length/2 -1] + duraciones[duraciones.length/2])/2))
    : null;
  const tiempos: KpiTiemposDTO = { atencionesHoy: duraciones.length, promedioMin: promedio, medianaMin: mediana };

  // 5) Alertas (listas)
  const sinConfirmar = await prisma.cita.findMany({
    where: { ...scopeCita, estado: "SCHEDULED", inicio: { gte: ahora, lte: dentro24h } },
    orderBy: { inicio: "asc" },
    select: {
      idCita: true, inicio: true,
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
    }
  });
  const sinConfirmar24h: AlertaSinConfirmar[] = sinConfirmar.map(c => ({
    idCita: c.idCita,
    inicioISO: c.inicio.toISOString(),
    paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`.trim(),
    profesional: `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}`.trim(),
    horasFaltantes: Math.max(0, Math.round(differenceInMinutes(c.inicio, ahora)/60)),
  }));

  const bloqueosActRaw = await prisma.bloqueoAgenda.findMany({
    where: { activo: true, desde: { lte: hasta }, hasta: { gte: desde } },
    select: {
      idBloqueoAgenda: true, desde: true, hasta: true, tipo: true,
      consultorio: { select: { nombre: true } },
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } }
    },
    orderBy: { desde: "asc" }
  });
  const bloqueosActivos: AlertaBloqueo[] = bloqueosActRaw.map(b => ({
    idBloqueoAgenda: b.idBloqueoAgenda,
    desdeISO: b.desde.toISOString(),
    hastaISO: b.hasta.toISOString(),
    tipo: b.tipo,
    consultorio: b.consultorio?.nombre ?? null,
    profesional: b.profesional ? `${b.profesional.persona.nombres} ${b.profesional.persona.apellidos}` : null,
  }));

  const activas = await prisma.cita.findMany({
    where: { ...scopeCita, estado: { in: ACTIVE_STATES } },
    select: { idCita: true, inicio: true, fin: true, profesionalId: true, consultorioId: true }
  });
  const conflictos: ConflictoAgenda[] = [];
  for (let i=0;i<activas.length;i++){
    for (let j=i+1;j<activas.length;j++){
      const A = activas[i], B = activas[j];
      const overlap = !(A.fin <= B.inicio || B.fin <= A.inicio);
      if (!overlap) continue;
      const solapadoMin = Math.max(0, Math.min(
        differenceInMinutes(A.fin, B.inicio),
        differenceInMinutes(B.fin, A.inicio)
      ) * -1);
      if (A.profesionalId === B.profesionalId) {
        conflictos.push({ recurso: "PROFESIONAL", recursoId: A.profesionalId, idCitaA: A.idCita, idCitaB: B.idCita, solapadoMin });
      }
      if (A.consultorioId && B.consultorioId && A.consultorioId === B.consultorioId) {
        conflictos.push({ recurso: "CONSULTORIO", recursoId: A.consultorioId, idCitaA: A.idCita, idCitaB: B.idCita, solapadoMin });
      }
    }
  }

  // 6) Colas
  const [colaCheckIn, colaInProgress] = await Promise.all([
    prisma.cita.findMany({
      where: { ...scopeCita, estado: "CHECKED_IN" },
      select: {
        idCita: true, inicio: true,
        paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
        consultorio: { select: { nombre: true } },
      }, orderBy: { checkedInAt: "asc" }
    }),
    prisma.cita.findMany({
      where: { ...scopeCita, estado: "IN_PROGRESS" },
      select: {
        idCita: true, inicio: true,
        paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
        profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      }, orderBy: { startedAt: "asc" }
    })
  ]);

  const colas = {
    checkIn: colaCheckIn.map(c => ({
      idCita: c.idCita,
      hora: c.inicio.toISOString(),
      paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`,
      consultorio: c.consultorio?.nombre ?? null,
    })),
    enAtencion: colaInProgress.map(c => ({
      idCita: c.idCita,
      hora: c.inicio.toISOString(),
      paciente: `${c.paciente.persona.nombres} ${c.paciente.persona.apellidos}`,
      profesional: c.profesional?.persona ? `${c.profesional.persona.nombres} ${c.profesional.persona.apellidos}` : "",
    })),
  };

  return {
    ok: true,
    data: {
      fecha: desde.toISOString().slice(0,10),
      kpis,
      proximas10: proximas.map(p => ({
        idCita: p.idCita,
        inicioISO: p.inicio.toISOString(),
        estado: p.estado,
        paciente: `${p.paciente.persona.nombres} ${p.paciente.persona.apellidos}`.trim(),
        profesional: `${p.profesional.persona.nombres} ${p.profesional.persona.apellidos}`.trim(),
        consultorio: p.consultorio?.nombre ?? null,
      })),
      atrasadas,  // 👈 nuevo
      ocupacion,  // aunque no lo mostrarás en “Hoy”, se mantiene disponible
      tiempos,
      alertas: { sinConfirmar24h, bloqueosActivos, conflictos },
      colas,
    }
  };
}
