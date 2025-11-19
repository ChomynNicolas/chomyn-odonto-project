"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Edit, Plus, Search, Trash2, CheckCircle2, XCircle } from "lucide-react"
import type { EspecialidadListResponse } from "@/lib/api/admin/especialidades"
import EspecialidadForm from "./EspecialidadForm"
import { deleteEspecialidad, toggleEspecialidadActive } from "@/lib/api/admin/especialidades"
import { toast } from "sonner"

interface EspecialidadesTableProps {
  initialData: EspecialidadListResponse
}

export default function EspecialidadesTable({ initialData }: EspecialidadesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingEspecialidad, setEditingEspecialidad] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [filters, setFilters] = useState({
    isActive: searchParams.get("isActive") || "all",
    search: searchParams.get("search") || "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams(searchParams.toString())
    if (newFilters.isActive && newFilters.isActive !== "all") {
      params.set("isActive", newFilters.isActive)
    } else {
      params.delete("isActive")
    }
    if (newFilters.search) {
      params.set("search", newFilters.search)
    } else {
      params.delete("search")
    }
    params.delete("page") // Reset to first page on filter change
    
    startTransition(() => {
      router.push(`/configuracion/especialidades?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/especialidades?${params.toString()}`)
  }

  const handleEspecialidadUpdated = () => {
    setEditingEspecialidad(null)
    router.refresh()
    toast.success("Especialidad actualizada correctamente")
  }

  const handleEspecialidadCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Especialidad creada correctamente")
  }

  const handleToggleActive = async (id: number) => {
    try {
      await toggleEspecialidadActive(id)
      router.refresh()
      toast.success("Estado actualizado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeletingId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      await deleteEspecialidad(deletingId)
      setDeletingId(null)
      router.refresh()
      toast.success("Especialidad eliminada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar especialidad")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.isActive || "all"}
            onValueChange={(value) => handleFilterChange("isActive", value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="true">Activas</SelectItem>
              <SelectItem value="false">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva especialidad
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Profesionales asignados</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No se encontraron especialidades
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((especialidad) => (
                <TableRow key={especialidad.idEspecialidad}>
                  <TableCell className="font-medium">{especialidad.nombre}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {especialidad.descripcion || "-"}
                  </TableCell>
                  <TableCell>
                    {especialidad.isActive ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Activa
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Inactiva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{especialidad.profesionalCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEspecialidad(especialidad.idEspecialidad)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(especialidad.idEspecialidad)}
                      >
                        {especialidad.isActive ? (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Activar
                          </>
                        )}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(especialidad.idEspecialidad)}
                                disabled={especialidad.profesionalCount > 0}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {especialidad.profesionalCount > 0 && (
                            <TooltipContent>
                              <p>No se puede eliminar porque tiene profesionales asignados</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
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
            {initialData.meta.total} especialidades
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

      {/* Modales */}
      {isCreating && (
        <EspecialidadForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleEspecialidadCreated}
        />
      )}
      {editingEspecialidad && (
        <EspecialidadForm
          open={!!editingEspecialidad}
          onOpenChange={(open) => !open && setEditingEspecialidad(null)}
          especialidadId={editingEspecialidad}
          onSuccess={handleEspecialidadUpdated}
        />
      )}

      {/* Confirmación de eliminación */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar esta especialidad? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

