"use client";

import Button from "@/components/ui/button/Button";

type FileItem = { id: string; nombre: string; tipo: "CEDULA"|"RADIOGRAFIA"|"OTRO"; url: string; };

export default function AdjuntosDropzone({ files, onChange }: { files: FileItem[]; onChange:(arr:FileItem[])=>void; }) {
  const addMock = () => {
    const n = { id: crypto.randomUUID(), nombre: "cedula_frente.jpg", tipo: "CEDULA", url: "https://placehold.co/600x400" };
    onChange([...(files||[]), n]);
  };
  const remove = (id: string) => onChange((files||[]).filter(f => f.id !== id));

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500 dark:border-gray-800">
        Arrastra archivos aquí (mock). <Button  onClick={addMock} className="ml-3 bg-brand-500 hover:bg-brand-600">Agregar mock</Button>
      </div>
      <ul className="space-y-2">
        {(files||[]).map(f => (
          <li key={f.id} className="flex items-center justify-between rounded-md border p-2 text-sm dark:border-gray-800">
            <span>{f.nombre} · {f.tipo}</span>
            <Button  variant="outline" onClick={() => remove(f.id)}>Quitar</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
