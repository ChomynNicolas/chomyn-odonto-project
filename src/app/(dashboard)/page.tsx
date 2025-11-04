import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import { getUserPreferredTab, type DashboardTab } from "@/lib/user-prefs"
import TabSwitcher from "@/components/dashboard/TabSwitcher"
import TabHoy from "@/components/dashboard/server/TabHoy"
import TabClinico from "@/components/dashboard/server/TabClinico"
import TabFinanzas from "@/components/dashboard/server/TabFinanzas"
import TabGestion from "@/components/dashboard/server/TabGestion"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: { searchParams?: Promise<{ tab?: DashboardTab; [k: string]: string | undefined }> }) {
  const session = await auth()
  if (!session) redirect("/signin")
  const role = ((session.user as any)?.role ?? "RECEP") as Rol

  const params = await searchParams
  const urlTab = params?.tab as DashboardTab | undefined
  const cookieTab = await getUserPreferredTab(role)
  const currentTab: DashboardTab = urlTab ?? cookieTab

  return (
    <div className="p-6 space-y-6">
      {/* Header + filtros */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        </div>
        <div className="mt-3">
          <TabSwitcher role={role} currentTab={currentTab} />
        </div>
      </div>

      {/* Sección por tab — RENDER SERVER */}
      {currentTab === "hoy" && <TabHoy role={role} />}
      {currentTab === "clinico" && <TabClinico role={role} />}
      {currentTab === "gestion" && <TabGestion role={role} />}
      {currentTab === "finanzas" && <TabFinanzas role={role} />}
    </div>
  )
}
