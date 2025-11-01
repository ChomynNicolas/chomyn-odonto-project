"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { label: string; value: string };

export function MultiSelect({
  label,
  options,
  values,
  onChange,
  placeholder,
}: {
  label?: string;
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const selectedLabels = options
    .filter((o) => values.includes(o.value))
    .map((o) => o.label)
    .join(", ");

  return (
    <div className="flex flex-col">
      {label ? <span className="mb-1.5 block text-sm font-medium text-muted-foreground">{label}</span> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="justify-between h-10">
            <span className={cn("truncate", !values.length && "text-muted-foreground")}>
              {values.length ? selectedLabels : (placeholder ?? "Seleccionar")}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
          <Command loop>
            <CommandInput placeholder="Buscar..." />
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = values.includes(o.value);
                return (
                  <CommandItem
                    key={o.value}
                    onSelect={() => {
                      if (checked) onChange(values.filter((v) => v !== o.value));
                      else onChange([...values, o.value]);
                    }}
                    className="pr-8"
                  >
                    <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                    {o.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
