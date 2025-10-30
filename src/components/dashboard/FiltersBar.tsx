// src/components/dashboard/FiltersBar.tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function FiltersBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [profesionalId, setProf] = useState(sp.get("prof") ?? "");
  const [consultorioId, setCons] = useState(sp.get("cons") ?? "");

  useEffect(()=>{ /* hydrate defaults si hace falta */ }, []);

  function apply() {
    const qs = new URLSearchParams(sp.toString());
    profesionalId ? qs.set("prof", profesionalId) : qs.delete("prof");
    consultorioId ? qs.set("cons", consultorioId) : qs.delete("cons");
    router.replace(`/?${qs.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs text-gray-600">Profesional ID</label>
        <input value={profesionalId} onChange={e=>setProf(e.target.value)} className="input" placeholder="ej. 2" />
      </div>
      <div>
        <label className="block text-xs text-gray-600">Consultorio ID</label>
        <input value={consultorioId} onChange={e=>setCons(e.target.value)} className="input" placeholder="ej. 1" />
      </div>
      <button onClick={apply} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white">Aplicar</button>
    </div>
  );
}
