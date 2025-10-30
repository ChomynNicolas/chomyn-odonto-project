// app/(pacientes)/components/PacientesTable.tsx
"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { usePacientes } from "@/hooks/usePacientesQuery";
import type { PacienteListItemDTO as PacienteItem } from "@/lib/api/pacientes.types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Search, UserPlus, Users, AlertCircle, Phone, Mail, FileText, CalendarClock, Activity, Stethoscope, NotebookPen, CheckCircle2, XCircle, Plus, History, LucideIcon, CircleAlert
} from "lucide-react";

import PatientQuickCreateModal from "./PatientQuickCreateModal";

/* =========================
 * Utils (render / formato)
 * ========================= */
function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

const estadoColors: Record<string, string> = {
  SCHEDULED: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  CHECKED_IN: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  IN_PROGRESS: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  NO_SHOW: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

function EstadoPill({ estado }: { estado?: string | null }) {
  if (!estado) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        estadoColors[estado] || "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
      )}
    >
      {estado.replace("_", " ")}
    </span>
  );
}

function GeneroDot({ genero }: { genero?: string | null }) {
  const label =
    genero === "MASCULINO" ? "M" :
    genero === "FEMENINO" ? "F" :
    genero === "OTRO" ? "X" : "—";
  return (
    <span className="inline-flex h-5 items-center justify-center rounded-full border px-1.5 text-[10px] leading-none text-muted-foreground">
      {label}
    </span>
  );
}

/* =========================
 * Toolbar de filtros
 * ========================= */
function Toolbar({
  q, setQ, onOpenQuick,
  genero, setGenero,
  hasEmail, setHasEmail,
  hasPhone, setHasPhone,
  sort, setSort,
  createdFrom, setCreatedFrom,
  createdTo, setCreatedTo,
  totalCount,
}: {
  q: string; setQ: (v: string) => void; onOpenQuick: () => void;
  genero?: string; setGenero: (v: any) => void;
  hasEmail?: boolean; setHasEmail: (v: boolean | undefined) => void;
  hasPhone?: boolean; setHasPhone: (v: boolean | undefined) => void;
  sort: string; setSort: (v: any) => void;
  createdFrom?: string; setCreatedFrom: (v: string | undefined) => void;
  createdTo?: string; setCreatedTo: (v: string | undefined) => void;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, documento, RUC o contacto…"
            aria-label="Buscar pacientes"
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground sm:ml-2">{totalCount} resultados</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={genero ?? ""}
          onChange={(e) => setGenero(e.target.value || undefined)}
          aria-label="Género"
        >
          <option value="">Género: Todos</option>
          <option value="MASCULINO">Masculino</option>
          <option value="FEMENINO">Femenino</option>
          <option value="OTRO">Otro</option>
          <option value="NO_ESPECIFICADO">No especificado</option>
        </select>

        <button
          className={cn("h-9 rounded-md border px-3 text-sm", hasEmail ? "bg-muted/60" : "")}
          onClick={() => setHasEmail(hasEmail ? undefined : true)}
          aria-pressed={hasEmail === true}
        >
          Con email
        </button>

        <button
          className={cn("h-9 rounded-md border px-3 text-sm", hasPhone ? "bg-muted/60" : "")}
          onClick={() => setHasPhone(hasPhone ? undefined : true)}
          aria-pressed={hasPhone === true}
        >
          Con teléfono
        </button>

        <input
          type="date"
          className="h-9 rounded-md border px-2 text-sm"
          value={createdFrom ?? ""}
          onChange={(e) => setCreatedFrom(e.target.value || undefined)}
          aria-label="Desde"
        />
        <input
          type="date"
          className="h-9 rounded-md border px-2 text-sm"
          value={createdTo ?? ""}
          onChange={(e) => setCreatedTo(e.target.value || undefined)}
          aria-label="Hasta"
        />

        <select
          className="h-9 rounded-md border px-2 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          aria-label="Orden"
        >
          <option value="createdAt desc">Más recientes</option>
          <option value="createdAt asc">Más antiguos</option>
          <option value="nombre asc">Nombre A→Z</option>
          <option value="nombre desc">Nombre Z→A</option>
        </select>

        <Button onClick={onOpenQuick} variant="outline" className="whitespace-nowrap bg-transparent">
          <UserPlus className="mr-1 size-4" />
          Alta rápida
        </Button>
        <Button asChild className="whitespace-nowrap">
          <Link href="/pacientes/nuevo" prefetch={false}>
            <Users className="mr-1 size-4" />
            Nuevo paciente
          </Link>
        </Button>
      </div>
    </div>
  );
}

