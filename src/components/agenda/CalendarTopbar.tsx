"use client";

import * as React from "react";
import { CalendarFilters, CalendarRange, EstadoCita, TipoCita } from "./CitasCalendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/common/MultiSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfesionalesOptions, useConsultoriosOptions } from "@/hooks/useCitasCalendarSource";

export function CalendarTopbar({
  filters,
  setFilters,
  onApply,
  onClear,
  onRangeChange,
  currentUser,
  className,
}: {
  filters: CalendarFilters;
  setFilters: React.Dispatch<React.SetStateAction<CalendarFilters>>;
  onApply: () => void;
  onClear: () => void;
  onRangeChange: (r: CalendarRange) => void;
  currentUser?: { rol: "ADMIN" | "ODONT" | "RECEP"; profesionalId?: number | null };
  className?: string;
}) {
  const { data: profesionales } = useProfesionalesOptions();
  const { data: consultorios } = useConsultoriosOptions();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2">
        <MultiSelect
          label="Profesional"
          options={(profesionales ?? []).map((p) => ({ label: p.nombre, value: String(p.id) }))}
          values={filters.profesionalIds.map(String)}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, profesionalIds: vals.map((v) => Number(v)) }))
          }
          placeholder={
            currentUser?.rol === "ODONT" ? "Mi agenda (por defecto)" : "Todos"
          }
        />

        <MultiSelect
          label="Consultorio"
          options={(consultorios ?? []).map((c) => ({ label: c.nombre, value: String(c.id) }))}
          values={filters.consultorioIds.map(String)}
          onChange={(vals) =>
            setFilters((f) => ({ ...f, consultorioIds: vals.map((v) => Number(v)) }))
          }
          placeholder="Todos"
        />

        <MultiSelect
          label="Estado"
          options={ESTADOS.map((e) => ({ label: pretty(e), value: e }))}
          values={filters.estados}
          onChange={(vals) => setFilters((f) => ({ ...f, estados: vals as EstadoCita[] }))}
          placeholder="Todos"
        />

        <MultiSelect
          label="Tipo"
          options={TIPOS.map((t) => ({ label: pretty(t), value: t }))}
          values={filters.tipos}
          onChange={(vals) => setFilters((f) => ({ ...f, tipos: vals as TipoCita[] }))}
          placeholder="Todos"
        />

        <div className="flex flex-col">
          <span className="mb-1.5 block text-sm font-medium text-muted-foreground">Rango rápido</span>
          <Select
            value={filters.range}
            onValueChange={(v) => onRangeChange(v as CalendarRange)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="SEMANA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOY">Hoy</SelectItem>
              <SelectItem value="SEMANA">Semana</SelectItem>
              <SelectItem value="MES">Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" onClick={onClear}>Limpiar</Button>
        <Button onClick={onApply}>Aplicar</Button>
      </div>
    </div>
  );
}

const ESTADOS: EstadoCita[] = [
  "SCHEDULED",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const TIPOS: TipoCita[] = [
  "CONSULTA",
  "LIMPIEZA",
  "ENDODONCIA",
  "EXTRACCION",
  "URGENCIA",
  "ORTODONCIA",
  "CONTROL",
  "OTRO",
];

function pretty(s: string) {
  return s.replaceAll("_", " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase());
}
