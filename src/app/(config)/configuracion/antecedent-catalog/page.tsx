import { Suspense } from "react"
import { listAntecedentCatalogs } from "@/app/api/antecedent-catalog/_service"
import { AntecedentCatalogListQuerySchema } from "@/app/api/antecedent-catalog/_schemas"
import AntecedentCatalogTable from "@/components/admin/AntecedentCatalogTable"

export const metadata = {
  title: "Catálogo de Antecedentes | Administración",
  description: "Gestión del catálogo de antecedentes médicos",
}

export const dynamic = "force-dynamic"

interface AntecedentCatalogPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    category?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function AntecedentCatalogContent({ searchParams }: AntecedentCatalogPageProps) {
  const params = await searchParams
  
  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    category: params.category as "CARDIOVASCULAR" | "ENDOCRINE" | "RESPIRATORY" | "GASTROINTESTINAL" | "NEUROLOGICAL" | "SURGICAL_HISTORY" | "SMOKING" | "ALCOHOL" | "OTHER" | undefined,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "code" | "name" | "category" | "idAntecedentCatalog" | "createdAt" | undefined) || "code",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = AntecedentCatalogListQuerySchema.parse(filters)

  const result = await listAntecedentCatalogs(validatedFilters)

  // Envolver en formato esperado por AntecedentCatalogTable
  const antecedentCatalogResponse: { ok: true; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo de Antecedentes</h1>
        <p className="text-muted-foreground">Gestiona el catálogo de antecedentes médicos del sistema</p>
      </header>
      <AntecedentCatalogTable initialData={antecedentCatalogResponse} />
    </main>
  )
}

export default function AntecedentCatalogPage(props: AntecedentCatalogPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando catálogo de antecedentes...</div>
        </div>
      </main>
    }>
      <AntecedentCatalogContent {...props} />
    </Suspense>
  )
}

