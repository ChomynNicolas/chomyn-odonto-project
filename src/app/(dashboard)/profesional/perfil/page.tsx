import { Suspense } from "react"
import PerfilProfesional from "@/components/profesional/PerfilProfesional"

export const metadata = {
  title: "Mi Perfil | Profesional",
  description: "Gestiona tu perfil y disponibilidad",
}

export const dynamic = "force-dynamic"

export default function PerfilPage() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Visualiza tu información y gestiona tu disponibilidad semanal
        </p>
      </header>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando perfil...</div>
        </div>
      }>
        <PerfilProfesional />
      </Suspense>
    </main>
  )
}

