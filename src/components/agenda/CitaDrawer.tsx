"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { apiGetCitaDetalle, apiTransitionCita } from "@/lib/api/agenda/citas";
import { isRole } from "@/lib/rbac";
import type { EstadoCita } from "./CitasCalendar";

export function CitaDrawer({
  idCita,
  onClose,
  currentUser,
  onAfterChange,
}: {
  idCita: number;
  onClose: () => void;
  onAfterChange?: () => void;
  currentUser?: { rol: "ADMIN" | "ODONT" | "RECEP"; profesionalId?: number | null };
}) {
  const [loading, setLoading] = React.useState(true);
  const [detalle, setDetalle] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const d = await apiGetCitaDetalle(idCita);
        if (alive) setDetalle(d);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "Error obteniendo cita");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [idCita]);

  const estado: EstadoCita | undefined = detalle?.estado;
  const acciones = getAccionesPermitidas(estado, currentUser?.rol ?? "RECEP");

  async function doAction(a: Accion) {
    // Confirmaciones para cambios sensibles
    if (a === "CANCEL" || a === "NO_SHOW" || a === "COMPLETE") {
      const nota = prompt(`¿Seguro? Podés dejar una nota (opcional):`, "");
      if (nota === null) return;
      await apiTransitionCita(idCita, a, nota || undefined);
    } else {
      await apiTransitionCita(idCita, a);
    }
    if (onAfterChange) onAfterChange();
  }

  if (loading) return <div className="p-4">Cargando...</div>;
  if (err) return <div className="p-4 text-destructive">{err}</div>;

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b">
        <div className="text-xs text-muted-foreground">Cita #{idCita}</div>
        <h3 className="text-lg font-semibold">
          {detalle?.pacienteNombre} — {detalle?.motivo ?? "Cita"}
        </h3>
        <div className="text-sm text-muted-foreground">
          {fmt(detalle?.inicio)} – {fmt(detalle?.fin)} ·{" "}
          {detalle?.profesionalNombre ? `Dr/a. ${detalle.profesionalNombre}` : "Profesional"}
          {detalle?.consultorioNombre ? ` · ${detalle.consultorioNombre}` : ""}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          <Section title="Estado">
            <strong>{detalle?.estado?.replaceAll("_", " ")}</strong>
          </Section>

          {detalle?.notas ? (
            <Section title="Notas">
              <p className="text-sm whitespace-pre-line">{detalle.notas}</p>
            </Section>
          ) : null}

          <Section title="Paciente">
            <div className="text-sm">
              <div>{detalle?.pacienteNombre}</div>
              {detalle?.pacienteDoc ? <div className="text-muted-foreground">{detalle.pacienteDoc}</div> : null}
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href={`/pacientes/${detalle?.pacienteId}`} aria-label="Ver paciente">Ver paciente</a>
              </Button>
            </div>
          </Section>

          <Section title="Acciones rápidas">
            <div className="flex flex-wrap gap-2">
              {acciones.map((a) => (
                <Button key={a} size="sm" onClick={() => void doAction(a)}>
                  {labelAccion(a)}
                </Button>
              ))}
              <Button variant="outline" size="sm" asChild>
                <a href={`/agenda/citas/${idCita}/reprogramar`} aria-label="Reprogramar">Reprogramar</a>
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <Separator className="my-2" />
      {children}
    </div>
  );
}

function fmt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

/** ===== Grafo simple de transiciones + RBAC ===== */
type Accion = "CONFIRM" | "CHECKIN" | "START" | "COMPLETE" | "CANCEL" | "NO_SHOW";

function getAccionesPermitidas(estado: EstadoCita | undefined, rol: "ADMIN" | "ODONT" | "RECEP"): Accion[] {
  if (!estado) return [];
  const base: Record<EstadoCita, Accion[]> = {
    SCHEDULED: ["CONFIRM", "CANCEL", "NO_SHOW", "CHECKIN", "START"],
    CONFIRMED: ["CHECKIN", "START", "CANCEL", "NO_SHOW"],
    CHECKED_IN: ["START", "CANCEL"],
    IN_PROGRESS: ["COMPLETE", "CANCEL"],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
  };
  const allowed = new Set(base[estado]);

  // RBAC: RECEP no puede START/COMPLETE, ODONT sí; ADMIN todo
  if (rol === "RECEP") {
    allowed.delete("START");
    allowed.delete("COMPLETE");
  }
  return Array.from(allowed);
}

function labelAccion(a: Accion) {
  switch (a) {
    case "CONFIRM": return "Confirmar";
    case "CHECKIN": return "Check-in";
    case "START": return "Iniciar";
    case "COMPLETE": return "Completar";
    case "CANCEL": return "Cancelar";
    case "NO_SHOW": return "No show";
  }
}
