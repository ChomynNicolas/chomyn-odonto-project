import { Suspense } from "react"
import { listRoles } from "@/app/api/admin/roles/_service"
import RolesTable from "@/components/admin/RolesTable"

export const metadata = {
  title: "Roles | Administración",
  description: "Gestión de roles del sistema",
}

export const dynamic = "force-dynamic"

async function RolesContent() {
  const roles = await listRoles()

  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Roles</h1>
        <p className="text-muted-foreground">Visualiza los roles del sistema y el número de usuarios asignados a cada uno</p>
      </header>
      <RolesTable roles={roles} />
    </main>
  )
}

export default function RolesPage() {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando roles...</div>
        </div>
      </main>
    }>
      <RolesContent />
    </Suspense>
  )
}

