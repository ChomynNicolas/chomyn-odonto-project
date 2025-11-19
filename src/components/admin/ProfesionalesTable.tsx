"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
import { Edit, Plus, Search, UserCheck, UserX, Power } from "lucide-react"
import type { ProfesionalListResponse } from "@/lib/api/admin/profesionales"
import type { EspecialidadListItem } from "@/app/api/especialidades/_service"
import { toggleProfesionalActivo } from "@/lib/api/admin/profesionales"
import { toast } from "sonner"

interface ProfesionalesTableProps {
  initialData: ProfesionalListResponse
  especialidades: EspecialidadListItem[]
}

export default function ProfesionalesTable({ initialData, especialidades }: ProfesionalesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [filters, setFilters] = useState({
    estaActivo: searchParams.get("estaActivo") || "",
    especialidadId: searchParams.get("especialidadId") || "",
    search: searchParams.get("search") || "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    const params = new URLSearchParams()
    if (newFilters.estaActivo) params.set("estaActivo", newFilters.estaActivo)
    if (newFilters.especialidadId) params.set("especialidadId", newFilters.especialidadId)
    if (newFilters.search) params.set("search", newFilters.search)

    startTransition(() => {
      router.push(`/configuracion/profesionales?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/profesionales?${params.toString()}`)
  }

  const handleToggleActivo = async (id: number, currentEstado: boolean) => {
    if (togglingId === id) return

    try {
      setTogglingId(id)
      await toggleProfesionalActivo(id, !currentEstado)
      router.refresh()
      toast.success(`Profesional ${!currentEstado ? "activado" : "desactivado"} correctamente`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al cambiar estado"
      toast.error(errorMessage)
    } finally {
      setTogglingId(null)
    }
  }

  const getNombreCompleto = (persona: ProfesionalListResponse["data"][0]["persona"]) => {
    return [persona.nombres, persona.apellidos, persona.segundoApellido].filter(Boolean).join(" ")
  }

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o número de licencia..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.especialidadId || "all"}
            onValueChange={(value) => handleFilterChange("especialidadId", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas las especialidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las especialidades</SelectItem>
              {especialidades.map((especialidad) => (
                <SelectItem key={especialidad.idEspecialidad} value={especialidad.idEspecialidad.toString()}>
                  {especialidad.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.estaActivo || "all"}
            onValueChange={(value) => handleFilterChange("estaActivo", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link href="/configuracion/profesionales/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo profesional
          </Link>
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Número de Licencia</TableHead>
              <TableHead>Especialidades</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Citas</TableHead>
              <TableHead>Bloqueos</TableHead>
              <TableHead>Consultas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No se encontraron profesionales
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((profesional) => (
                <TableRow key={profesional.idProfesional}>
                  <TableCell className="font-medium">
                    {getNombreCompleto(profesional.persona)}
                  </TableCell>
                  <TableCell>{profesional.numeroLicencia || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {profesional.especialidades.length > 0 ? (
                        profesional.especialidades.map((esp) => (
                          <Badge key={esp.idEspecialidad} variant="outline" className="text-xs">
                            {esp.nombre}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin especialidades</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {profesional.estaActivo ? (
                      <Badge variant="default" className="gap-1">
                        <UserCheck className="h-3 w-3" />
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="h-3 w-3" />
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{profesional.counts.citas}</TableCell>
                  <TableCell>{profesional.counts.bloqueosAgenda}</TableCell>
                  <TableCell>{profesional.counts.consultas}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/configuracion/profesionales/${profesional.idProfesional}`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActivo(profesional.idProfesional, profesional.estaActivo)}
                        disabled={togglingId === profesional.idProfesional}
                      >
                        <Power className={`mr-2 h-4 w-4 ${profesional.estaActivo ? "text-destructive" : "text-green-600"}`} />
                        {profesional.estaActivo ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {initialData.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((initialData.meta.page - 1) * initialData.meta.limit) + 1} -{" "}
            {Math.min(initialData.meta.page * initialData.meta.limit, initialData.meta.total)} de{" "}
            {initialData.meta.total} profesionales
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.meta.page - 1)}
              disabled={!initialData.meta.hasPrev || isPending}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialData.meta.page + 1)}
              disabled={!initialData.meta.hasNext || isPending}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

