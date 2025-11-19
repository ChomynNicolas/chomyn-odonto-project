import { Suspense } from "react"
import { listProcedimientos } from "@/app/api/admin/procedimientos/_service"
import { ProcedimientoListQuerySchema } from "@/app/api/admin/procedimientos/_schemas"
import ProcedimientosTable from "@/components/admin/ProcedimientosTable"

export const metadata = {
  title: "Procedimientos | Administración",
  description: "Gestión del catálogo de procedimientos clínicos",
}

export const dynamic = "force-dynamic"

interface ProcedimientosPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    activo?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function ProcedimientosContent({ searchParams }: ProcedimientosPageProps) {
  const params = await searchParams

  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    activo: (params.activo as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "code" | "nombre" | "idProcedimiento" | "updatedAt" | undefined) || "code",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = ProcedimientoListQuerySchema.parse(filters)

  const result = await listProcedimientos(validatedFilters)

  // Envolver en formato esperado por ProcedimientosTable
  const procedimientosResponse: {
    ok: boolean
    data: typeof result.data
    meta: typeof result.meta
  } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Procedimientos</h1>
        <p className="text-muted-foreground">
          Gestiona el catálogo de procedimientos clínicos del sistema
        </p>
      </header>
      <ProcedimientosTable initialData={procedimientosResponse} />
    </main>
  )
}

export default function ProcedimientosPage(props: ProcedimientosPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando procedimientos...</div>
          </div>
        </main>
      }
    >
      <ProcedimientosContent {...props} />
    </Suspense>
  )
}

