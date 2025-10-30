// src/components/dashboard/DashboardTabs.tsx
"use client";
import { useState, useEffect, Suspense } from "react";
import type { DashboardTab } from "@/lib/user-prefs";
import { savePreferredTab } from "@/lib/user-prefs.client";
import type { Rol } from "@/lib/rbac";
import { REGISTRY } from "./registry";
import SkeletonWidget from "./SkeletonWidget";

const TABS: DashboardTab[] = ["hoy","clinico","gestion","finanzas"];

export default function DashboardTabs({ role, initialTab }:{ role: Rol; initialTab: DashboardTab; }) {
  const [tab, setTab] = useState<DashboardTab>(initialTab);
  useEffect(()=>{ savePreferredTab(role, tab); }, [role, tab]);

  const widgets = (REGISTRY[tab] ?? []).filter(w => w.roles.includes(role));

  return (
    <div className="space-y-6">
      <nav aria-label="Contexto de dashboard" className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t}
            onClick={()=>setTab(t)}
            className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-2
              ${tab===t ? "bg-gray-900 text-white" : "bg-white text-gray-800 hover:bg-gray-50"}`}
            aria-current={tab===t ? "page" : undefined}
          >
            {labelTab(t)}
          </button>
        ))}
      </nav>

      {/* Grid adaptable por tipo de widgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        {widgets.map((W) => (
          <Suspense key={W.id} fallback={<SkeletonWidget />}>
            {/* Render server de cada widget */}
            {/* @ts-expect-error Async Server Component */}
            <W.Render role={role} />
          </Suspense>
        ))}
        {widgets.length === 0 && (
          <div className="text-sm text-gray-500">Sin widgets para este tab/rol por ahora.</div>
        )}
      </div>
    </div>
  );
}

function labelTab(t:DashboardTab){
  if (t==="hoy") return "Hoy";
  if (t==="clinico") return "Clínico";
  if (t==="gestion") return "Gestión";
  if (t==="finanzas") return "Finanzas";
  return t;
}
