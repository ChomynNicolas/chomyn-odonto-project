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
import { ProfesionalAsyncSelect } from "@/components/selectors/ProfesionalAsyncSelect"
import { ConsultorioAsyncSelect } from "@/components/selectors/ConsultorioAsyncSelect"

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const isDentistView = currentUser?.role === "ODONT" && currentUser.profesionalId
  
  // For ODONT users, don't count profesionalId as an active filter (it's locked)
  const activeFiltersCount = [
    !isDentistView && filters.profesionalId, // Only count if not dentist view
    filters.consultorioId,
    filters.estado?.length,
    filters.tipo?.length,
    filters.hideCompleted,
    filters.hideCancelled,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Indicador de "Mi Agenda" para odontólogos */}
      {isDentistView && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            📅 Mi Agenda
          </span>
        </div>
      )}

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
          {/* Búsqueda avanzada */}

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
              <FiltersForm 
                filters={filters} 
                onFiltersChange={onFiltersChange} 
                currentUser={currentUser}
                onClose={() => setFiltersOpen(false)}
              />
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
          {!isDentistView && filters.profesionalId && (
            <FilterChip
              label={`Profesional`}
              onRemove={() => onFiltersChange({ ...filters, profesionalId: undefined })}
            />
          )}
          {filters.consultorioId && (
            <FilterChip
              label={`Consultorio`}
              onRemove={() => onFiltersChange({ ...filters, consultorioId: undefined })}
            />
          )}
          {filters.hideCompleted && (
            <FilterChip
              label="Ocultar completadas"
              onRemove={() => onFiltersChange({ ...filters, hideCompleted: false })}
            />
          )}
          {filters.hideCancelled && (
            <FilterChip
              label="Ocultar canceladas"
              onRemove={() => onFiltersChange({ ...filters, hideCancelled: false })}
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
  onClose,
}: {
  filters: AgendaFilters
  onFiltersChange: (filters: AgendaFilters) => void
  currentUser?: CurrentUser
  onClose?: () => void
}) {
  const isDentistView = currentUser?.role === "ODONT" && currentUser.profesionalId
  
  // Initialize localFilters, ensuring ODONT users always have their professional ID
  const [localFilters, setLocalFilters] = React.useState<AgendaFilters>(() => {
    if (isDentistView && currentUser?.profesionalId) {
      return {
        ...filters,
        profesionalId: currentUser.profesionalId,
      }
    }
    return filters
  })

  // Sincronizar localFilters cuando filters cambia externamente
  // Para ODONT users, siempre preservar su professional ID
  React.useEffect(() => {
    if (isDentistView && currentUser?.profesionalId) {
      setLocalFilters({
        ...filters,
        profesionalId: currentUser.profesionalId,
      })
    } else {
      setLocalFilters(filters)
    }
  }, [filters, isDentistView, currentUser?.profesionalId])

  const handleApply = () => {
    onFiltersChange(localFilters)
    // Cerrar el Sheet después de aplicar los filtros
    onClose?.()
  }

  const handleReset = () => {
    // For ODONT users, preserve their professional ID when resetting
    const resetFilters: AgendaFilters = isDentistView && currentUser?.profesionalId
      ? { profesionalId: currentUser.profesionalId }
      : {}
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
    // Cerrar el Sheet después de limpiar los filtros
    onClose?.()
  }

  return (
    <div className="space-y-6 py-6">
      {/* Profesional - Oculto/deshabilitado para odontólogos */}
      {!isDentistView && (
        <div className="space-y-2">
          <Label htmlFor="filter-profesional">Profesional</Label>
          <ProfesionalAsyncSelect
            value={localFilters.profesionalId}
            onChange={(id) => setLocalFilters({ ...localFilters, profesionalId: id })}
            placeholder="Seleccionar profesional"
          />
        </div>
      )}
      
      {/* Información para odontólogos */}
      {isDentistView && (
        <div className="space-y-2">
          <Label>Profesional</Label>
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="font-semibold text-foreground">Mi Agenda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Solo puedes ver tus propias citas
            </p>
          </div>
        </div>
      )}

      {/* Consultorio */}
      <div className="space-y-2">
        <Label htmlFor="filter-consultorio">Consultorio</Label>
        <ConsultorioAsyncSelect
          value={localFilters.consultorioId}
          onChange={(id) => setLocalFilters({ ...localFilters, consultorioId: id })}
          placeholder="Seleccionar consultorio"
        />
      </div>

      {/* Visibilidad de estados */}
      <div className="space-y-3">
        <Label>Visibilidad de estados</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-completed"
              checked={localFilters.hideCompleted ?? false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, hideCompleted: checked as boolean })}
            />
            <label htmlFor="hide-completed" className="text-sm font-medium leading-none cursor-pointer">
              Ocultar citas completadas
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-cancelled"
              checked={localFilters.hideCancelled ?? false}
              onCheckedChange={(checked) => setLocalFilters({ ...localFilters, hideCancelled: checked as boolean })}
            />
            <label htmlFor="hide-cancelled" className="text-sm font-medium leading-none cursor-pointer">
              Ocultar citas canceladas
            </label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Estas opciones ocultan automáticamente los estados seleccionados, independientemente de los filtros de estado.
        </p>
      </div>

      {/* Estados (multi-select simulado con checkboxes) */}
      <div className="space-y-2">
        <Label>Estados específicos</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Seleccione los estados que desea ver. Las opciones de visibilidad arriba tienen prioridad.
        </p>
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
