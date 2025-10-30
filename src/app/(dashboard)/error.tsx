// src/app/(dashboard)/error.tsx
"use client";
export default function DashboardError({ error, reset }:{ error: Error; reset: ()=>void; }) {
  return (
    <div className="p-6">
      <div className="rounded-xl border bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-rose-700">Ocurrió un problema</h2>
        <p className="mt-2 text-sm text-gray-700">{error.message}</p>
        <button onClick={reset} className="mt-4 px-3 py-1.5 rounded-lg bg-gray-900 text-white">Reintentar</button>
      </div>
    </div>
  );
}
