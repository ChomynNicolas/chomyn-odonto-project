import { Suspense } from "react"
import { listDiagnosisCatalogs } from "@/app/api/diagnosis-catalog/_service"
import { DiagnosisCatalogListQuerySchema } from "@/app/api/diagnosis-catalog/_schemas"
import DiagnosisCatalogTable from "@/components/admin/DiagnosisCatalogTable"

export const metadata = {
  title: "Catálogo de Diagnósticos | Administración",
  description: "Gestión del catálogo de diagnósticos (ICD-10 y códigos internos)",
}

export const dynamic = "force-dynamic"

interface DiagnosisCatalogPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function DiagnosisCatalogContent({ searchParams }: DiagnosisCatalogPageProps) {
  const params = await searchParams
  
  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "code" | "name" | "idDiagnosisCatalog" | "createdAt" | undefined) || "code",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = DiagnosisCatalogListQuerySchema.parse(filters)

  const result = await listDiagnosisCatalogs(validatedFilters)

  // Envolver en formato esperado por DiagnosisCatalogTable
  const diagnosisCatalogResponse: { ok: true; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo de Diagnósticos</h1>
        <p className="text-muted-foreground">Gestiona el catálogo de diagnósticos del sistema (ICD-10 y códigos internos)</p>
      </header>
      <DiagnosisCatalogTable initialData={diagnosisCatalogResponse} />
    </main>
  )
}

export default function DiagnosisCatalogPage(props: DiagnosisCatalogPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando catálogo de diagnósticos...</div>
        </div>
      </main>
    }>
      <DiagnosisCatalogContent {...props} />
    </Suspense>
  )
}

