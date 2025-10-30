import PacientesTable from "@/components/pacientes/PacientesTable"

export const metadata = {
  title: "Pacientes",
  description: "Gestión de pacientes del sistema clínico",
}

export default function Page() {
  return (
    <main className="container mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Pacientes</h1>
        <p className="text-muted-foreground">Gestiona la información de tus pacientes</p>
      </header>
      <PacientesTable />
    </main>
  )
}