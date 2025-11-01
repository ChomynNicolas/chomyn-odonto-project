"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Muestra pauta de color: punto = consultorio; chip = estado */
export function CalendarLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-sm", className)}>
      <div className="flex items-center gap-2">
        <span className="inline-block size-2 rounded-full bg-[--legend-consultorio] ring-1 ring-border" />
        <span className="text-muted-foreground">Color por consultorio</span>
      </div>

      <span className="ml-2 text-muted-foreground">·</span>

      <div className="flex items-center gap-1">
        <Chip>Scheduled</Chip>
        <Chip>Confirmed</Chip>
        <Chip>Check-in</Chip>
        <Chip>En curso</Chip>
        <Chip>Completada</Chip>
        <Chip>Cancelada</Chip>
        <Chip>No show</Chip>
      </div>
    </div>
  );
}

function Chip({ children }: React.PropsWithChildren) {
  return (
    <span className="text-[11px] px-1 py-[1px] rounded border border-border">
      {children}
    </span>
  );
}
