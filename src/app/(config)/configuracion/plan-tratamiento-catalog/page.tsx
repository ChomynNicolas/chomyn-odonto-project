import { Suspense } from "react"
import { listTreatmentPlanCatalogs } from "@/app/api/treatment-plan-catalog/_service"
import { TreatmentPlanCatalogListQuerySchema } from "@/app/api/treatment-plan-catalog/_schemas"
import TreatmentPlanCatalogTable from "@/components/admin/TreatmentPlanCatalogTable"

export const metadata = {
  title: "Catálogo de Planes de Tratamiento | Administración",
  description: "Gestión del catálogo de planes de tratamiento",
}

export const dynamic = "force-dynamic"

interface TreatmentPlanCatalogPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function TreatmentPlanCatalogContent({ searchParams }: TreatmentPlanCatalogPageProps) {
  const params = await searchParams
  
  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "code" | "nombre" | "idTreatmentPlanCatalog" | "createdAt" | undefined) || "code",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = TreatmentPlanCatalogListQuerySchema.parse(filters)

  const result = await listTreatmentPlanCatalogs(validatedFilters)

  // Envolver en formato esperado por TreatmentPlanCatalogTable
  const catalogResponse: { ok: true; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo de Planes de Tratamiento</h1>
        <p className="text-muted-foreground">
          Gestiona el catálogo de planes de tratamiento del sistema
        </p>
      </header>
      <TreatmentPlanCatalogTable initialData={catalogResponse} />
    </main>
  )
}

export default function TreatmentPlanCatalogPage(props: TreatmentPlanCatalogPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando catálogo de planes de tratamiento...</div>
          </div>
        </main>
      }
    >
      <TreatmentPlanCatalogContent {...props} />
    </Suspense>
  )
}

