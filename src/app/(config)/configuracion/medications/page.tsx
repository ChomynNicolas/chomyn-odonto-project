import { Suspense } from "react"
import { listMedicationCatalogs } from "@/app/api/medication-catalog/_service"
import { MedicationCatalogListQuerySchema } from "@/app/api/medication-catalog/_schemas"
import MedicationCatalogTable from "@/components/admin/MedicationCatalogTable"

export const metadata = {
  title: "Medicamentos | Administración",
  description: "Gestión del catálogo de medicamentos",
}

export const dynamic = "force-dynamic"

interface MedicationsPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    isActive?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function MedicationsContent({ searchParams }: MedicationsPageProps) {
  const params = await searchParams

  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    isActive: (params.isActive as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "name" | "idMedicationCatalog" | "createdAt" | undefined) || "name",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = MedicationCatalogListQuerySchema.parse(filters)

  const result = await listMedicationCatalogs(validatedFilters)

  // Envolver en formato esperado por MedicationCatalogTable
  const medicationsResponse: { ok: true; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Medicamentos</h1>
        <p className="text-muted-foreground">Gestiona el catálogo de medicamentos del sistema</p>
      </header>
      <MedicationCatalogTable initialData={medicationsResponse} />
    </main>
  )
}

export default function MedicationsPage(props: MedicationsPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando medicamentos...</div>
        </div>
      </main>
    }>
      <MedicationsContent {...props} />
    </Suspense>
  )
}

