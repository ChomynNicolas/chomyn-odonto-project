// src/components/selectors/PacienteAsyncSelect.tsx
"use client";
import * as React from "react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { User2, IdCard, Phone, Plus } from "lucide-react";
import { type PacienteOption, apiBuscarPacientes } from "@/lib/api/agenda/lookup";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

type Props = {
  value?: number;
  onChange: (id: number) => void;
  placeholder?: string;
  onCreateNew?: () => void; // opcional: alta rápida
  defaultQuery?: string;
  disabled?: boolean;
};

export function PacienteAsyncSelect({ value, onChange, placeholder = "Buscar por nombre o cédula", onCreateNew, defaultQuery = "", disabled }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(defaultQuery);
  const debounced = useDebouncedValue(query, 250);
  const [items, setItems] = React.useState<PacienteOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [label, setLabel] = React.useState<string>("");

  // Efecto para buscar pacientes cuando cambia el query debounced
  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiBuscarPacientes(debounced, 10);
        if (!active) return;
        setItems(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debounced]);

  // Efecto separado para cargar el label cuando hay un value seleccionado
  React.useEffect(() => {
    if (!value || items.length === 0) return;
    
    const found = items.find((d) => d.id === value);
    if (found) {
      const newLabel = `${found.label}${found.doc ? " · " + found.doc : ""}`;
      // Solo actualizar si el label actual no coincide con el nuevo label
      // Esto previene loops infinitos mientras mantiene el label actualizado
      setLabel((currentLabel) => {
        if (currentLabel === newLabel) return currentLabel;
        return newLabel;
      });
    }
  }, [value, items]);

  const current = value ? items.find((i) => i.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between">
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {current ? `${current.label}${current.doc ? " · " + current.doc : ""}` : (label || placeholder)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList>
            {loading && <CommandEmpty>Buscando…</CommandEmpty>}
            {!loading && items.length === 0 && (
              <CommandEmpty>
                Sin resultados.
                {onCreateNew && (
                  <div className="mt-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setOpen(false); onCreateNew(); }}>
                      <Plus className="mr-1 h-4 w-4" /> Crear paciente
                    </Button>
                  </div>
                )}
              </CommandEmpty>
            )}
            <CommandGroup>
              <ScrollArea className="max-h-72">
                {items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={String(it.id)}
                    onSelect={() => { onChange(it.id); setLabel(`${it.label}${it.doc ? " · " + it.doc : ""}`); setOpen(false); }}
                  >
                    <User2 className="mr-2 h-4 w-4" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{it.label}</div>
                      <div className="text-xs text-muted-foreground flex gap-2">
                        {it.doc && <span className="inline-flex items-center"><IdCard className="h-3 w-3 mr-1" />{it.doc}</span>}
                        {it.contacto && <span className="inline-flex items-center"><Phone className="h-3 w-3 mr-1" />{it.contacto}</span>}
                        {typeof it.edad === "number" && <span>{it.edad} años</span>}
                      </div>
                    </div>
                    <div className="ml-auto">
                      {!it.activo && <Badge variant="destructive">Inactivo</Badge>}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
