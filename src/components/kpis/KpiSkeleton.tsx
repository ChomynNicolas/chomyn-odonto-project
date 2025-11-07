// src/components/kpis/KpiSkeleton.tsx

export function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-9 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}

export function KpiGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function KpiChartSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-64 animate-pulse rounded bg-gray-100 dark:bg-gray-900" />
    </div>
  )
}
