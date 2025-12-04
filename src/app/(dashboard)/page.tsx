import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Rol } from "@/lib/rbac"
import UnifiedDashboard from "@/components/dashboard/server/UnifiedDashboard"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; [k: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session) redirect("/signin")
  const role: Rol = (session.user.role ?? "RECEP") as Rol

  const params = await searchParams
  const period = (params?.period as "today" | "last7days" | "last30days" | "currentMonth" | "lastMonth" | "last3Months") || "currentMonth"

  return (
    <div className="relative min-h-screen">
      {/* Content area with proper padding */}
      <div className="px-6 pb-6 space-y-6">
        <UnifiedDashboard role={role} period={period} />
      </div>
    </div>
  )
}
