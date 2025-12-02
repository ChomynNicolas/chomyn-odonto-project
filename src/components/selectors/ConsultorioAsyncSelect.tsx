// src/components/selectors/ConsultorioAsyncSelect.tsx
"use client";
import * as React from "react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsultorioOption = {
  id: number;
  nombre: string;
};

type Props = {
  value?: number;
  onChange: (id: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
};

async function fetchConsultorios(): Promise<ConsultorioOption[]> {
  const res = await fetch("/api/consultorios/options", {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Error al cargar consultorios");
  }
  return res.json();
}

export function ConsultorioAsyncSelect({ value, onChange, placeholder = "Seleccionar consultorio", disabled }: Props) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<ConsultorioOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasAutoSelectedRef = React.useRef(false);

  // Cargar consultorios al montar el componente
  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchConsultorios();
        if (!active) return;
        setItems(data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Si solo hay un consultorio, auto-seleccionarlo y deshabilitar (solo una vez)
  React.useEffect(() => {
    if (items.length === 1 && !value && !disabled && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      onChange(items[0].id);
    }
  }, [items, value, onChange, disabled]);

  const current = value ? items.find((i) => i.id === value) : undefined;
  const isSingleOption = items.length === 1;
  const isDisabled = disabled || isSingleOption;

  return (
    <Popover open={open && !isDisabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          role="combobox" 
          aria-expanded={open} 
          disabled={isDisabled} 
          className="w-full justify-between"
          aria-label={isSingleOption ? "Solo hay un consultorio disponible" : placeholder}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {current ? current.nombre : (isSingleOption && items[0] ? items[0].nombre : placeholder)}
          </span>
        </Button>
      </PopoverTrigger>
      {!isDisabled && (
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar consultorio..." />
            <CommandList>
              {loading && <CommandEmpty>Cargando consultorios…</CommandEmpty>}
              {error && <CommandEmpty>Error: {error}</CommandEmpty>}
              {!loading && !error && items.length === 0 && <CommandEmpty>Sin consultorios disponibles.</CommandEmpty>}
              <CommandGroup>
                {items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={String(it.id)}
                    onSelect={() => {
                      // Toggle: si ya está seleccionado, deseleccionar; si no, seleccionar
                      const newValue = value === it.id ? undefined : it.id;
                      onChange(newValue);
                      setOpen(false);
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="truncate">{it.nombre}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}

