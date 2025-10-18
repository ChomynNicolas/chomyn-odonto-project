"use client";
import { useParams, useRouter } from "next/navigation";
import { PACIENTES_MOCK } from "@/components/pacientes/mock";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

export default function PagePacienteDetalle() {
  const { id } = useParams<{id:string}>();
  const router = useRouter();
  const p = PACIENTES_MOCK.find(x => x.id === id);

  if (!p) return <main className="p-6">No encontrado</main>;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">{p.nombreCompleto}</h1>
        <div className="flex gap-2">
          <Link href="/(dashboard)/pacientes"><Button variant="outline">Volver</Button></Link>
          <Button className="bg-brand-500 hover:bg-brand-600" onClick={()=>alert("Editar (mock)")}>Editar</Button>
        </div>
      </div>

      <section className="grid sm:grid-cols-2 gap-4">
        <Info label="Documento" value={`${p.dni}${p.ruc ? " / RUC " + p.ruc : ""}`} />
        <Info label="Género" value={p.genero} />
        <Info label="Teléfono" value={p.telefono} />
        <Info label="Email" value={p.email} />
        <Info label="Domicilio" value={p.domicilio} />
        <Info label="Obra social" value={p.obraSocial ?? "-"} />
        <Info label="Responsable de pago" value={p.responsablePago ?? "-"} />
        <Info label="Preferencias" value={Object.entries(p.preferenciasContacto).filter(([_,v])=>v).map(([k])=>k).join(", ") || "-"} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Antecedentes / Alergias / Medicación</h2>
        <p className="text-sm"><b>Antecedentes:</b> {p.antecedentesMedicos ?? "-"}</p>
        <p className="text-sm"><b>Alergias:</b> {p.alergias ?? "-"}</p>
        <p className="text-sm"><b>Medicación:</b> {p.medicacion ?? "-"}</p>
      </section>

      <section>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Adjuntos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(p.adjuntos||[]).map(a => (
            <figure key={a.id} className="rounded-lg border p-2 dark:border-gray-800">
              <img src={a.url} alt={a.nombre} className="rounded-md object-cover w-full h-32"/>
              <figcaption className="text-xs mt-1">{a.nombre} · {a.tipo}</figcaption>
            </figure>
          ))}
          {(!p.adjuntos || p.adjuntos.length===0) && <p className="text-sm text-gray-500">Sin archivos</p>}
        </div>
      </section>
    </main>
  );
}

function Info({label, value}:{label:string; value:string}) {
  return (
    <div className="rounded-lg border p-3 dark:border-gray-800">
      <div className="text-theme-xs text-gray-500">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
