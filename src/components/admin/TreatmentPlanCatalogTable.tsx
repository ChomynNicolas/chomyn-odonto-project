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
import type { TreatmentPlanCatalogListResponse } from "@/app/api/treatment-plan-catalog/_schemas"
import TreatmentPlanCatalogForm from "./TreatmentPlanCatalogForm"
import { useDeleteTreatmentPlanCatalog, useToggleTreatmentPlanCatalogActive } from "@/hooks/useTreatmentPlanCatalog"
import { toast } from "sonner"

interface TreatmentPlanCatalogTableProps {
  initialData: TreatmentPlanCatalogListResponse
}

export default function TreatmentPlanCatalogTable({ initialData }: TreatmentPlanCatalogTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingCatalog, setEditingCatalog] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const deleteMutation = useDeleteTreatmentPlanCatalog()
  const toggleMutation = useToggleTreatmentPlanCatalogActive()

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
      router.push(`/configuracion/plan-tratamiento-catalog?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/plan-tratamiento-catalog?${params.toString()}`)
  }

  const handleCatalogUpdated = () => {
    setEditingCatalog(null)
    router.refresh()
    toast.success("Plan de tratamiento actualizado correctamente")
  }

  const handleCatalogCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Plan de tratamiento creado correctamente")
  }

  const handleToggleActive = async (id: number) => {
    try {
      await toggleMutation.mutateAsync(id)
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

    try {
      await deleteMutation.mutateAsync(deletingId)
      setDeletingId(null)
      router.refresh()
      toast.success("Plan de tratamiento eliminado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar plan de tratamiento")
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
            value={filters.isActive || "all"}
            onValueChange={(value) => handleFilterChange("isActive", value)}
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
          Nuevo plan
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Pasos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Referencias</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron planes de tratamiento
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((catalog) => (
                <TableRow key={catalog.idTreatmentPlanCatalog}>
                  <TableCell className="font-mono font-medium">{catalog.code}</TableCell>
                  <TableCell className="font-medium">{catalog.nombre}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {catalog.descripcion || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{catalog.steps.length} paso(s)</Badge>
                  </TableCell>
                  <TableCell>
                    {catalog.isActive ? (
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
                  <TableCell>{catalog.referenceCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCatalog(catalog.idTreatmentPlanCatalog)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(catalog.idTreatmentPlanCatalog)}
                        disabled={toggleMutation.isPending}
                      >
                        {catalog.isActive ? (
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
                                onClick={() => handleDeleteClick(catalog.idTreatmentPlanCatalog)}
                                disabled={catalog.referenceCount > 0 || deleteMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {catalog.referenceCount > 0 && (
                            <TooltipContent>
                              <p>
                                No se puede eliminar porque está siendo utilizado en {catalog.referenceCount}{" "}
                                plan(es) de tratamiento. Use &apos;Desactivar&apos; en su lugar.
                              </p>
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
            {initialData.meta.total} planes
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
        <TreatmentPlanCatalogForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleCatalogCreated}
        />
      )}
      {editingCatalog && (
        <TreatmentPlanCatalogForm
          open={!!editingCatalog}
          onOpenChange={(open) => !open && setEditingCatalog(null)}
          catalogId={editingCatalog}
          onSuccess={handleCatalogUpdated}
        />
      )}

      {/* Confirmación de eliminación */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar este plan de tratamiento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

