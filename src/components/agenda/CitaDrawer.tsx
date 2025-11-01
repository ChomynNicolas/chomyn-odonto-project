"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PacientePeek } from "@/components/pacientes/PacientePeek";
import { apiGetCitaDetalle } from "@/lib/api/agenda/citas";
import {
  CalendarClock,
  Clock,
  User2,
  Stethoscope,
  MapPin,
  StickyNote,
  X,
  Hash,
} from "lucide-react";

type EstadoCita =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type VM = {
  idCita: number;
  motivo: string | null;
  inicioISO: string;
  finISO: string;
  duracionMinutos: number;
  estado: EstadoCita;
  paciente: { id: number; nombre: string };
  profesional: { id: number; nombre: string };
  consultorio?: { id: number; nombre: string; colorHex?: string | null };
  notas?: string | null;
};

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
  const [err, setErr] = React.useState<string | null>(null);
  const [vm, setVm] = React.useState<VM | null>(null);
  const [expandNotes, setExpandNotes] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const dto = await apiGetCitaDetalle(idCita); // { ok:true, data } | data
        const d = dto?.data ?? dto;

        // Adaptador → VM mínima para el modal
        const mapped: VM = {
          idCita: d.idCita,
          motivo: d.motivo ?? null,
          inicioISO: d.inicio,
          finISO: d.fin,
          duracionMinutos: d.duracionMinutos,
          estado: d.estado,
          paciente: { id: d.paciente.id, nombre: d.paciente.nombre },
          profesional: { id: d.profesional.id, nombre: d.profesional.nombre },
          consultorio: d.consultorio
            ? { id: d.consultorio.id, nombre: d.consultorio.nombre, colorHex: d.consultorio.colorHex ?? null }
            : undefined,
          notas: d.notas ?? null,
        };

        if (alive) setVm(mapped);
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

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <HeaderSkeleton onClose={onClose} />
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-24 w-full" />
          </div>
        </ScrollArea>
      </div>
    );
  }
  if (err || !vm) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Cita #{idCita}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 text-destructive">{err ?? "No se pudo cargar el detalle"}</div>
      </div>
    );
  }

  const estadoUI = getEstadoUI(vm.estado);
  const consultorioColor = vm.consultorio?.colorHex ?? undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header con acento por consultorio */}
      <div
        className="relative border-b p-4"
        style={{ borderLeft: `6px solid ${consultorioColor ?? "var(--border)"}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> Cita #{vm.idCita}
              </span>
              <Badge
                variant="outline"
                className={`border-0 ${estadoUI.className}`}
                aria-label={`Estado ${estadoUI.label}`}
              >
                {estadoUI.label}
              </Badge>
            </div>
            <h3 className="mt-1 text-lg font-semibold truncate">
              {vm.paciente.nombre} {vm.motivo ? <span className="font-normal opacity-80">— {vm.motivo}</span> : null}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {fmtTimeRange(vm.inicioISO, vm.finISO)} <span className="opacity-60">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {vm.duracionMinutos} min
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-4 w-4" /> {vm.profesional.nombre}
              </span>
              {vm.consultorio ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
                    style={{ backgroundColor: consultorioColor }}
                    aria-hidden
                  />
                  <MapPin className="h-4 w-4 opacity-70" />
                  {vm.consultorio.nombre}
                </span>
              ) : null}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Paciente (peek + link) */}
          <section>
            <HeaderMini icon={<User2 className="h-4 w-4" />} title="Paciente" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PacientePeek pacienteId={vm.paciente.id}>
                <Button variant="outline" size="sm">Ver paciente</Button>
              </PacientePeek>
              <a
                href={`/pacientes/${vm.paciente.id}`}
                className="text-sm underline decoration-dotted text-primary"
              >
                Ficha completa
              </a>
            </div>
          </section>

          {/* Notas (opcional, truncadas con “ver más”) */}
          {vm.notas ? (
            <section>
              <HeaderMini icon={<StickyNote className="h-4 w-4" />} title="Notas" />
              <p
                className={`mt-2 text-sm whitespace-pre-wrap ${
                  expandNotes ? "" : "line-clamp-4"
                }`}
              >
                {vm.notas}
              </p>
              <div className="mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 h-7"
                  onClick={() => setExpandNotes((v) => !v)}
                >
                  {expandNotes ? "Ver menos" : "Ver más"}
                </Button>
              </div>
            </section>
          ) : null}
        </div>
      </ScrollArea>

      {/* Footer minimalista (puedes añadir acciones en Fase 4) */}
      <div className="border-t px-4 py-3 flex items-center justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

/* ---------- Subcomponentes / utilidades ---------- */

function HeaderSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <div className="border-b p-4 flex items-start justify-between">
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function HeaderMini({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
      <span className="inline-flex items-center justify-center rounded-md border border-border h-6 w-6">
        {icon}
      </span>
      <span>{title}</span>
      <Separator className="flex-1 ml-2" />
    </div>
  );
}

function fmtTimeRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const dfDay = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const dfTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // ej: "sáb, 01 nov · 14:30 – 15:00"
  return `${dfDay.format(s)} · ${dfTime.format(s)} – ${dfTime.format(e)}`;
}

function getEstadoUI(estado: EstadoCita): { label: string; className: string } {
  switch (estado) {
    case "SCHEDULED":
      return { label: "Scheduled", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" };
    case "CONFIRMED":
      return { label: "Confirmed", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
    case "CHECKED_IN":
      return { label: "Checked-in", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
    case "IN_PROGRESS":
      return { label: "In progress", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" };
    case "COMPLETED":
      return { label: "Completed", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" };
    case "CANCELLED":
      return { label: "Cancelled", className: "bg-red-500/15 text-red-600 dark:text-red-400" };
    case "NO_SHOW":
      return { label: "No-show", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" };
    default:
      return { label: String(estado), className: "bg-muted text-foreground/70" };
  }
}
