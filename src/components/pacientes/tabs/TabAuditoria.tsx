"use client";

import type { Paciente } from "../types";

export default function TabAuditoria({ paciente }: { paciente: Paciente }) {
  // mock: luego conectar a tabla AuditLog
  const eventos = [
    { id: "a1", fecha: "28/10/2025 10:24", user: "recepcion1", accion: "CREAR_PACIENTE" },
    { id: "a2", fecha: "29/10/2025 09:12", user: "odont_gomez", accion: "ACTUALIZAR_DATOS" },
  ];

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium">Historial de cambios</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20">
            <tr className="text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Fecha</th>
              <th className="px-4 py-2 text-left font-medium">Usuario</th>
              <th className="px-4 py-2 text-left font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map(ev => (
              <tr key={ev.id} className="border-t border-border">
                <td className="px-4 py-2">{ev.fecha}</td>
                <td className="px-4 py-2">{ev.user}</td>
                <td className="px-4 py-2">{ev.accion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
