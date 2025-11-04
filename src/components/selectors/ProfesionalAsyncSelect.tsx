// src/components/selectors/ProfesionalAsyncSelect.tsx
"use client";
import * as React from "react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { type ProfesionalOption, apiBuscarProfesionales } from "@/lib/api/agenda/lookup";
import { cn } from "@/lib/utils";

type Props = {
  value?: number;
  onChange: (id: number) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function ProfesionalAsyncSelect({ value, onChange, placeholder = "Buscar profesional", disabled }: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debounced = useDebouncedValue(query, 200);
  const [items, setItems] = React.useState<ProfesionalOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [label, setLabel] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiBuscarProfesionales(debounced);
        if (!active) return;
        setItems(data);
        if (value && !label) {
          const found = data.find((d) => d.id === value);
          if (found) setLabel(found.nombre);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [debounced]);

  const current = value ? items.find((i) => i.id === value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="w-full justify-between">
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {current ? current.nombre : (label || placeholder)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} autoFocus />
          <CommandList>
            {loading && <CommandEmpty>Buscando…</CommandEmpty>}
            {!loading && items.length === 0 && <CommandEmpty>Sin resultados.</CommandEmpty>}
            <CommandGroup>
              {items.map((it) => (
                <CommandItem
                  key={it.id}
                  value={String(it.id)}
                  onSelect={() => { onChange(it.id); setLabel(it.nombre); setOpen(false); }}
                >
                  <Stethoscope className="mr-2 h-4 w-4" />
                  <span className="truncate">{it.nombre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
