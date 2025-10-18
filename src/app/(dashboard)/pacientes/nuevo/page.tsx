
import { useRouter } from "next/navigation";
import PacienteForm from "@/components/pacientes/PacienteForm";
import { crearPacienteMock } from "@/components/pacientes/mock";



export default function PageNuevoPaciente() {
  const router = useRouter();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <PacienteForm
        onSubmit={(values) => {
          // Validaciones de negocio (mock): unicidad de DNI / Email
          // (a futuro validar en server con Prisma unique)
          crearPacienteMock({ ...values, estaActivo: true });
          router.push("/pacientes");
        }}
        submitLabel="Crear paciente"
      />
    </main>
  );
}
