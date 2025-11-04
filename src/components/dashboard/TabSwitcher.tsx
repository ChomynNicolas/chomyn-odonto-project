// src/components/dashboard/TabSwitcher.tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import type { DashboardTab } from "@/lib/user-prefs"
import type { Rol } from "@/lib/rbac"

const TABS: DashboardTab[] = ["hoy", "clinico", "gestion", "finanzas"]

export default function TabSwitcher({ role, currentTab }: { role: Rol; currentTab: DashboardTab }) {
  const router = useRouter()
  const sp = useSearchParams()

  function setTab(tab: DashboardTab) {
    const qs = new URLSearchParams(sp.toString())
    qs.set("tab", tab)
    document.cookie = `chomyn.dashboard.tab=${tab}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.replace(`/?${qs.toString()}`)
  }

  return (
    <nav aria-label="Contexto de dashboard" className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            ${currentTab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent hover:text-accent-foreground"}`}
          aria-current={currentTab === t ? "page" : undefined}
        >
          {t === "hoy" ? "Hoy" : t === "clinico" ? "Clínico" : t === "gestion" ? "Gestión" : "Finanzas"}
        </button>
      ))}
    </nav>
  )
}
