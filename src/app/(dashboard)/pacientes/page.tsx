import PacientesTable from "@/components/pacientes/PacientesTable";


export const metadata = { title: "Pacientes" };

export default function PagePacientes() {
  // A futuro: RBAC → RECEP/ODONT/ADMIN
  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-800 dark:text-white/90">Pacientes</h1>
      </header>
      <PacientesTable />
    </main>
  );
}
