import { Suspense } from "react"
import { listEspecialidades } from "@/app/api/admin/especialidades/_service"
import { EspecialidadListQuerySchema } from "@/app/api/admin/especialidades/_schemas"
import EspecialidadesTable from "@/components/admin/EspecialidadesTable"

export const metadata = {
  title: "Especialidades | Administración",
  description: "Gestión del catálogo de especialidades dentales",
}

export const dynamic = "force-dynamic"

interface EspecialidadesPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function EspecialidadesContent({ searchParams }: EspecialidadesPageProps) {
  const params = await searchParams
  
  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "nombre" | "idEspecialidad" | undefined) || "nombre",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = EspecialidadListQuerySchema.parse(filters)

  const result = await listEspecialidades(validatedFilters)

  // Envolver en formato esperado por EspecialidadesTable
  const especialidadesResponse: { ok: boolean; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Especialidades</h1>
        <p className="text-muted-foreground">Gestiona el catálogo de especialidades dentales del sistema</p>
      </header>
      <EspecialidadesTable initialData={especialidadesResponse} />
    </main>
  )
}

export default function EspecialidadesPage(props: EspecialidadesPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando especialidades...</div>
        </div>
      </main>
    }>
      <EspecialidadesContent {...props} />
    </Suspense>
  )
}

