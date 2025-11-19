import { Suspense } from "react"
import ProfesionalForm from "@/components/admin/ProfesionalForm"

export const metadata = {
  title: "Nuevo Profesional | Administración",
  description: "Crear un nuevo profesional",
}

export const dynamic = "force-dynamic"

export default function NuevoProfesionalPage() {
  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Nuevo Profesional</h1>
        <p className="text-muted-foreground">
          Completa el formulario para crear un nuevo profesional en el sistema
        </p>
      </header>
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando formulario...</div>
        </div>
      }>
        <ProfesionalForm />
      </Suspense>
    </main>
  )
}

