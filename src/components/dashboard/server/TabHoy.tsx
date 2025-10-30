// src/components/dashboard/server/TabHoy.tsx  (SERVER COMPONENT)
import { buildDashboardKpi } from "@/app/api/dashboard/kpi/_service";
import type { Rol } from "@/lib/rbac";
import KpiCards from "@/components/dashboard/KpiCards";
import CitasProximas from "@/components/dashboard/CitasProximas";
import TiemposAtencion from "@/components/dashboard/TiemposAtencion";
import OcupacionConsultorios from "@/components/dashboard/OcupacionConsultorios";
import AlertasOperativas from "@/components/dashboard/AlertasOperativas";

export default async function TabHoy({ role }:{ role: Rol }) {
  const res = await buildDashboardKpi({ slotMin: 30 }, role);
  if (!res.ok) throw new Error("No se pudo cargar KPIs");
  const data = res.data;

  return (
    <div className="space-y-6">
      <KpiCards kpis={data.kpis} tiempos={data.tiempos} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
          <CitasProximas items={data.proximas10} />
      </div>
        <div className="lg:col-span-1 rounded-xl border bg-white p-4 shadow-sm">
          <TiemposAtencion tiempos={data.tiempos} colas={data.colas} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <OcupacionConsultorios items={data.ocupacion} />
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <AlertasOperativas alertas={data.alertas} />
        </div>
      </div>
    </div>
  );
}
