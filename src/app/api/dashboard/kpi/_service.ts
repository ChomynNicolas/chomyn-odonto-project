// src/app/api/dashboard/kpi/_service.ts
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, differenceInMinutes, addHours, isBefore } from "date-fns";
import type { GetKpiQuery } from "./_schemas";
import type {
  KpiCitasHoyDTO, KpiOcupacionItem, KpiTiemposDTO,
  AlertaSinConfirmar, AlertaBloqueo, ConflictoAgenda, DashboardKpiResponse
} from "./_dto";
import { EstadoCita } from "@prisma/client";

const ACTIVE_STATES: EstadoCita[] = ["SCHEDULED","CONFIRMED","CHECKED_IN","IN_PROGRESS"];

export async function buildDashboardKpi(params: GetKpiQuery, role: "RECEP" | "ODONT" | "ADMIN") : Promise<DashboardKpiResponse> {
  const hoy = params.fecha ? new Date(params.fecha) : new Date();
  const desde = startOfDay(hoy);
  const hasta = endOfDay(hoy);

  // Scopes por rol
  const scopeCita:any = { inicio: { gte: desde, lte: hasta } };
  if (role === "ODONT" && params.profesionalId) scopeCita.profesionalId = params.profesionalId;
  if (role !== "ADMIN" && params.consultorioId) scopeCita.consultorioId = params.consultorioId;

  // 1) KPIs rápidos
  const [total, confirmadas, canceladas, noShow] = await Promise.all([
    prisma.cita.count({ where: scopeCita }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CONFIRMED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "CANCELLED" } }),
    prisma.cita.count({ where: { ...scopeCita, estado: "NO_SHOW" } }),
  ]);
  const kpis: KpiCitasHoyDTO = { total, confirmadas, canceladas, noShow };

  // 2) Próximas 10 citas (a partir de ahora)
  const proximas = await prisma.cita.findMany({
    where: { ...scopeCita, inicio: { gte: new Date() } },
    orderBy: { inicio: "asc" },
    take: 10,
    select: {
      idCita: true, inicio: true, estado: true,
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      paciente: { select: { persona: { select: { nombres: true, apellidos: true } } } },
      consultorio: { select: { nombre: true } },
    }
  });

  // 3) Ocupación por consultorio (slots de 'slotMin' minutos)
  //   estrategia: contar citas activas en el día + bloqueos que tocan el rango
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

  const ocupacion: KpiOcupacionItem[] = consultorios.map(c => {
    const ocupadas = citasCount.get(c.idConsultorio) ?? 0;
    const bloqueos = bloqueosCount.get(c.idConsultorio) ?? 0; // aproximación (#bloqueos, no duración)
    const libres = Math.max(totalSlots - ocupadas - bloqueos, 0);
    return {
      consultorioId: c.idConsultorio,
      nombre: c.nombre,
      colorHex: c.colorHex,
      slots: totalSlots,
      ocupadas, bloqueos, libres,
    };
  });

  // 4) Tiempos de atención (startedAt → completedAt)
  const atencionesHoy = await prisma.cita.findMany({
    where: { ...scopeCita, startedAt: { gte: desde }, completedAt: { lte: hasta } },
    select: { startedAt: true, completedAt: true },
  });
  const duraciones = atencionesHoy
    .map(a => differenceInMinutes(a.completedAt!, a.startedAt!))
    .filter(n => Number.isFinite(n) && n >= 0)
    .sort((a,b)=>a-b);

  const promedio = duraciones.length
    ? Math.round(duraciones.reduce((s,n)=>s+n,0) / duraciones.length)
    : null;
  const mediana = duraciones.length
    ? (duraciones.length%2===1
      ? duraciones[(duraciones.length-1)/2]
      : Math.round((duraciones[duraciones.length/2 -1] + duraciones[duraciones.length/2])/2))
    : null;
  const tiempos: KpiTiemposDTO = {
    atencionesHoy: duraciones.length,
    promedioMin: promedio,
    medianaMin: mediana,
  };

  // 5) Alertas
  // 5.a) Sin confirmación (<24h): citas con estado SCHEDULED que empiezan dentro de 24h
  const dentro24h = addHours(new Date(), 24);
  const sinConfirmar = await prisma.cita.findMany({
    where: { estado: "SCHEDULED", inicio: { gte: new Date(), lte: dentro24h }, ...(scopeCita.profesionalId && { profesionalId: scopeCita.profesionalId }) },
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
    horasFaltantes: Math.max(0, Math.round(differenceInMinutes(c.inicio, new Date())/60)),
  }));

  // 5.b) Bloqueos activos (que tocan hoy)
  const bloqueosAct = await prisma.bloqueoAgenda.findMany({
    where: { activo: true, desde: { lte: hasta }, hasta: { gte: desde } },
    select: {
      idBloqueoAgenda: true, desde: true, hasta: true, tipo: true,
      consultorio: { select: { nombre: true } },
      profesional: { select: { persona: { select: { nombres: true, apellidos: true } } } }
    },
    orderBy: { desde: "asc" }
  });
  const bloqueosActivos: AlertaBloqueo[] = bloqueosAct.map(b => ({
    idBloqueoAgenda: b.idBloqueoAgenda,
    desdeISO: b.desde.toISOString(),
    hastaISO: b.hasta.toISOString(),
    tipo: b.tipo,
    consultorio: b.consultorio?.nombre ?? null,
    profesional: b.profesional ? `${b.profesional.persona.nombres} ${b.profesional.persona.apellidos}` : null,
  }));

  // 5.c) Conflictos de agenda (solapamientos hoy, profesional/consultorio)
  // estrategia simple: buscar pares que se crucen (para producción, usa constraint DB + job off-line)
  const activas = await prisma.cita.findMany({
    where: { ...scopeCita, estado: { in: ACTIVE_STATES } },
    select: { idCita: true, inicio: true, fin: true, profesionalId: true, consultorioId: true }
  });
  const conflictos: ConflictoAgenda[] = [];
  // O(n^2) sobre el día — aceptable para volúmenes moderados; si crece, migrar a query SQL especializada
  for (let i=0;i<activas.length;i++){
    for (let j=i+1;j<activas.length;j++){
      const A = activas[i], B = activas[j];
      const overlap = !(A.fin <= B.inicio || B.fin <= A.inicio);
      if (!overlap) continue;
      const solapMin = Math.min(differenceInMinutes(A.fin, B.inicio), differenceInMinutes(B.fin, A.inicio)) * -1;
      if (A.profesionalId === B.profesionalId) {
        conflictos.push({ recurso: "PROFESIONAL", recursoId: A.profesionalId, idCitaA: A.idCita, idCitaB: B.idCita, solapadoMin: Math.abs(solapMin) });
      }
      if (A.consultorioId && B.consultorioId && A.consultorioId === B.consultorioId) {
        conflictos.push({ recurso: "CONSULTORIO", recursoId: A.consultorioId, idCitaA: A.idCita, idCitaB: B.idCita, solapadoMin: Math.abs(solapMin) });
      }
    }
  }

  // 6) Colas (CHECKED_IN / IN_PROGRESS)
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
      kpis, proximas10: proximas.map(p => ({
        idCita: p.idCita,
        inicioISO: p.inicio.toISOString(),
        estado: p.estado,
        paciente: `${p.paciente.persona.nombres} ${p.paciente.persona.apellidos}`.trim(),
        profesional: `${p.profesional.persona.nombres} ${p.profesional.persona.apellidos}`.trim(),
        consultorio: p.consultorio?.nombre ?? null,
      })),
      ocupacion, tiempos,
      alertas: { sinConfirmar24h, bloqueosActivos, conflictos },
      colas,
    }
  };
}
