// src/app/(dashboard)/citas/page.tsx
import { Suspense } from "react"
import { CitasSearchPage } from "@/components/agenda/CitasSearchPage"
import { Skeleton } from "@/components/ui/skeleton"

export default function CitasPage() {
  return (
    <Suspense fallback={<CitasPageSkeleton />}>
      <CitasSearchPage />
    </Suspense>
  )
}

function CitasPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

