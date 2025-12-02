// src/components/audit/AuditLogFilters.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronUp, Filter, X, Calendar, Check, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AuditLogFilters } from "@/lib/types/audit"
import { ACTION_LABELS, ENTITY_LABELS } from "@/lib/types/audit"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { DATE_PRESETS, DEFAULT_DEBOUNCE_DELAY } from "@/lib/constants/audit"
import { fetchUsers, type UserListItem } from "@/lib/api/admin/users"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AuditLogFiltersProps {
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
  onReset: () => void
  isLoading?: boolean
}

export function AuditLogFilters({ filters, onFiltersChange, onReset, isLoading = false }: AuditLogFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters)
  const [searchQuery, setSearchQuery] = useState(filters.search || "")
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [users, setUsers] = useState<UserListItem[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false)
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false)
  const [actionSearchQuery, setActionSearchQuery] = useState("")
  const [entitySearchQuery, setEntitySearchQuery] = useState("")

  // Debounce search input
  const debouncedSearch = useDebouncedValue(searchQuery, DEFAULT_DEBOUNCE_DELAY)

  // Sincronizar localFilters cuando cambien los props.filters (navegación, URL, etc.)
  useEffect(() => {
    // Asegurar que solo usamos action O actions, entity O entities (no ambos)
    const syncedFilters: AuditLogFilters = { ...filters }
    
    // Si tenemos actions, limpiar action
    if (syncedFilters.actions && syncedFilters.actions.length > 0) {
      syncedFilters.action = undefined
    }
    // Si tenemos action pero no actions, mantener action
    else if (syncedFilters.action && (!syncedFilters.actions || syncedFilters.actions.length === 0)) {
      syncedFilters.actions = undefined
    }
    
    // Si tenemos entities, limpiar entity
    if (syncedFilters.entities && syncedFilters.entities.length > 0) {
      syncedFilters.entity = undefined
    }
    // Si tenemos entity pero no entities, mantener entity
    else if (syncedFilters.entity && (!syncedFilters.entities || syncedFilters.entities.length === 0)) {
      syncedFilters.entities = undefined
    }
    
    setLocalFilters(syncedFilters)
    setSearchQuery(syncedFilters.search || "")
  }, [filters])

  // Update local search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== localFilters.search) {
      setLocalFilters((prev) => ({ ...prev, search: debouncedSearch || undefined }))
    }
  }, [debouncedSearch, localFilters.search])

  // Fetch users when dropdown opens or search changes
  useEffect(() => {
    if (!userDropdownOpen) return

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const result = await fetchUsers({
          search: userSearchQuery || undefined,
          limit: 50,
          estaActivo: true,
        })
        setUsers(result.data)
      } catch (error) {
        console.error("Error loading users:", error)
        setUsers([])
      } finally {
        setIsLoadingUsers(false)
      }
    }

    const timeoutId = setTimeout(loadUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [userDropdownOpen, userSearchQuery])

  // Find selected user
  const selectedUser = useMemo(() => {
    if (!localFilters.actorId) return null
    return users.find((u) => u.idUsuario === localFilters.actorId) || null
  }, [users, localFilters.actorId])

  // Get selected actions (support both single and multiple)
  const selectedActions = useMemo(() => {
    if (localFilters.actions && localFilters.actions.length > 0) {
      return localFilters.actions
    }
    if (localFilters.action) {
      return [localFilters.action]
    }
    return []
  }, [localFilters.actions, localFilters.action])

  // Get selected entities (support both single and multiple)
  const selectedEntities = useMemo(() => {
    if (localFilters.entities && localFilters.entities.length > 0) {
      return localFilters.entities
    }
    if (localFilters.entity) {
      return [localFilters.entity]
    }
    return []
  }, [localFilters.entities, localFilters.entity])

  /** Aplica un preset de rango de fechas */
  const applyDatePreset = (days: number) => {
    const now = new Date()
    const dateTo = now.toISOString()
    
    let dateFrom: string
    if (days === 0) {
      // "Hoy": desde inicio del día actual
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      dateFrom = startOfDay.toISOString()
    } else {
      // Últimos N días
      const fromDate = new Date(now)
      fromDate.setDate(fromDate.getDate() - days)
      dateFrom = fromDate.toISOString()
    }
    
    setLocalFilters((prev) => ({ ...prev, dateFrom, dateTo }))
  }

  const hasActiveFilters =
    !!localFilters.dateFrom ||
    !!localFilters.dateTo ||
    !!localFilters.actorId ||
    !!localFilters.action ||
    !!localFilters.actions ||
    !!localFilters.entity ||
    !!localFilters.entities ||
    !!localFilters.entityId ||
    !!localFilters.search ||
    !!localFilters.ip

  // Get all active filters for display
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = []
    
    if (localFilters.dateFrom || localFilters.dateTo) {
      const from = localFilters.dateFrom ? format(new Date(localFilters.dateFrom), "dd/MM/yyyy HH:mm", { locale: es }) : "..."
      const to = localFilters.dateTo ? format(new Date(localFilters.dateTo), "dd/MM/yyyy HH:mm", { locale: es }) : "..."
      filters.push({ key: "dateRange", label: "Rango de fechas", value: `${from} - ${to}` })
    }
    
    if (localFilters.actorId && selectedUser) {
      filters.push({ key: "actorId", label: "Usuario", value: selectedUser.nombreApellido })
    }
    
    if (selectedActions.length > 0) {
      const actionLabels = selectedActions.map(a => ACTION_LABELS[a] || a).join(", ")
      filters.push({ key: "actions", label: selectedActions.length === 1 ? "Acción" : "Acciones", value: actionLabels })
    }
    
    if (selectedEntities.length > 0) {
      const entityLabels = selectedEntities.map(e => ENTITY_LABELS[e] || e).join(", ")
      filters.push({ key: "entities", label: selectedEntities.length === 1 ? "Entidad" : "Entidades", value: entityLabels })
    }
    
    if (localFilters.entityId) {
      filters.push({ key: "entityId", label: "ID Recurso", value: String(localFilters.entityId) })
    }
    
    if (localFilters.search) {
      filters.push({ key: "search", label: "Búsqueda", value: localFilters.search })
    }
    
    if (localFilters.ip) {
      filters.push({ key: "ip", label: "IP", value: localFilters.ip })
    }
    
    return filters
  }, [localFilters, selectedUser, selectedActions, selectedEntities])

  const handleApply = () => {
    // Convert single selections to arrays for backend compatibility
    const filtersToApply: AuditLogFilters = { ...localFilters }
    
    // If we have actions array, clear single action
    if (selectedActions.length > 0) {
      filtersToApply.actions = selectedActions
      filtersToApply.action = undefined
    } else {
      filtersToApply.actions = undefined
      filtersToApply.action = undefined
    }
    
    // If we have entities array, clear single entity
    if (selectedEntities.length > 0) {
      filtersToApply.entities = selectedEntities
      filtersToApply.entity = undefined
    } else {
      filtersToApply.entities = undefined
      filtersToApply.entity = undefined
    }
    
    onFiltersChange(filtersToApply)
  }

  const toggleAction = (action: string) => {
    setLocalFilters((prev) => {
      const currentActions = selectedActions
      const isSelected = currentActions.includes(action)
      
      let newActions: string[]
      if (isSelected) {
        newActions = currentActions.filter(a => a !== action)
      } else {
        newActions = [...currentActions, action]
      }
      
      // Update both single and array fields
      const updated: AuditLogFilters = { ...prev }
      if (newActions.length === 0) {
        updated.actions = undefined
        updated.action = undefined
      } else if (newActions.length === 1) {
        updated.actions = undefined
        updated.action = newActions[0]
      } else {
        updated.actions = newActions
        updated.action = undefined
      }
      
      return updated
    })
  }

  const toggleEntity = (entity: string) => {
    setLocalFilters((prev) => {
      const currentEntities = selectedEntities
      const isSelected = currentEntities.includes(entity)
      
      let newEntities: string[]
      if (isSelected) {
        newEntities = currentEntities.filter(e => e !== entity)
      } else {
        newEntities = [...currentEntities, entity]
      }
      
      // Update both single and array fields
      const updated: AuditLogFilters = { ...prev }
      if (newEntities.length === 0) {
        updated.entities = undefined
        updated.entity = undefined
      } else if (newEntities.length === 1) {
        updated.entities = undefined
        updated.entity = newEntities[0]
      } else {
        updated.entities = newEntities
        updated.entity = undefined
      }
      
      return updated
    })
  }

  const removeFilter = (key: string) => {
    switch (key) {
      case "dateRange":
        updateFilter("dateFrom", undefined)
        updateFilter("dateTo", undefined)
        break
      case "actorId":
        updateFilter("actorId", undefined)
        break
      case "actions":
        updateFilter("actions", undefined)
        updateFilter("action", undefined)
        break
      case "entities":
        updateFilter("entities", undefined)
        updateFilter("entity", undefined)
        break
      case "entityId":
        updateFilter("entityId", undefined)
        break
      case "search":
        updateFilter("search", undefined)
        setSearchQuery("")
        break
      case "ip":
        updateFilter("ip", undefined)
        break
    }
  }

  const handleReset = () => {
    const resetFilters: AuditLogFilters = {
      page: 1,
      limit: 20,
    }
    setLocalFilters(resetFilters)
    setSearchQuery("")
    setUserSearchQuery("")
    onReset()
  }

  const updateFilter = <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }))
  }

  const formatDateForInput = (dateString?: string): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return format(date, "yyyy-MM-dd'T'HH:mm")
    } catch {
      return ""
    }
  }

  const handleDateChange = (field: "dateFrom" | "dateTo", value: string) => {
    if (!value) {
      updateFilter(field, undefined)
      return
    }
    // Convert to ISO string with seconds
    const date = new Date(value)
    updateFilter(field, date.toISOString())
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" aria-expanded={isOpen}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2" aria-label="Filtros activos">
                    Activos
                  </Badge>
                )}
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Active Filters Display */}
            {activeFilters.length > 0 && (
              <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Activos ({activeFilters.length})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-6 text-xs"
                    aria-label="Limpiar todos los filtros"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar todo
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span className="text-xs">
                        <span className="font-medium">{filter.label}:</span> {filter.value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => removeFilter(filter.key)}
                        aria-label={`Eliminar filtro ${filter.label}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Presets de rango de fechas */}
              <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Rango rápido:
                </span>
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyDatePreset(preset.days)}
                    aria-label={`Filtrar últimos ${preset.label}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Rango de fechas manual */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Desde</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={formatDateForInput(localFilters.dateFrom)}
                  onChange={(e) => handleDateChange("dateFrom", e.target.value)}
                  aria-label="Fecha desde"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={formatDateForInput(localFilters.dateTo)}
                  onChange={(e) => handleDateChange("dateTo", e.target.value)}
                  aria-label="Fecha hasta"
                />
              </div>

              {/* Usuario - Searchable Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="actorId">Usuario</Label>
                <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userDropdownOpen}
                      className="w-full justify-between"
                      id="actorId"
                      aria-label="Seleccionar usuario"
                    >
                      {selectedUser ? (
                        <span className="flex items-center gap-2 truncate">
                          <User className="h-4 w-4 shrink-0" />
                          <span className="truncate">{selectedUser.nombreApellido}</span>
                          <Badge variant="secondary" className="text-xs">
                            {selectedUser.rol.nombreRol}
                          </Badge>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar usuario...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar usuario..."
                        value={userSearchQuery}
                        onValueChange={setUserSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingUsers ? "Cargando..." : "No se encontraron usuarios"}
                        </CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={user.idUsuario}
                              value={`${user.nombreApellido} ${user.email || ""} ${user.rol.nombreRol}`}
                              onSelect={() => {
                                updateFilter("actorId", user.idUsuario)
                                setUserDropdownOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  localFilters.actorId === user.idUsuario ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <User className="h-4 w-4" />
                                <span className="flex-1">{user.nombreApellido}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {user.rol.nombreRol}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.actorId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter("actorId", undefined)}
                    className="h-6 text-xs"
                    aria-label="Limpiar selección de usuario"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Tipo de acción - Multi-select */}
              <div className="space-y-2">
                <Label htmlFor="actions">Tipo de Acción</Label>
                {selectedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedActions.map((action) => (
                      <Badge
                        key={action}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">{ACTION_LABELS[action] || action}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                          onClick={() => toggleAction(action)}
                          aria-label={`Eliminar acción ${ACTION_LABELS[action] || action}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Popover open={actionDropdownOpen} onOpenChange={setActionDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={actionDropdownOpen}
                      className="w-full justify-between"
                      id="actions"
                      aria-label="Seleccionar acciones"
                    >
                      <span className="text-muted-foreground">
                        {selectedActions.length === 0
                          ? "Todas las acciones"
                          : selectedActions.length === 1
                          ? ACTION_LABELS[selectedActions[0]] || selectedActions[0]
                          : `${selectedActions.length} acciones seleccionadas`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar acción..."
                        value={actionSearchQuery}
                        onValueChange={setActionSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron acciones</CommandEmpty>
                        <CommandGroup>
                          {Object.entries(ACTION_LABELS)
                            .filter(([key, label]) =>
                              actionSearchQuery
                                ? label.toLowerCase().includes(actionSearchQuery.toLowerCase()) ||
                                  key.toLowerCase().includes(actionSearchQuery.toLowerCase())
                                : true
                            )
                            .map(([key, label]) => (
                              <CommandItem
                                key={key}
                                value={`${key} ${label}`}
                                onSelect={() => {
                                  toggleAction(key)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={selectedActions.includes(key)}
                                  onCheckedChange={() => toggleAction(key)}
                                  className="mr-2"
                                />
                                <span className="flex-1">{label}</span>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Entidad - Multi-select */}
              <div className="space-y-2">
                <Label htmlFor="entities">Recurso/Entidad</Label>
                {selectedEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedEntities.map((entity) => (
                      <Badge
                        key={entity}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="text-xs">{ENTITY_LABELS[entity] || entity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-destructive/20"
                          onClick={() => toggleEntity(entity)}
                          aria-label={`Eliminar entidad ${ENTITY_LABELS[entity] || entity}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
                <Popover open={entityDropdownOpen} onOpenChange={setEntityDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={entityDropdownOpen}
                      className="w-full justify-between"
                      id="entities"
                      aria-label="Seleccionar entidades"
                    >
                      <span className="text-muted-foreground">
                        {selectedEntities.length === 0
                          ? "Todas las entidades"
                          : selectedEntities.length === 1
                          ? ENTITY_LABELS[selectedEntities[0]] || selectedEntities[0]
                          : `${selectedEntities.length} entidades seleccionadas`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar entidad..."
                        value={entitySearchQuery}
                        onValueChange={setEntitySearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron entidades</CommandEmpty>
                        <CommandGroup>
                          {Object.entries(ENTITY_LABELS)
                            .filter(([key, label]) =>
                              entitySearchQuery
                                ? label.toLowerCase().includes(entitySearchQuery.toLowerCase()) ||
                                  key.toLowerCase().includes(entitySearchQuery.toLowerCase())
                                : true
                            )
                            .map(([key, label]) => (
                              <CommandItem
                                key={key}
                                value={`${key} ${label}`}
                                onSelect={() => {
                                  toggleEntity(key)
                                }}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  checked={selectedEntities.includes(key)}
                                  onCheckedChange={() => toggleEntity(key)}
                                  className="mr-2"
                                />
                                <span className="flex-1">{label}</span>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                  aria-label="ID del recurso"
                />
              </div>

              {/* Búsqueda de texto - Debounced */}
              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="search">Búsqueda</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Buscar en acción, entidad o resumen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Búsqueda de texto"
                  aria-describedby="search-description"
                />
                <p id="search-description" className="text-xs text-muted-foreground">
                  La búsqueda se aplica automáticamente después de escribir
                </p>
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
                  aria-label="Dirección IP"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    aria-label="Limpiar todos los filtros"
                  >
                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                    Limpiar
                  </Button>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isLoading}
                aria-label="Aplicar filtros"
              >
                {isLoading ? "Aplicando..." : "Aplicar Filtros"}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
