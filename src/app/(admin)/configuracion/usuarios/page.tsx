import { Suspense } from "react"
import { listUsers } from "@/app/api/admin/users/_service"
import { listRoles } from "@/app/api/admin/roles/_service"
import { UserListQuerySchema } from "@/app/api/admin/users/_schemas"
import UsersTable from "@/components/admin/UsersTable"

export const metadata = {
  title: "Usuarios | Administración",
  description: "Gestión de usuarios del sistema",
}

export const dynamic = "force-dynamic"

interface UsersPageProps {
  searchParams: Promise<{
    rolId?: string
    estaActivo?: string
    search?: string
    page?: string
  }>
}

async function UsersContent({ searchParams }: UsersPageProps) {
  const params = await searchParams
  
  // Construir filtros según el schema
  const filters = {
    rolId: params.rolId ? parseInt(params.rolId) : undefined,
    estaActivo: params.estaActivo === "true" ? "true" : params.estaActivo === "false" ? "false" : undefined,
    search: params.search,
    page: params.page ? parseInt(params.page) : 1,
    limit: 20,
  }

  // Validar con el schema
  const validatedFilters = UserListQuerySchema.parse(filters)

  const [usersResult, roles] = await Promise.all([
    listUsers(validatedFilters),
    listRoles(),
  ])

  // Envolver en formato esperado por UsersTable
  const usersResponse: { ok: boolean; data: typeof usersResult.data; meta: typeof usersResult.meta } = {
    ok: true,
    data: usersResult.data,
    meta: usersResult.meta,
  }

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">Gestiona los usuarios del sistema, sus roles y permisos</p>
      </header>
      <UsersTable initialData={usersResponse} roles={roles} />
    </main>
  )
}

export default function UsersPage(props: UsersPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando usuarios...</div>
        </div>
      </main>
    }>
      <UsersContent {...props} />
    </Suspense>
  )
}

