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
import { Edit, Plus, Search, Trash2, CheckCircle2, XCircle, Ban } from "lucide-react"
import type { ProcedimientoListResponse } from "@/lib/api/admin/procedimientos"
import ProcedimientoForm from "./ProcedimientoForm"
import {
  deleteProcedimiento,
  deactivateProcedimiento,
} from "@/lib/api/admin/procedimientos"
import { toast } from "sonner"

interface ProcedimientosTableProps {
  initialData: ProcedimientoListResponse
}

// Helper function to format price from cents to currency
function formatPrice(cents: number | null): string {
  if (cents === null) return "-"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(cents / 100)
}

// Helper function to format duration from minutes to readable format
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "-"
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} h`
  }
  return `${hours} h ${mins} min`
}

export default function ProcedimientosTable({ initialData }: ProcedimientosTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingProcedimiento, setEditingProcedimiento] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [filters, setFilters] = useState({
    activo: searchParams.get("activo") || "all",
    search: searchParams.get("search") || "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)

    const params = new URLSearchParams(searchParams.toString())
    if (newFilters.activo && newFilters.activo !== "all") {
      params.set("activo", newFilters.activo)
    } else {
      params.delete("activo")
    }
    if (newFilters.search) {
      params.set("search", newFilters.search)
    } else {
      params.delete("search")
    }
    params.delete("page") // Reset to first page on filter change

    startTransition(() => {
      router.push(`/configuracion/procedimientos?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/procedimientos?${params.toString()}`)
  }

  const handleProcedimientoUpdated = () => {
    setEditingProcedimiento(null)
    router.refresh()
    toast.success("Procedimiento actualizado correctamente")
  }

  const handleProcedimientoCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Procedimiento creado correctamente")
  }

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateProcedimiento(id)
      router.refresh()
      toast.success("Procedimiento desactivado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desactivar procedimiento")
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeletingId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      await deleteProcedimiento(deletingId)
      setDeletingId(null)
      router.refresh()
      toast.success("Procedimiento eliminado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar procedimiento")
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
              placeholder="Buscar por código o nombre..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.activo || "all"}
            onValueChange={(value) => handleFilterChange("activo", value)}
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
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo procedimiento
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Aplica Diente</TableHead>
              <TableHead>Aplica Superficie</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No se encontraron procedimientos
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((procedimiento) => {
                const hasReferences =
                  procedimiento.tratamientoStepsCount > 0 ||
                  procedimiento.consultaProcedimientosCount > 0

                return (
                  <TableRow key={procedimiento.idProcedimiento}>
                    <TableCell className="font-mono font-medium">{procedimiento.code}</TableCell>
                    <TableCell className="font-medium">{procedimiento.nombre}</TableCell>
                    <TableCell>{formatPrice(procedimiento.defaultPriceCents)}</TableCell>
                    <TableCell>{formatDuration(procedimiento.defaultDurationMin)}</TableCell>
                    <TableCell>
                      {procedimiento.aplicaDiente ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {procedimiento.aplicaSuperficie ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {procedimiento.activo ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProcedimiento(procedimiento.idProcedimiento)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        {procedimiento.activo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeactivate(procedimiento.idProcedimiento)}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Desactivar
                          </Button>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClick(procedimiento.idProcedimiento)}
                                  disabled={hasReferences}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {hasReferences && (
                              <TooltipContent>
                                <p>
                                  No se puede eliminar porque tiene referencias en tratamientos o
                                  consultas
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
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
            {initialData.meta.total} procedimientos
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
        <ProcedimientoForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleProcedimientoCreated}
        />
      )}
      {editingProcedimiento && (
        <ProcedimientoForm
          open={!!editingProcedimiento}
          onOpenChange={(open) => !open && setEditingProcedimiento(null)}
          procedimientoId={editingProcedimiento}
          onSuccess={handleProcedimientoUpdated}
        />
      )}

      {/* Confirmación de eliminación */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar este procedimiento? Esta acción no se puede deshacer y solo
              es posible si el procedimiento no tiene referencias en tratamientos o consultas.
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

