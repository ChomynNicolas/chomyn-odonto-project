import { Suspense } from "react"
import { auth } from "@/auth"
import { listAnamnesisConfigs } from "@/app/api/anamnesis-config/_service"
import { AnamnesisConfigListQuerySchema } from "@/app/api/anamnesis-config/_schemas"
import AnamnesisConfigTable from "@/components/admin/AnamnesisConfigTable"

export const metadata = {
  title: "Configuración de Anamnesis | Administración",
  description: "Gestión de configuraciones de comportamiento de anamnesis",
}

export const dynamic = "force-dynamic"

interface AnamnesisConfigPageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    sortBy?: string
    sortOrder?: string
  }>
}

async function AnamnesisConfigContent({ searchParams }: AnamnesisConfigPageProps) {
  const params = await searchParams
  const session = await auth()
  const role = (session?.user?.role ?? "RECEP") as "ADMIN" | "RECEP" | "ODONT"

  // Construir filtros según el schema
  const filters = {
    page: params.page ? parseInt(params.page) : 1,
    limit: params.limit ? parseInt(params.limit) : 20,
    search: params.search,
    sortBy: (params.sortBy as "key" | "idAnamnesisConfig" | "updatedAt" | undefined) || "key",
    sortOrder: (params.sortOrder as "asc" | "desc" | undefined) || "asc",
  }

  // Validar con el schema
  const validatedFilters = AnamnesisConfigListQuerySchema.parse(filters)

  const { page, limit, skip } = {
    page: validatedFilters.page,
    limit: validatedFilters.limit,
    skip: (validatedFilters.page - 1) * validatedFilters.limit,
  }

  const result = await listAnamnesisConfigs(validatedFilters, page, limit, skip)

  // Envolver en formato esperado por AnamnesisConfigTable
  // Convertir Date a string ISO para compatibilidad con el tipo del cliente
  const configsResponse = {
    ok: true as const,
    data: result.data.map((item) => ({
      ...item,
      updatedAt: item.updatedAt.toISOString(),
    })),
    meta: result.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Configuración de Anamnesis</h1>
        <p className="text-muted-foreground">
          Gestiona las configuraciones que controlan el comportamiento de los flujos de anamnesis
        </p>
      </header>
      <AnamnesisConfigTable initialData={configsResponse} userRole={role} />
    </main>
  )
}

export default function AnamnesisConfigPage(props: AnamnesisConfigPageProps) {
  return (
    <Suspense
      fallback={
        <main className="container mx-auto max-w-7xl space-y-6 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando configuraciones...</div>
          </div>
        </main>
      }
    >
      <AnamnesisConfigContent {...props} />
    </Suspense>
  )
}

