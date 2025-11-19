import { Suspense } from "react"
import { auth } from "@/auth"
import { listConsultoriosWithStats } from "@/app/api/consultorios/_service"
import { ConsultorioListQuerySchema } from "@/app/api/consultorios/_schemas"
import ConsultoriosTable from "@/components/admin/ConsultoriosTable"

export const metadata = {
  title: "Consultorios | Administración",
  description: "Gestión de consultorios (salas de atención) del sistema",
}

export const dynamic = "force-dynamic"

interface ConsultoriosPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    activo?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function ConsultoriosContent({ searchParams }: ConsultoriosPageProps) {
  const params = await searchParams
  const session = await auth()
  const role = (session?.user?.role ?? "RECEP") as "ADMIN" | "RECEP" | "ODONT"

  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    activo: (params.activo as "true" | "false" | "all" | undefined) || "all",
    sortBy: (params.sortBy as "nombre" | "idConsultorio" | "createdAt" | undefined) || "nombre",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = ConsultorioListQuerySchema.parse(filters)

  const result = await listConsultoriosWithStats(validatedFilters)

  // Envolver en formato esperado por ConsultoriosTable
  const consultoriosResponse: { ok: boolean; data: typeof result.data; meta: typeof result.meta } = {
    ok: true,
    data: result.data,
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Consultorios</h1>
        <p className="text-muted-foreground">
          Gestiona los consultorios (salas de atención) utilizados en la agenda y estadísticas
        </p>
      </header>
      <ConsultoriosTable initialData={consultoriosResponse} userRole={role} />
    </main>
  )
}

export default function ConsultoriosPage(props: ConsultoriosPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando consultorios...</div>
          </div>
        </main>
      }
    >
      <ConsultoriosContent {...props} />
    </Suspense>
  )
}