/* =========================
 * Render helpers de fila
 * ========================= */
function renderNombre(p: PacienteItem) {
  const nom = [p.persona.nombres, p.persona.apellidos].filter(Boolean).join(" ").trim();
  return nom || "—";
}

function renderDocumento(p: PacienteItem) {
  const doc = p.documento;
  if (!doc?.tipo || !doc?.numero) return "—";
  const tipoLabel = doc.tipo === "PASAPORTE" ? "Pasaporte" : doc.tipo;
  return `${tipoLabel}: ${doc.numero}${doc.ruc ? ` • RUC ${doc.ruc}` : ""}`;
}

function getTelefonoInfo(p: PacienteItem) {
  const phone = p.contactos.find(c => c.tipo === "PHONE" && c.activo !== false);
  const prefer = phone?.esPreferidoRecordatorio || phone?.esPreferidoCobranza;
  return {
    display: phone?.valorNorm || "—",
    whatsapp: !!phone?.whatsappCapaz,
    preferRecord: !!phone?.esPreferidoRecordatorio,
    preferCobranza: !!phone?.esPreferidoCobranza,
    hasAnyPref: !!prefer,
  };
}

function getEmailInfo(p: PacienteItem) {
  const mail = p.contactos.find(c => c.tipo === "EMAIL" && c.activo !== false);
  return mail?.valorNorm || "—";
}

/* =========================
 * Tabla Desktop
 * ========================= */
