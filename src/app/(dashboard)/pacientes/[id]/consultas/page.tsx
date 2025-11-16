import { Suspense } from "react"
import { ConsultasView } from "@/components/pacientes/consultas/ConsultasView"
import { Skeleton } from "@/components/ui/skeleton"

export default async function ConsultasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Consultas y Procedimientos</h2>
        <p className="text-muted-foreground">Historial de consultas realizadas y procedimientos aplicados</p>
      </div>

      <Suspense fallback={<ConsultasViewSkeleton />}>
        <ConsultasView pacienteId={id} />
      </Suspense>
    </div>
  )
}

function ConsultasViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
