import { Suspense } from "react"
import { listAllergyCatalogs } from "@/app/api/allergies/_service"
import { AllergyCatalogListQuerySchema } from "@/app/api/allergies/_schemas"
import AllergyCatalogTable from "@/components/admin/AllergyCatalogTable"

export const metadata = {
  title: "Catálogo de Alergias | Administración",
  description: "Gestión del catálogo de alergias del sistema",
}

export const dynamic = "force-dynamic"

interface AllergyCatalogPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function AllergyCatalogContent({ searchParams }: AllergyCatalogPageProps) {
  const params = await searchParams

  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "name" | "idAllergyCatalog" | "createdAt" | undefined) || "name",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = AllergyCatalogListQuerySchema.parse(filters)

  const result = await listAllergyCatalogs(validatedFilters)

  // Envolver en formato esperado por AllergyCatalogTable
  const allergyCatalogResponse: { ok: true; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo de Alergias</h1>
        <p className="text-muted-foreground">Gestiona el catálogo de alergias del sistema</p>
      </header>
      <AllergyCatalogTable initialData={allergyCatalogResponse} />
    </main>
  )
}

export default function AllergyCatalogPage(props: AllergyCatalogPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando catálogo de alergias...</div>
          </div>
        </main>
      }
    >
      <AllergyCatalogContent {...props} />
    </Suspense>
  )
}

