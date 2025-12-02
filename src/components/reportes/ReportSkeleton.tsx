// src/components/reportes/ReportSkeleton.tsx
"use client"

/**
 * Report Skeleton Components
 * Loading states for various report elements.
 */

interface SkeletonProps {
  className?: string
}

/**
 * Base skeleton element with animation.
 */
function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  )
}

/**
 * Skeleton for KPI cards grid.
 */
export function KpiCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for data table.
 */
export function TableSkeleton({
  columns = 6,
  rows = 10,
}: {
  columns?: number
  rows?: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-gray-950">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Skeleton for filter form.
 */
export function FiltersSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
    </div>
  )
}

/**
 * Full page report skeleton.
 */
export function ReportPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Filters */}
      <FiltersSkeleton />

      {/* KPIs */}
      <KpiCardsSkeleton count={5} />

      {/* Table */}
      <TableSkeleton columns={6} rows={10} />
    </div>
  )
}

/**
 * Empty state component.
 */
export function EmptyState({
  title = "Sin datos",
  description = "No hay datos disponibles para mostrar.",
  icon,
  action,
}: {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 dark:border-gray-700 dark:bg-gray-900">
      {icon && (
        <div className="rounded-full bg-gray-200 p-3 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <div className="text-center">
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Error state component.
 */
export function ErrorState({
  title = "Error",
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-12 dark:border-red-900 dark:bg-red-950">
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900">
        <svg
          className="h-6 w-6 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="text-center">
        <h3 className="font-medium text-red-800 dark:text-red-200">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {description}
          </p>
        )}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

