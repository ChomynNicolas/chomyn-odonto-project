import { Suspense } from "react"
import { listProfesionales } from "@/app/api/profesionales/_service"
import { listEspecialidades } from "@/app/api/especialidades/_service"
import { ProfesionalListQuerySchema } from "@/app/api/profesionales/_schemas"
import ProfesionalesTable from "@/components/admin/ProfesionalesTable"
import type { ProfesionalListResponse } from "@/lib/api/admin/profesionales"

export const metadata = {
  title: "Profesionales | Administración",
  description: "Gestión de profesionales del sistema",
}

export const dynamic = "force-dynamic"

interface ProfesionalesPageProps {
  searchParams: Promise<{
    estaActivo?: string
    especialidadId?: string
    search?: string
    page?: string
  }>
}

async function ProfesionalesContent({ searchParams }: ProfesionalesPageProps) {
  const params = await searchParams

  // Construir filtros según el schema
  const filters = {
    estaActivo: params.estaActivo === "true" ? "true" : params.estaActivo === "false" ? "false" : undefined,
    especialidadId: params.especialidadId ? parseInt(params.especialidadId) : undefined,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  }

  // Validar con el schema
  const validatedFilters = ProfesionalListQuerySchema.parse(filters)

  const [profesionalesResult, especialidades] = await Promise.all([
    listProfesionales(validatedFilters),
    listEspecialidades(),
  ])

  // Envolver en formato esperado por ProfesionalesTable
  const profesionalesResponse: ProfesionalListResponse = {
    ok: true,
    data: profesionalesResult.data,
    meta: profesionalesResult.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Profesionales</h1>
        <p className="text-muted-foreground">Gestiona los profesionales del sistema, sus especialidades y disponibilidad</p>
      </header>
      <ProfesionalesTable initialData={profesionalesResponse} especialidades={especialidades} />
    </main>
  )
}

export default function ProfesionalesPage(props: ProfesionalesPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando profesionales...</div>
        </div>
      </main>
    }>
      <ProfesionalesContent {...props} />
    </Suspense>
  )
}

