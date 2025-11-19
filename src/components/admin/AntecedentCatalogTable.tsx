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
import type { AntecedentCatalogListResponse, AntecedentCategory } from "@/app/api/antecedent-catalog/_schemas"
import AntecedentCatalogForm from "./AntecedentCatalogForm"
import { useDeleteAntecedentCatalog, useToggleAntecedentCatalogActive } from "@/hooks/useAntecedentCatalog"
import { toast } from "sonner"

interface AntecedentCatalogTableProps {
  initialData: AntecedentCatalogListResponse
}

const CATEGORY_LABELS: Record<AntecedentCategory, string> = {
  CARDIOVASCULAR: "Cardiovascular",
  ENDOCRINE: "Endocrino",
  RESPIRATORY: "Respiratorio",
  GASTROINTESTINAL: "Gastrointestinal",
  NEUROLOGICAL: "Neurológico",
  SURGICAL_HISTORY: "Historial Quirúrgico",
  SMOKING: "Tabaquismo",
  ALCOHOL: "Alcohol",
  OTHER: "Otro",
}

export default function AntecedentCatalogTable({ initialData }: AntecedentCatalogTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingAntecedent, setEditingAntecedent] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const deleteMutation = useDeleteAntecedentCatalog()
  const toggleMutation = useToggleAntecedentCatalogActive()

  const [filters, setFilters] = useState({
    isActive: searchParams.get("isActive") || "all",
    category: searchParams.get("category") || "all",
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
    if (newFilters.category && newFilters.category !== "all") {
      params.set("category", newFilters.category)
    } else {
      params.delete("category")
    }
    if (newFilters.search) {
      params.set("search", newFilters.search)
    } else {
      params.delete("search")
    }
    params.delete("page") // Reset to first page on filter change
    
    startTransition(() => {
      router.push(`/configuracion/antecedent-catalog?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/antecedent-catalog?${params.toString()}`)
  }

  const handleAntecedentUpdated = () => {
    setEditingAntecedent(null)
    router.refresh()
    toast.success("Antecedente actualizado correctamente")
  }

  const handleAntecedentCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Antecedente creado correctamente")
  }

  const handleToggleActive = (id: number, currentIsActive: boolean) => {
    if (!currentIsActive) {
      // Reactivating - no confirmation needed, do it directly
      toggleMutation.mutateAsync(id)
        .then(() => {
          router.refresh()
          toast.success("Antecedente reactivado correctamente")
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
        })
    } else {
      // Deactivating - show confirmation dialog
      setTogglingId(id)
    }
  }

  const handleToggleConfirm = async () => {
    if (!togglingId) return
    
    const antecedent = initialData.data.find(a => a.idAntecedentCatalog === togglingId)
    if (!antecedent) return

    try {
      await toggleMutation.mutateAsync(togglingId)
      setTogglingId(null)
      router.refresh()
      toast.success("Antecedente desactivado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar estado")
      setTogglingId(null)
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
      toast.success("Antecedente eliminado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar antecedente")
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
            value={filters.category || "all"}
            onValueChange={(value) => handleFilterChange("category", value)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          Nuevo antecedente
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Referencias</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron antecedentes
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((antecedent) => (
                <TableRow key={antecedent.idAntecedentCatalog}>
                  <TableCell className="font-mono font-medium">{antecedent.code}</TableCell>
                  <TableCell className="font-medium">{antecedent.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{CATEGORY_LABELS[antecedent.category]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {antecedent.description || "-"}
                  </TableCell>
                  <TableCell>
                    {antecedent.isActive ? (
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
                  <TableCell>{antecedent.referenceCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAntecedent(antecedent.idAntecedentCatalog)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(antecedent.idAntecedentCatalog, antecedent.isActive)}
                        disabled={toggleMutation.isPending || togglingId === antecedent.idAntecedentCatalog}
                      >
                        {antecedent.isActive ? (
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
                                onClick={() => handleDeleteClick(antecedent.idAntecedentCatalog)}
                                disabled={antecedent.referenceCount > 0 || deleteMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {antecedent.referenceCount > 0 && (
                            <TooltipContent>
                              <p>
                                No se puede eliminar porque está siendo utilizado en {antecedent.referenceCount}{" "}
                                anamnesis. Use &apos;Desactivar&apos; en su lugar.
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
            {initialData.meta.total} antecedentes
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
        <AntecedentCatalogForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleAntecedentCreated}
        />
      )}
      {editingAntecedent && (
        <AntecedentCatalogForm
          open={!!editingAntecedent}
          onOpenChange={(open) => !open && setEditingAntecedent(null)}
          antecedentId={editingAntecedent}
          onSuccess={handleAntecedentUpdated}
        />
      )}

      {/* Confirmación de desactivación */}
      <Dialog open={!!togglingId} onOpenChange={(open) => !open && setTogglingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar desactivación</DialogTitle>
            <DialogDescription>
              Los antecedentes desactivados permanecerán en los registros históricos de anamnesis pero no aparecerán en nuevas selecciones.
              ¿Desea continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTogglingId(null)}
              disabled={toggleMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleToggleConfirm}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación de eliminación */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar este antecedente? Esta acción no se puede deshacer.
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

