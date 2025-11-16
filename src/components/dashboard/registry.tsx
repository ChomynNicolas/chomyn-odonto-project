// src/dashboard/registry.ts

import type { Rol } from "@/lib/rbac";

// Cada widget puede ser RSC (server) o Client Component.
// Aquí guardamos metadatos para ordenar/renderizar.
export type WidgetDef = {
  id: string;
  title: string;
  roles: Rol[];
  // Render es una función que devuelve JSX. Para RSC, importa el componente server directamente.
  Render: (props: { role: Rol }) => JSX.Element | Promise<JSX.Element>;
};

import KpiCards from "@/components/dashboard/KpiCards";
import CitasProximas from "@/components/dashboard/CitasProximas";
import OcupacionConsultorios from "@/components/dashboard/OcupacionConsultorios";
import TiemposAtencion from "@/components/dashboard/FlujoAtencion";
import AlertasOperativas from "@/components/dashboard/AlertasOperativas";

// Tab "hoy": ordenamos por valor (KPIs -> próximas -> tiempos/colas -> ocupación -> alertas)
export const REGISTRY: Record<DashboardTab, WidgetDef[]> = {
  hoy: [
    { id:"kpis", title:"KPIs del día", roles:["RECEP","ODONT","ADMIN"], Render: async ({role}) => (<KpiCardsWrapper role={role} />) },
    { id:"proximas", title:"Próximas 10", roles:["RECEP","ODONT","ADMIN"], Render: async ({role}) => (<CitasProximasWrapper role={role} />) },
    { id:"tiempos-colas", title:"Tiempos & Colas", roles:["RECEP","ODONT","ADMIN"], Render: async ({role}) => (<TiemposWrapper role={role} />) },
    { id:"ocupacion", title:"Ocupación", roles:["RECEP","ODONT","ADMIN"], Render: async ({role}) => (<OcupacionWrapper role={role} />) },
    { id:"alertas", title:"Alertas", roles:["RECEP","ODONT","ADMIN"], Render: async ({role}) => (<AlertasWrapper role={role} />) },
  ],
  clinico: [],
  gestion: [],
  finanzas: [],
};

// Los wrappers son RSC para consumir el servicio una sola vez y pasar props a componentes.
import { buildDashboardKpi } from "@/app/api/dashboard/kpi/_service";
import { JSX } from "react";
import { DashboardTab } from "@/lib/user-prefs";

async function fetchKpi(role: Rol) {
  const res = await buildDashboardKpi({ slotMin: 30 }, role);
  if (!res.ok) throw new Error("No se pudo cargar KPIs");
  return res.data;
}

async function KpiCardsWrapper({ role }:{ role: Rol }) {
  const data = await fetchKpi(role);
  return <KpiCards kpis={data.kpis} tiempos={data.tiempos} />;
}
async function CitasProximasWrapper({ role }:{ role: Rol }) {
  const data = await fetchKpi(role);
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <CitasProximas items={data.proximas10} atrasadas={data.atrasadas} />
    </div>
  );
}
async function TiemposWrapper({ role }:{ role: Rol }) {
  const data = await fetchKpi(role);
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <TiemposAtencion tiempos={data.tiempos} colas={data.colas} />
    </div>
  );
}
async function OcupacionWrapper({ role }:{ role: Rol }) {
  const data = await fetchKpi(role);
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <OcupacionConsultorios items={data.ocupacion} />
    </div>
  );
}
async function AlertasWrapper({ role }:{ role: Rol }) {
  const data = await fetchKpi(role);
  const resumen = {
    sinConfirmar24h: data.alertas.sinConfirmar24h.length,
    atrasadas: data.atrasadas.length,
    conflictos: data.alertas.conflictos.length,
    bloqueos: data.alertas.bloqueosActivos.length,
  };
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <AlertasOperativas alertas={data.alertas} resumen={resumen} />
    </div>
  );
}
