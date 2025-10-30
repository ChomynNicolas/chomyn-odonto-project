// src/components/dashboard/TabSwitcher.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { DashboardTab } from "@/lib/user-prefs";
import type { Rol } from "@/lib/rbac";

const TABS: DashboardTab[] = ["hoy","clinico","gestion","finanzas"];

export default function TabSwitcher({ role, currentTab }:{ role: Rol; currentTab: DashboardTab }) {
  const router = useRouter();
  const sp = useSearchParams();

  function setTab(tab: DashboardTab) {
    const qs = new URLSearchParams(sp.toString());
    qs.set("tab", tab);
    document.cookie = `chomyn.dashboard.tab=${tab}; path=/; max-age=${60*60*24*365}`;
    router.replace(`/?${qs.toString()}`);
  }

  return (
    <nav aria-label="Contexto de dashboard" className="flex flex-wrap gap-2">
      {TABS.map(t => (
        <button
          key={t}
          onClick={()=>setTab(t)}
          className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-2
            ${currentTab===t ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"}`}
          aria-current={currentTab===t ? "page" : undefined}
        >
          {t==="hoy"?"Hoy":t==="clinico"?"Clínico":t==="gestion"?"Gestión":"Finanzas"}
        </button>
      ))}
    </nav>
  );
}
