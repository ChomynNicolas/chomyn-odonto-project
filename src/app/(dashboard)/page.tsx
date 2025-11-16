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
  const role: Rol = (session.user.role ?? "RECEP") as Rol

  const params = await searchParams
  const urlTab = params?.tab as DashboardTab | undefined
  const cookieTab = await getUserPreferredTab(role)
  const currentTab: DashboardTab = urlTab ?? cookieTab

  return (
    <div className="relative min-h-screen">
      {/* Sticky Tab Navigation */}
      <TabSwitcher role={role} currentTab={currentTab} />

      {/* Content area with proper padding */}
      <div className="px-6 pb-6 space-y-6">
        {/* Sección por tab — RENDER SERVER */}
        {currentTab === "hoy" && <TabHoy role={role} />}
        {currentTab === "clinico" && <TabClinico role={role} />}
        {currentTab === "gestion" && <TabGestion role={role} />}
        {currentTab === "finanzas" && <TabFinanzas role={role} />}
      </div>
    </div>
  )
}
