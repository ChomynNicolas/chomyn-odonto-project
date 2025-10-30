// src/app/(dashboard)/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Rol } from "@/lib/rbac";
import { getUserPreferredTab, type DashboardTab } from "@/lib/user-prefs";
import TabSwitcher from "@/components/dashboard/TabSwitcher";
// server sections
import TabHoy from "@/components/dashboard/server/TabHoy";
// (en siguientes sprints: TabClinico, TabGestion, TabFinanzas)

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }:{ searchParams?: { tab?: DashboardTab; [k:string]: string|undefined } }) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = ((session.user as any)?.rolNombre ?? "RECEP") as Rol;

  // prioriza URL ?tab=..., si no hay, cae al cookie por rol
  const urlTab = (searchParams?.tab as DashboardTab | undefined);
  const cookieTab = await getUserPreferredTab(role);
  const currentTab: DashboardTab = urlTab ?? cookieTab;

  return (
    <div className="p-6 space-y-6">
      {/* Header + filtros (si usas filtros globales) */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="mt-3">
          <TabSwitcher role={role} currentTab={currentTab} />
        </div>
      </div>

      {/* Sección por tab — RENDER SERVER */}
      {currentTab === "hoy" && <TabHoy role={role} />}
      {currentTab === "clinico" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sección clínica en construcción.</p>
        </div>
      )}
      {currentTab === "gestion" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sección de gestión en construcción.</p>
        </div>
      )}
      {currentTab === "finanzas" && (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Sección de finanzas en construcción.</p>
        </div>
      )}
    </div>
  );
}
