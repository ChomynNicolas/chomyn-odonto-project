"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, Plus, X } from "lucide-react"
import { AgendaFilters, CurrentUser, EstadoCita, TipoCita } from "@/types/agenda"

interface AgendaTopbarProps {
  filters: AgendaFilters
  onFiltersChange: (filters: AgendaFilters) => void
  onNuevaCita: () => void
  currentUser?: CurrentUser
}

export function AgendaTopbar({ filters, onFiltersChange, onNuevaCita, currentUser }: AgendaTopbarProps) {
  const [busqueda, setBusqueda] = React.useState(filters.busquedaPaciente ?? "")
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  // Debounce búsqueda
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, busquedaPaciente: busqueda || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda])

  const activeFiltersCount = [
    filters.profesionalId,
    filters.consultorioId,
    filters.estado?.length,
    filters.tipo?.length,
    filters.soloUrgencias,
    filters.soloPrimeraVez,
    filters.soloPlanActivo,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Fila principal: búsqueda + acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Búsqueda de paciente */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar paciente (nombre o documento)..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 h-10"
            aria-label="Buscar paciente"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {/* Filtros avanzados (sheet en mobile/tablet) */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="default" className="relative bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros de agenda</SheetTitle>
              </SheetHeader>
              <FiltersForm filters={filters} onFiltersChange={onFiltersChange} currentUser={currentUser} />
            </SheetContent>
          </Sheet>

          {/* Nueva cita */}
          <Button onClick={onNuevaCita} size="default" className="min-w-[120px]">
            <Plus className="h-4 w-4 mr-2" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Chips de filtros activos */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          {filters.profesionalId && (
            <FilterChip
              label={`Profesional #${filters.profesionalId}`}
              onRemove={() => onFiltersChange({ ...filters, profesionalId: undefined })}
            />
          )}
          {filters.consultorioId && (
            <FilterChip
              label={`Consultorio #${filters.consultorioId}`}
              onRemove={() => onFiltersChange({ ...filters, consultorioId: undefined })}
            />
          )}
          {filters.estado && filters.estado.length > 0 && (
            <FilterChip
              label={`Estados (${filters.estado.length})`}
              onRemove={() => onFiltersChange({ ...filters, estado: undefined })}
            />
          )}
          {filters.tipo && filters.tipo.length > 0 && (
            <FilterChip
              label={`Tipos (${filters.tipo.length})`}
              onRemove={() => onFiltersChange({ ...filters, tipo: undefined })}
            />
          )}
          {filters.soloUrgencias && (
            <FilterChip label="Solo urgencias" onRemove={() => onFiltersChange({ ...filters, soloUrgencias: false })} />
          )}
          {filters.soloPrimeraVez && (
            <FilterChip label="Primera vez" onRemove={() => onFiltersChange({ ...filters, soloPrimeraVez: false })} />
          )}
          {filters.soloPlanActivo && (
            <FilterChip label="Plan activo" onRemove={() => onFiltersChange({ ...filters, soloPlanActivo: false })} />
          )}
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange({})} className="h-7 text-xs">
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1">
      <span className="text-xs">{label}</span>
      <button
        onClick={onRemove}
        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
        aria-label={`Quitar filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

function FiltersForm({
  filters,
  onFiltersChange,
  currentUser,
}: {
  filters: AgendaFilters
  onFiltersChange: (filters: AgendaFilters) => void
  currentUser?: CurrentUser
}) {
  const [localFilters, setLocalFilters] = React.useState(filters)

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleReset = () => {
    setLocalFilters({})
    onFiltersChange({})
  }

  return (
    <div className="space-y-6 py-6">
      {/* Profesional */}
      <div className="space-y-2">
        <Label htmlFor="filter-profesional">Profesional</Label>
        <Input
          id="filter-profesional"
          type="number"
          placeholder="ID del profesional"
          value={localFilters.profesionalId ?? ""}
          onChange={(e) =>
            setLocalFilters({
              ...localFilters,
              profesionalId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
        {currentUser?.rol === "ODONT" && currentUser.profesionalId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalFilters({ ...localFilters, profesionalId: currentUser.profesionalId! })}
          >
            Mis citas
          </Button>
        )}
      </div>

      {/* Consultorio */}
      <div className="space-y-2">
        <Label htmlFor="filter-consultorio">Consultorio</Label>
        <Input
          id="filter-consultorio"
          type="number"
          placeholder="ID del consultorio"
          value={localFilters.consultorioId ?? ""}
          onChange={(e) =>
            setLocalFilters({
              ...localFilters,
              consultorioId: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {/* Estados (multi-select simulado con checkboxes) */}
      <div className="space-y-2">
        <Label>Estados</Label>
        <div className="space-y-2">
          {ESTADOS_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`estado-${opt.value}`}
                checked={localFilters.estado?.includes(opt.value as EstadoCita) ?? false}
                onCheckedChange={(checked) => {
                  const current = localFilters.estado ?? []
                  const updated = checked
                    ? [...current, opt.value as EstadoCita]
                    : current.filter((e) => e !== opt.value)
                  setLocalFilters({
                    ...localFilters,
                    estado: updated.length > 0 ? updated : undefined,
                  })
                }}
              />
              <label
                htmlFor={`estado-${opt.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Tipos */}
      <div className="space-y-2">
        <Label>Tipos de cita</Label>
        <div className="space-y-2">
          {TIPOS_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center space-x-2">
              <Checkbox
                id={`tipo-${opt.value}`}
                checked={localFilters.tipo?.includes(opt.value as TipoCita) ?? false}
                onCheckedChange={(checked) => {
                  const current = localFilters.tipo ?? []
                  const updated = checked ? [...current, opt.value as TipoCita] : current.filter((t) => t !== opt.value)
                  setLocalFilters({
                    ...localFilters,
                    tipo: updated.length > 0 ? updated : undefined,
                  })
                }}
              />
              <label
                htmlFor={`tipo-${opt.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Flags especiales */}
      <div className="space-y-3">
        <Label>Filtros especiales</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solo-urgencias"
              checked={localFilters.soloUrgencias ?? false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, soloUrgencias: checked as boolean })}
            />
            <label htmlFor="solo-urgencias" className="text-sm font-medium leading-none cursor-pointer">
              Solo urgencias
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solo-primera-vez"
              checked={localFilters.soloPrimeraVez ?? false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, soloPrimeraVez: checked as boolean })}
            />
            <label htmlFor="solo-primera-vez" className="text-sm font-medium leading-none cursor-pointer">
              Primera vez
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="solo-plan-activo"
              checked={localFilters.soloPlanActivo ?? false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, soloPlanActivo: checked as boolean })}
            />
            <label htmlFor="solo-plan-activo" className="text-sm font-medium leading-none cursor-pointer">
              Con plan de tratamiento activo
            </label>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 pt-4">
        <Button onClick={handleApply} className="flex-1">
          Aplicar filtros
        </Button>
        <Button onClick={handleReset} variant="outline">
          Limpiar
        </Button>
      </div>
    </div>
  )
}

const ESTADOS_OPTIONS = [
  { value: "SCHEDULED", label: "Agendada" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CHECKED_IN", label: "Check-in" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No asistió" },
]

const TIPOS_OPTIONS = [
  { value: "CONSULTA", label: "Consulta" },
  { value: "LIMPIEZA", label: "Limpieza" },
  { value: "ENDODONCIA", label: "Endodoncia" },
  { value: "EXTRACCION", label: "Extracción" },
  { value: "URGENCIA", label: "Urgencia" },
  { value: "ORTODONCIA", label: "Ortodoncia" },
  { value: "CONTROL", label: "Control" },
  { value: "OTRO", label: "Otro" },
]
