// src/components/pacientes/tabs/TabAdjuntos.tsx
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { usePacienteAdjuntos } from "@/hooks/usePacienteAdjuntosQuery";
import { formatDateTime } from "@/lib/format";

const TIPOS = ["Todos", "CEDULA", "RADIOGRAFIA", "OTRO"] as const;

type AdjuntoItem = {
  id: string
  tipo: string
  secureUrl: string
  originalFilename: string | null
  createdAt: string
  descripcion?: string | null
}

export default function TabAdjuntos() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = usePacienteAdjuntos(id);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Todos");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-2">
            <div className="h-32 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  if (isError) {
    const errorMessage = error instanceof Error ? error.message : "Error al cargar adjuntos."
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
        {errorMessage}{" "}
        <button onClick={() => refetch()} className="underline underline-offset-2">Reintentar</button>
      </div>
    );
  }
  if (!data) return null;

  let items: AdjuntoItem[] = data.adjuntos;
  if (tipo !== "Todos") items = items.filter((a: AdjuntoItem) => a.tipo === tipo);
  if (from) items = items.filter((a: AdjuntoItem) => a.createdAt >= from);
  if (to) items = items.filter((a: AdjuntoItem) => a.createdAt <= to);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => {
              const value = e.target.value
              if (TIPOS.includes(value as (typeof TIPOS)[number])) {
                setTipo(value as (typeof TIPOS)[number])
              }
            }}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
          >
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                 className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
                 className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900" />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin archivos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {items.map((a: AdjuntoItem) => {
            const nombre = a.originalFilename || a.descripcion || `Adjunto ${a.id}`
            return (
              <figure key={a.id} className="rounded-lg border border-border p-2">
                <div className="relative h-32 w-full overflow-hidden rounded-md">
                  <Image
                    src={a.secureUrl}
                    alt={nombre}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-xs">
                  <div className="font-medium">{nombre}</div>
                  <div className="text-muted-foreground">{a.tipo} · {formatDateTime(a.createdAt)}</div>
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}
    </div>
  );
}
