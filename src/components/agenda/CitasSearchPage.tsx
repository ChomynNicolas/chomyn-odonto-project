// src/components/agenda/CitasSearchPage.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Search,
  Calendar,
  Stethoscope,
  MapPin,
  FileText,
  ExternalLink,
  Filter,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EstadoCita } from "@/types/agenda"

interface CitaSearchResult {
  idCita: number
  inicio: string
  fin: string
  tipo: string
  estado: EstadoCita
  motivo: string | null
  paciente: {
    id: number
    nombre: string
    documento: string | null
  }
  profesional: {
    id: number
    nombre: string
  }
  consultorio: {
    id: number
    nombre: string
    colorHex: string | null
  } | null
}

interface SearchFilters {
  q: string
  estado?: string
  desde?: string
  hasta?: string
}

const ESTADOS: Array<{ value: EstadoCita; label: string }> = [
  { value: "SCHEDULED", label: "Agendada" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CHECKED_IN", label: "Check-in" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
  { value: "NO_SHOW", label: "No asistió" },
]

export function CitasSearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<SearchFilters>({
    q: searchParams.get("q") || "",
    estado: searchParams.get("estado") || undefined,
    desde: searchParams.get("desde") || undefined,
    hasta: searchParams.get("hasta") || undefined,
  })
  const [results, setResults] = useState<CitaSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const performSearch = useCallback(async (searchTerm?: string) => {
    const query = searchTerm ?? filters.q
    if (!query.trim() && !filters.estado && !filters.desde && !filters.hasta) {
      setResults([])
      return
    }

    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (filters.estado) params.set("estado", filters.estado)
      if (filters.desde) params.set("desde", filters.desde)
      if (filters.hasta) params.set("hasta", filters.hasta)
      params.set("limit", "20")

      const res = await fetch(`/api/agenda/citas/search?${params.toString()}`)
      if (!res.ok) throw new Error("Error al buscar citas")

      const data = await res.json()
      if (data.ok) {
        setResults(data.data.items)
      }
    } catch (error) {
      console.error("Error searching citas:", error)
      toast.error("Error al buscar citas")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Debounce para búsqueda
  const debouncedSearch = useCallback(
    (searchTerm: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      const timer = setTimeout(() => {
        performSearch(searchTerm)
      }, 300)

      setDebounceTimer(timer)
    },
    [debounceTimer, performSearch]
  )

  useEffect(() => {
    // Actualizar URL sin recargar
    const params = new URLSearchParams()
    if (filters.q) params.set("q", filters.q)
    if (filters.estado) params.set("estado", filters.estado)
    if (filters.desde) params.set("desde", filters.desde)
    if (filters.hasta) params.set("hasta", filters.hasta)
    router.replace(`/citas?${params.toString()}`, { scroll: false })
  }, [filters, router])

  useEffect(() => {
    // Búsqueda inicial si hay parámetros
    if (filters.q || filters.estado || filters.desde || filters.hasta) {
      performSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, q: value }))
    debouncedSearch(value)
  }

  const handleFilterChange = (key: keyof SearchFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    // Para filtros no-texto, buscar inmediatamente
    if (key !== "q") {
      setTimeout(() => performSearch(), 100)
    }
  }

  const clearFilters = () => {
    setFilters({ q: "" })
    setResults([])
    router.replace("/citas")
  }

  const getEstadoBadge = (estado: EstadoCita) => {
    const estadoConfig = {
      SCHEDULED: { label: "Agendada", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
      CONFIRMED: { label: "Confirmada", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      CHECKED_IN: { label: "Check-in", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
      IN_PROGRESS: { label: "En curso", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
      COMPLETED: { label: "Completada", className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300" },
      CANCELLED: { label: "Cancelada", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
      NO_SHOW: { label: "No asistió", className: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    }[estado]

    return (
      <Badge variant="outline" className={cn("text-xs", estadoConfig.className)}>
        {estadoConfig.label}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat("es", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const navigateToCita = (idCita: number) => {
    router.push(`/agenda/citas/${idCita}/consulta`)
  }

  const navigateToCalendar = (idCita: number) => {
    router.push(`/calendar?highlight=${idCita}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Búsqueda de Citas</h1>
        <p className="text-muted-foreground">Busque citas por paciente, cédula, profesional o motivo</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
            {(filters.q || filters.estado || filters.desde || filters.hasta) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nombre, cédula, motivo..."
                  value={filters.q}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filters.estado} onValueChange={(v) => handleFilterChange("estado", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <Input
                type="datetime-local"
                value={filters.desde ? new Date(filters.desde).toISOString().slice(0, 16) : ""}
                onChange={(e) =>
                  handleFilterChange("desde", e.target.value ? new Date(e.target.value).toISOString() : undefined)
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <Input
                type="datetime-local"
                value={filters.hasta ? new Date(filters.hasta).toISOString().slice(0, 16) : ""}
                onChange={(e) =>
                  handleFilterChange("hasta", e.target.value ? new Date(e.target.value).toISOString() : undefined)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {isLoading ? "Buscando..." : results.length > 0 ? `${results.length} citas encontradas` : "No hay resultados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron citas</p>
              <p className="text-sm mt-2">Intente con otros términos de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((cita) => (
                <Card key={cita.idCita} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{cita.paciente.nombre}</h3>
                          {getEstadoBadge(cita.estado)}
                        </div>
                        {cita.paciente.documento && (
                          <p className="text-sm text-muted-foreground">Documento: {cita.paciente.documento}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(cita.inicio)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Stethoscope className="h-4 w-4" />
                            {cita.profesional.nombre}
                          </span>
                          {cita.consultorio && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {cita.consultorio.nombre}
                            </span>
                          )}
                          {cita.motivo && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {cita.motivo}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigateToCita(cita.idCita)}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Ver Consulta
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigateToCalendar(cita.idCita)}
                          className="gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Ver en Agenda
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

