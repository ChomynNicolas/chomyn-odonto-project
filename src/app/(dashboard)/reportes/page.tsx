// src/app/(dashboard)/reportes/page.tsx
/**
 * Reports Landing Page
 * Displays available reports based on user role with cards and descriptions.
 */

import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  Users,
  Stethoscope,
  PieChart,
  TrendingUp,
  ChevronRight,
  Shield,
  type LucideIcon,
} from "lucide-react"
import { getAccessibleReports, type ReportConfig, type ReportRole } from "@/types/reportes"

export const dynamic = "force-dynamic"

/** Icon map for report types */
const ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  Users,
  Stethoscope,
  PieChart,
  TrendingUp,
}

/** Category badge colors */
const CATEGORY_COLORS: Record<string, string> = {
  operativo: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  clinico: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  financiero: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
}

/** Category labels */
const CATEGORY_LABELS: Record<string, string> = {
  operativo: "Operativo",
  clinico: "Clínico",
  financiero: "Financiero",
}

export default async function ReportesPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/signin")
  }

  const role = (session.user.role ?? "RECEP") as ReportRole
  const reports = getAccessibleReports(role)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          Reportes
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Genera reportes y análisis para la toma de decisiones. 
          Selecciona un reporte para comenzar.
        </p>
      </div>

      {/* Role indicator */}
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <Shield className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Tienes acceso como <strong className="font-medium text-gray-900 dark:text-gray-100">{role}</strong> a{" "}
          <strong className="font-medium text-gray-900 dark:text-gray-100">{reports.length}</strong> reportes.
        </span>
      </div>

      {/* Reports Grid */}
      <Suspense fallback={<ReportsGridSkeleton />}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.type} report={report} />
          ))}
        </div>
      </Suspense>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
          <div className="rounded-full bg-gray-200 p-3 dark:bg-gray-800">
            <PieChart className="h-6 w-6 text-gray-500" />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Sin acceso a reportes
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tu rol actual no tiene permisos para ver ningún reporte.
              Contacta al administrador si necesitas acceso.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual report card component.
 */
function ReportCard({ report }: { report: ReportConfig }) {
  const Icon = ICON_MAP[report.icon] ?? PieChart
  const categoryColor = CATEGORY_COLORS[report.category] ?? CATEGORY_COLORS.operativo
  const categoryLabel = CATEGORY_LABELS[report.category] ?? report.category

  // Map report type to URL slug
  const href = `/reportes/${report.type}`

  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-700"
    >
      {/* Header with icon and category */}
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryColor}`}>
          {categoryLabel}
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
          {report.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {report.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="flex gap-1">
          {report.allowedRoles.map((r) => (
            <span
              key={r}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {r}
            </span>
          ))}
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
      </div>
    </Link>
  )
}

/**
 * Loading skeleton for reports grid.
 */
function ReportsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="flex gap-1">
              <div className="h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

