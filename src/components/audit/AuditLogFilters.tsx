// src/components/audit/AuditLogFilters.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AuditLogFilters } from "@/lib/types/audit"
import { ACTION_LABELS, ENTITY_LABELS } from "@/lib/types/audit"

interface AuditLogFiltersProps {
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
  onReset: () => void
}

export function AuditLogFilters({ filters, onFiltersChange, onReset }: AuditLogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters)

  const hasActiveFilters =
    !!localFilters.dateFrom ||
    !!localFilters.dateTo ||
    !!localFilters.actorId ||
    !!localFilters.action ||
    !!localFilters.entity ||
    !!localFilters.entityId ||
    !!localFilters.search ||
    !!localFilters.ip

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters: AuditLogFilters = {
      page: 1,
      limit: 20,
    }
    setLocalFilters(resetFilters)
    onReset()
  }

  const updateFilter = <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    Activos
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Rango de fechas */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Desde</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={localFilters.dateFrom ? localFilters.dateFrom.slice(0, 16) : ""}
                  onChange={(e) =>
                    updateFilter("dateFrom", e.target.value ? `${e.target.value}:00` : undefined)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={localFilters.dateTo ? localFilters.dateTo.slice(0, 16) : ""}
                  onChange={(e) =>
                    updateFilter("dateTo", e.target.value ? `${e.target.value}:00` : undefined)
                  }
                />
              </div>

              {/* Usuario */}
              <div className="space-y-2">
                <Label htmlFor="actorId">Usuario (ID)</Label>
                <Input
                  id="actorId"
                  type="number"
                  placeholder="ID de usuario"
                  value={localFilters.actorId || ""}
                  onChange={(e) =>
                    updateFilter("actorId", e.target.value ? Number.parseInt(e.target.value) : undefined)
                  }
                />
              </div>

              {/* Tipo de acción */}
              <div className="space-y-2">
                <Label htmlFor="action">Tipo de Acción</Label>
                <Select
                  value={localFilters.action || "__all__"}
                  onValueChange={(value) => updateFilter("action", value === "__all__" ? undefined : value)}
                >
                  <SelectTrigger id="action">
                    <SelectValue placeholder="Todas las acciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las acciones</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Entidad */}
              <div className="space-y-2">
                <Label htmlFor="entity">Recurso/Entidad</Label>
                <Select
                  value={localFilters.entity || "__all__"}
                  onValueChange={(value) => updateFilter("entity", value === "__all__" ? undefined : value)}
                >
                  <SelectTrigger id="entity">
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas las entidades</SelectItem>
                    {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ID de entidad */}
              <div className="space-y-2">
                <Label htmlFor="entityId">ID del Recurso</Label>
                <Input
                  id="entityId"
                  type="number"
                  placeholder="ID del recurso"
                  value={localFilters.entityId || ""}
                  onChange={(e) =>
                    updateFilter("entityId", e.target.value ? Number.parseInt(e.target.value) : undefined)
                  }
                />
              </div>

              {/* Búsqueda de texto */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="search">Búsqueda</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Buscar en acciones, entidades o descripciones..."
                  value={localFilters.search || ""}
                  onChange={(e) => updateFilter("search", e.target.value || undefined)}
                />
              </div>

              {/* IP */}
              <div className="space-y-2">
                <Label htmlFor="ip">Dirección IP</Label>
                <Input
                  id="ip"
                  type="text"
                  placeholder="192.168.1.1"
                  value={localFilters.ip || ""}
                  onChange={(e) => updateFilter("ip", e.target.value || undefined)}
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <X className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
              <Button size="sm" onClick={handleApply}>
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

