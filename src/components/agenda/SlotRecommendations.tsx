// src/components/agenda/SlotRecommendations.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SlotRecommendation {
  fecha: string // YYYY-MM-DD
  inicioISO: string
  finISO: string
  inicioLocal: string // HH:mm
  finLocal: string // HH:mm
  fechaDisplay: string // Formato legible
}

interface SlotRecommendationsProps {
  recomendaciones: SlotRecommendation[]
  onSelectSlot: (fecha: string, horaInicio: string) => void
  className?: string
}

/**
 * Componente para mostrar y seleccionar horarios recomendados.
 * Agrupa por día y permite seleccionar fácilmente.
 */
export function SlotRecommendations({
  recomendaciones,
  onSelectSlot,
  className,
}: SlotRecommendationsProps) {
  // Agrupar recomendaciones por día
  const porDia = React.useMemo(() => {
    const grupos = new Map<string, SlotRecommendation[]>();
    
    for (const rec of recomendaciones) {
      const dia = rec.fecha;
      if (!grupos.has(dia)) {
        grupos.set(dia, []);
      }
      grupos.get(dia)!.push(rec);
    }

    // Ordenar días
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [recomendaciones]);

  if (recomendaciones.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Horarios disponibles recomendados</p>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {porDia.map(([fecha, slots]) => (
          <div key={fecha} className="space-y-2">
            {/* Encabezado del día */}
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{slots[0]?.fechaDisplay ?? fecha}</span>
            </div>

            {/* Slots del día */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map((slot, idx) => (
                <Button
                  key={`${slot.inicioISO}-${idx}`}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectSlot(slot.fecha, slot.inicioLocal)}
                  className="h-auto py-2 px-3 flex flex-col items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <span className="text-xs font-medium">{slot.inicioLocal}</span>
                  <span className="text-[10px] text-muted-foreground">– {slot.finLocal}</span>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {recomendaciones.length >= 10 && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando las 10 mejores opciones. Ajuste los filtros para ver más.
        </p>
      )}
    </div>
  );
}