function TableDesktop({ data }: { data: PacienteItem[] }) {
  return (
    <TooltipProvider delayDuration={250}>
      <Card className="overflow-hidden p-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[26%] font-semibold">Identificación</TableHead>
                <TableHead className="w-[18%] font-semibold">Contacto</TableHead>
                <TableHead className="w-[22%] font-semibold">Clínica</TableHead>
                <TableHead className="w-[24%] font-semibold">Agenda</TableHead>
                <TableHead className="w-[5%] font-semibold text-center">Trat.</TableHead>
                <TableHead className="w-[5%] text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => {
                const phone = getTelefonoInfo(p);
                const email = getEmailInfo(p);
                const lastIsTodayActive =
                  p.nextAppointmentEstado === "CHECKED_IN" || p.nextAppointmentEstado === "IN_PROGRESS"; // (se resalta en Próxima si cae hoy)
                return (
                  <TableRow key={p.idPaciente} className="align-top">
                    {/* Identificación */}
                    <TableCell className="min-w-[260px]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{renderNombre(p)}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            <FileText className="mr-1 inline size-3.5" aria-hidden="true" />
                            <span className="truncate align-middle">{renderDocumento(p)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 pl-2 text-right">
                          <div className="text-sm text-muted-foreground">
                            {p.edad != null ? `${p.edad} años` : "—"}
                          </div>
                          <div className="mt-1 flex justify-end">
                            <GeneroDot genero={p.persona.genero} />
                          </div>
                          <div className="mt-1">
                            {p.estaActivo ? (
                              <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contacto */}
                    <TableCell>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3.5 text-muted-foreground" />
                          <span className="truncate">{phone.display}</span>
                          {phone.whatsapp && (
                            <span className="rounded-full border px-1.5 text-[10px] leading-5 text-emerald-700 dark:text-emerald-300">
                              WhatsApp
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="size-3.5 text-muted-foreground" />
                          <span className="truncate">{email}</span>
                        </div>
                        {phone.hasAnyPref && (
                          <div className="flex flex-wrap gap-1">
                            {phone.preferRecord && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-800">
                                Pref. recordatorio
                              </span>
                            )}
                            {phone.preferCobranza && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800">
                                Pref. cobranza
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Clínica (badges) */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                                p.hasAlergias
                                  ? "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800"
                                  : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                              )}
                            >
                              <CircleAlert className="mr-1 size-3" />
                              Alergias
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Indica si existen alergias registradas</TooltipContent>
                        </Tooltip>

                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            p.hasMedicacion
                              ? "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800"
                              : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                          )}
                        >
                          <Stethoscope className="mr-1 size-3" />
                          Medicación
                        </span>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                                p.obraSocial
                                  ? "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-800"
                                  : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                              )}
                            >
                              <NotebookPen className="mr-1 size-3" />
                              {p.obraSocial ? `Obra: ${p.obraSocial}` : "Obra social"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">{p.obraSocial || "Sin obra social"}</TooltipContent>
                        </Tooltip>

                        {p.hasResponsablePrincipal && (
                          <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800">
                            <CheckCircle2 className="mr-1 size-3" />
                            Resp. pago
                          </span>
                        )}
                        {!p.estaActivo && (
                          <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700">
                            <XCircle className="mr-1 size-3" />
                            Inactivo
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Agenda */}
                    <TableCell>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">Última:</span>
                          <span className="truncate">{formatDate(p.lastVisitAt)}</span>
                          {p.lastVisitProfesionalId && (
                            <span className="text-muted-foreground">• Prof. #{p.lastVisitProfesionalId}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="size-3.5 text-muted-foreground" />
                          <span className="font-medium">Próxima:</span>
                          <span className="truncate">{formatDateTime(p.nextAppointmentAt)}</span>
                          {p.nextAppointmentProfesionalId && (
                            <span className="text-muted-foreground">• Prof. #{p.nextAppointmentProfesionalId}</span>
                          )}
                          {p.nextAppointmentConsultorioId && (
                            <span className="text-muted-foreground">• Box #{p.nextAppointmentConsultorioId}</span>
                          )}
                          <EstadoPill estado={p.nextAppointmentEstado || undefined} />
                        </div>
                      </div>
                    </TableCell>

                    {/* Tratamiento (contador) */}
                    <TableCell className="text-center">
                      {p.activePlansCount > 0 ? (
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800">
                          {p.activePlansCount}
                        </span>
                      ) : (
                        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          0
                        </span>
                      )}
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link href={`/pacientes/${p.idPaciente}`} prefetch={false} aria-label={`Ver ${renderNombre(p)}`}>
                            Ver
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link href={`/pacientes/${p.idPaciente}/historia`} prefetch={false} aria-label={`Historia de ${renderNombre(p)}`}>
                            Historia
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link href={`/agenda/nueva?pacienteId=${p.idPaciente}`} prefetch={false} aria-label={`Agendar para ${renderNombre(p)}`}>
                            Agendar
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8",
                            p.estaActivo
                              ? "text-destructive hover:text-destructive"
                              : "text-emerald-700 hover:text-emerald-700 dark:text-emerald-300"
                          )}
                          aria-label={`${p.estaActivo ? "Inactivar" : "Activar"} a ${renderNombre(p)}`}
                          // onClick={...}
                        >
                          {p.estaActivo ? "Inactivar" : "Activar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </TooltipProvider>
  );
}

/* =========================
 * Lista Mobile (cards)
 * ========================= */
function ListMobile({ data }: { data: PacienteItem[] }) {
  return (
    <ul className="space-y-3 sm:hidden" role="list">
      {data.map((p) => {
        const phone = getTelefonoInfo(p);
        const email = getEmailInfo(p);
        return (
          <li key={p.idPaciente}>
            <Card className="p-4">
              <div className="space-y-3">
                {/* Identificación */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight">{renderNombre(p)}</h3>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      <FileText className="mr-1 inline size-3" />
                      <span className="truncate">{renderDocumento(p)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{p.edad != null ? `${p.edad} años` : "—"}</span>
                      <GeneroDot genero={p.persona.genero} />
                      {p.estaActivo ? (
                        <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-800">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contacto */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3 text-muted-foreground" />
                    <span className="truncate">{phone.display}</span>
                    {phone.whatsapp && <span className="rounded-full border px-1.5 text-[10px] leading-5 text-emerald-700 dark:text-emerald-300">WhatsApp</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3 text-muted-foreground" />
                    <span className="truncate">{email}</span>
                  </div>
                </div>

                {/* Clínica */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset",
                    p.hasAlergias ? "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800"
                                   : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700")}>
                    Alergias
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset",
                    p.hasMedicacion ? "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800"
                                    : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700")}>
                    Medicación
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset",
                    p.obraSocial ? "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-800"
                                 : "bg-zinc-200 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700")}>
                    {p.obraSocial ? `Obra: ${p.obraSocial}` : "Obra social"}
                  </span>
                  {p.hasResponsablePrincipal && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-800 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800">
                      Resp. pago
                    </span>
                  )}
                </div>

                {/* Agenda */}
                <div className="space-y-1 text-xs">
                  <div><span className="font-medium">Última:</span> {formatDate(p.lastVisitAt)} {p.lastVisitProfesionalId ? `• Prof. #${p.lastVisitProfesionalId}` : ""}</div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">Próxima:</span>
                    <span>{formatDateTime(p.nextAppointmentAt)}</span>
                    {p.nextAppointmentProfesionalId && <span>• Prof. #{p.nextAppointmentProfesionalId}</span>}
                    {p.nextAppointmentConsultorioId && <span>• Box #{p.nextAppointmentConsultorioId}</span>}
                    <EstadoPill estado={p.nextAppointmentEstado || undefined} />
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 border-t pt-3">
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/pacientes/${p.idPaciente}`} prefetch={false}>Ver</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/pacientes/${p.idPaciente}/historia`} prefetch={false}>Historia</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/agenda/nueva?pacienteId=${p.idPaciente}`} prefetch={false}>
                      <Plus className="mr-1 size-3.5" /> Agendar
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

/* =========================
 * Skeleton de carga
 * ========================= */
function PacientesSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Identificación</TableHead>
              <TableHead className="font-semibold">Contacto</TableHead>
              <TableHead className="font-semibold">Clínica</TableHead>
              <TableHead className="font-semibold">Agenda</TableHead>
              <TableHead className="font-semibold">Trat.</TableHead>
              <TableHead className="text-right font-semibold">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-44" /><div className="mt-1"><Skeleton className="h-4 w-48" /></div></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /><div className="mt-1"><Skeleton className="h-4 w-44" /></div></TableCell>
                <TableCell><Skeleton className="h-6 w-56" /></TableCell>
                <TableCell><Skeleton className="h-4 w-64" /><div className="mt-1"><Skeleton className="h-4 w-56" /></div></TableCell>
                <TableCell className="text-center"><Skeleton className="mx-auto h-6 w-8 rounded-full" /></TableCell>
                <TableCell className="text-right"><div className="ml-auto flex w-40 justify-end gap-2"><Skeleton className="h-8 w-12" /><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-16" /></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* =========================
 * Empty State
 * ========================= */
function EmptyState({ query }: { query: string }) {
  const searching = Boolean(query?.trim());
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border py-12 text-center">
      <Users className="size-8 text-muted-foreground" />
      <div className="text-lg font-semibold">
        {searching ? "No se encontraron pacientes" : "No hay pacientes registrados"}
      </div>
      <div className="max-w-md text-sm text-muted-foreground">
        {searching
          ? `No hay resultados para “${query}”. Prueba con otros términos.`
          : "Comienza agregando tu primer paciente al sistema."}
      </div>
      {!searching && (
        <div className="mt-2">
          <Button asChild>
            <Link href="/pacientes/nuevo" prefetch={false}>
              <Users className="mr-1 size-4" />
              Crear primer paciente
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

/* =========================
 * Componente principal
 * ========================= */
export default function PacientesTable() {
  const [q, setQ] = useState("");
  const [openQuick, setOpenQuick] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const deferredQ = useDeferredValue(q);
  const [genero, setGenero] = useState<"MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO" | undefined>(undefined);
  const [hasEmail, setHasEmail] = useState<boolean | undefined>(undefined);
  const [hasPhone, setHasPhone] = useState<boolean | undefined>(undefined);
  const [createdFrom, setCreatedFrom] = useState<string | undefined>(undefined);
  const [createdTo, setCreatedTo] = useState<string | undefined>(undefined);
  const [sort, setSort] = useState<"createdAt desc" | "createdAt asc" | "nombre asc" | "nombre desc">("createdAt desc");

  const soloActivos = true;
  const limit = 20;

  const {
    items, hasMore, totalCount,
    fetchNextPage, isFetchingNextPage, isLoading, isError, error, refetch, isFetching,
  } = usePacientes({ q: deferredQ, soloActivos, limit, genero, hasEmail, hasPhone, createdFrom, createdTo, sort });

  const showSkeleton = isLoading && !items.length;
  const showEmpty = !isLoading && !isError && items.length === 0;

  return (
    <section className="space-y-4" aria-label="Gestión de pacientes">
      {/* Banner de éxito al crear rápido */}
      {createdId && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-green-900 dark:text-green-100">
              Paciente creado correctamente.{" "}
              <Link
                href={`/pacientes/${createdId}`}
                className="font-medium underline underline-offset-4 hover:text-green-700 dark:hover:text-green-300"
              >
                Ver detalles
              </Link>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCreatedId(null)}
              className="shrink-0 text-green-900 hover:bg-green-100 hover:text-green-900 dark:text-green-100 dark:hover:bg-green-900/30"
              aria-label="Cerrar notificación"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <Toolbar
        q={q} setQ={setQ} onOpenQuick={() => setOpenQuick(true)}
        genero={genero} setGenero={setGenero}
        hasEmail={hasEmail} setHasEmail={setHasEmail}
        hasPhone={hasPhone} setHasPhone={setHasPhone}
        createdFrom={createdFrom} setCreatedFrom={setCreatedFrom}
        createdTo={createdTo} setCreatedTo={setCreatedTo}
        sort={sort} setSort={setSort}
        totalCount={totalCount}
      />

      {/* Errores */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              Ocurrió un error al cargar los pacientes.{" "}
              <button onClick={() => refetch()} className="font-medium underline underline-offset-4 hover:no-underline">
                Reintentar
              </button>
            </span>
            {process.env.NODE_ENV !== "production" && (
              <span className="text-xs opacity-70">{(error as any)?.message || "Error desconocido"}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showSkeleton && <PacientesSkeleton />}

      {!isError && !showSkeleton && (
        <>
          {showEmpty ? (
            <EmptyState query={q} />
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden sm:block">
                <TableDesktop data={items} />
              </div>
              {/* Mobile */}
              <div className="sm:hidden">
                <ListMobile data={items} />
              </div>

              {/* Paginación */}
              <div className="flex justify-center pt-2">
                {hasMore ? (
                  <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="lg">
                    {isFetchingNextPage ? "Cargando..." : "Cargar más pacientes"}
                  </Button>
                ) : (
                  items.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {isFetching ? "Actualizando..." : "No hay más resultados"}
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Modal de alta rápida */}
      <PatientQuickCreateModal
        open={openQuick}
        onClose={() => setOpenQuick(false)}
        onCreated={(id) => setCreatedId(String(id))}
        qForList={deferredQ}
        soloActivos={soloActivos}
        limit={limit}
      />
    </section>
  );
}
