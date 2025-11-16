// src/app/(dashboard)/clinico/kpis/page.tsx
import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { KpiFiltersBar } from "@/components/kpis/KpiFiltersBar"
import { KpiOverviewContent } from "@/components/kpis/KpiOverviewContent"
import { KpiGridSkeleton } from "@/components/kpis/KpiSkeleton"

export const dynamic = "force-dynamic"

export default async function KpisClinicosPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const role: "ADMIN" | "ODONT" | "RECEP" = session.user.role ?? "RECEP"
  if (!role || !["ADMIN", "ODONT", "RECEP"].includes(role)) {
    redirect("/dashboard")
  }

  if (!session.user.id) {
    redirect("/login")
  }

  const userId = Number.parseInt(session.user.id, 10)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">KPIs Clínicos</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Métricas operativas, clínicas y de calidad para la toma de decisiones
        </p>
      </div>

      {/* Filtros */}
      <KpiFiltersBar showAdvanced />

      {/* Contenido con Suspense */}
      <Suspense fallback={<KpiGridSkeleton count={8} />}>
        <KpiOverviewContent role={role} userId={userId} />
      </Suspense>
    </div>
  )
}
