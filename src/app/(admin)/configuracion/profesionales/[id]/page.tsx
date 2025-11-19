import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getProfesionalById } from "@/app/api/profesionales/_service"
import ProfesionalForm from "@/components/admin/ProfesionalForm"

export const metadata = {
  title: "Editar Profesional | Administración",
  description: "Editar información del profesional",
}

export const dynamic = "force-dynamic"

interface EditProfesionalPageProps {
  params: Promise<{ id: string }>
}

async function EditProfesionalContent({ params }: EditProfesionalPageProps) {
  const { id } = await params
  const profesionalId = parseInt(id)

  if (isNaN(profesionalId)) {
    notFound()
  }

  const profesional = await getProfesionalById(profesionalId)

  if (!profesional) {
    notFound()
  }

  return (
    <main className="container mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Editar Profesional</h1>
        <p className="text-muted-foreground">
          Modifica la información del profesional: {profesional.persona.nombres} {profesional.persona.apellidos}
        </p>
      </header>
      <ProfesionalForm profesionalId={profesionalId} />
    </main>
  )
}

export default function EditProfesionalPage(props: EditProfesionalPageProps) {
  return (
    <Suspense fallback={
      <main className="container mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Cargando profesional...</div>
        </div>
      </main>
    }>
      <EditProfesionalContent {...props} />
    </Suspense>
  )
}

