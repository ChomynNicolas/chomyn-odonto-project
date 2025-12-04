"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Abrir diálogo con Cmd+K o Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = React.useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-64"
        )}
        onClick={() => setOpen(true)}
        aria-label="Buscar pacientes, citas y más"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline-flex">Buscar pacientes, citas...</span>
        <span className="hidden sm:inline-flex absolute right-1.5 top-1.5 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar pacientes, citas, reportes..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          <CommandGroup heading="Acceso Rápido">
            <CommandItem
              onSelect={() => handleSelect("/pacientes")}
              className="cursor-pointer"
            >
              <User className="h-4 w-4" />
              <span>Pacientes</span>
            </CommandItem>
            <CommandItem
              onSelect={() => handleSelect("/calendar")}
              className="cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
              <span>Agenda</span>
            </CommandItem>
          </CommandGroup>
          {/* TODO: Implementar búsqueda real con React Query */}
          {/* Aquí se agregará búsqueda de pacientes, citas, etc. usando React Query */}
        </CommandList>
      </CommandDialog>
    </>
  );
}

