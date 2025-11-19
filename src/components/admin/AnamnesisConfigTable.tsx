"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Plus, Search, AlertTriangle } from "lucide-react"
import type { AnamnesisConfigListResponse } from "@/lib/api/anamnesis-config"
import { fetchAnamnesisConfigs } from "@/lib/api/anamnesis-config"
import AnamnesisConfigForm from "./AnamnesisConfigForm"
import { HIGH_IMPACT_KEYS } from "@/app/api/anamnesis-config/_schemas"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface AnamnesisConfigTableProps {
  initialData: AnamnesisConfigListResponse
  userRole: "ADMIN" | "RECEP" | "ODONT"
}

export default function AnamnesisConfigTable({ initialData, userRole }: AnamnesisConfigTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [editingConfig, setEditingConfig] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const isAdmin = userRole === "ADMIN"

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    sortBy: (searchParams.get("sortBy") as "key" | "idAnamnesisConfig" | "updatedAt") || "key",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
  })

  // TanStack Query for fetching configs
  const { data, isLoading } = useQuery({
    queryKey: ["anamnesis-configs", filters, initialData.meta.page],
    queryFn: () =>
      fetchAnamnesisConfigs({
        page: initialData.meta.page,
        limit: initialData.meta.limit,
        ...filters,
      }),
    initialData,
    staleTime: 30_000,
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    const params = new URLSearchParams(searchParams.toString())
    if (newFilters.search) {
      params.set("search", newFilters.search)
    } else {
      params.delete("search")
    }
    if (newFilters.sortBy && newFilters.sortBy !== "key") {
      params.set("sortBy", newFilters.sortBy)
    } else {
      params.delete("sortBy")
    }
    if (newFilters.sortOrder && newFilters.sortOrder !== "asc") {
      params.set("sortOrder", newFilters.sortOrder)
    } else {
      params.delete("sortOrder")
    }
    params.delete("page") // Reset to first page on filter change

    startTransition(() => {
      router.push(`/configuracion/anamnesis-config?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/anamnesis-config?${params.toString()}`)
  }

  const handleConfigUpdated = () => {
    setEditingConfig(null)
    queryClient.invalidateQueries({ queryKey: ["anamnesis-configs"] })
    router.refresh()
  }

  const handleConfigCreated = () => {
    setIsCreating(false)
    queryClient.invalidateQueries({ queryKey: ["anamnesis-configs"] })
    router.refresh()
  }

  const formatDate = (date: string | Date) => {
    return format(new Date(date), "PPp", { locale: es })
  }

  const formatValue = (value: unknown): string => {
    if (typeof value === "boolean") {
      return value ? "Sí" : "No"
    }
    if (typeof value === "string") {
      return value.length > 50 ? `${value.substring(0, 50)}...` : value
    }
    if (Array.isArray(value)) {
      return `[${value.length} elementos]`
    }
    if (typeof value === "object" && value !== null) {
      return `{${Object.keys(value).length} propiedades}`
    }
    return String(value)
  }

  const configs = data?.data || []
  const meta = data?.meta || initialData.meta

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por clave o descripción..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.sortBy}
            onValueChange={(value) => handleFilterChange("sortBy", value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="key">Clave</SelectItem>
              <SelectItem value="idAnamnesisConfig">ID</SelectItem>
              <SelectItem value="updatedAt">Última actualización</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.sortOrder}
            onValueChange={(value) => handleFilterChange("sortOrder", value)}
          >
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Orden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascendente</SelectItem>
              <SelectItem value="desc">Descendente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva configuración
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clave</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Última actualización</TableHead>
              <TableHead>Actualizado por</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  No se encontraron configuraciones
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => {
                const isHighImpact = HIGH_IMPACT_KEYS.includes(config.key as any)
                return (
                  <TableRow key={config.idAnamnesisConfig}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {config.key}
                        {isHighImpact && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Crítico
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {config.description || <span className="text-muted-foreground">Sin descripción</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-mono text-sm">
                      {formatValue(config.value)}
                    </TableCell>
                    <TableCell>{formatDate(config.updatedAt)}</TableCell>
                    <TableCell>{config.updatedBy.nombreApellido}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConfig(config.idAnamnesisConfig)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {configs.length} de {meta.total} configuraciones
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page - 1)}
              disabled={!meta.hasPrev || isPending}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                Página {meta.page} de {meta.totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(meta.page + 1)}
              disabled={!meta.hasNext || isPending}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Formularios */}
      {isAdmin && (
        <>
          <AnamnesisConfigForm
            open={isCreating}
            onOpenChange={setIsCreating}
            onSuccess={handleConfigCreated}
          />
          {editingConfig && (
            <AnamnesisConfigForm
              open={!!editingConfig}
              onOpenChange={(open) => !open && setEditingConfig(null)}
              configId={editingConfig}
              onSuccess={handleConfigUpdated}
            />
          )}
        </>
      )}
    </div>
  )
}

