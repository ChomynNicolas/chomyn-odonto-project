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
import type { MedicationCatalogListResponse } from "@/app/api/medication-catalog/_schemas"
import MedicationCatalogForm from "./MedicationCatalogForm"
import {
  useDeleteMedicationCatalog,
  useDeactivateMedicationCatalog,
  useUpdateMedicationCatalog,
} from "@/hooks/useMedicationCatalog"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MedicationCatalogTableProps {
  initialData: MedicationCatalogListResponse
}

export default function MedicationCatalogTable({ initialData }: MedicationCatalogTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingMedication, setEditingMedication] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingMedication, setDeletingMedication] = useState<{ id: number; name: string; patientMedicationCount: number } | null>(null)

  const deleteMutation = useDeleteMedicationCatalog()
  const deactivateMutation = useDeactivateMedicationCatalog()
  const updateMutation = useUpdateMedicationCatalog()

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
      router.push(`/configuracion/medications?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/medications?${params.toString()}`)
  }

  const handleMedicationUpdated = () => {
    setEditingMedication(null)
    router.refresh()
    toast.success("Medicamento actualizado correctamente")
  }

  const handleMedicationCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Medicamento creado correctamente")
  }

  const handleDeactivate = async (id: number) => {
    try {
      await deactivateMutation.mutateAsync(id)
      router.refresh()
      toast.success("Medicamento desactivado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al desactivar medicamento")
    }
  }

  const handleReactivate = async (id: number) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { isActive: true },
      })
      router.refresh()
      toast.success("Medicamento reactivado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al reactivar medicamento")
    }
  }

  const handleDeleteClick = (medication: { idMedicationCatalog: number; name: string; patientMedicationCount: number }) => {
    setDeletingMedication({
      id: medication.idMedicationCatalog,
      name: medication.name,
      patientMedicationCount: medication.patientMedicationCount,
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deletingMedication) return

    try {
      await deleteMutation.mutateAsync(deletingMedication.id)
      setDeletingMedication(null)
      router.refresh()
      toast.success("Medicamento eliminado correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar medicamento")
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
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo medicamento
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
              <TableHead>Usos en pacientes</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron medicamentos
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((medication) => (
                <TableRow key={medication.idMedicationCatalog}>
                  <TableCell className="font-medium">{medication.name}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {medication.description || "-"}
                  </TableCell>
                  <TableCell>
                    {medication.isActive ? (
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
                  <TableCell>{medication.patientMedicationCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(medication.createdAt), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(medication.updatedAt), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingMedication(medication.idMedicationCatalog)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      {medication.isActive ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivate(medication.idMedicationCatalog)}
                          disabled={deactivateMutation.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Desactivar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(medication.idMedicationCatalog)}
                          disabled={updateMutation.isPending}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Reactivar
                        </Button>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(medication)}
                                disabled={medication.patientMedicationCount > 0}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {medication.patientMedicationCount > 0 && (
                            <TooltipContent>
                              <p>No se puede eliminar porque está siendo utilizado en {medication.patientMedicationCount} medicación(es) de paciente(s)</p>
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
            {initialData.meta.total} medicamentos
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
        <MedicationCatalogForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleMedicationCreated}
        />
      )}
      {editingMedication && (
        <MedicationCatalogForm
          open={!!editingMedication}
          onOpenChange={(open) => !open && setEditingMedication(null)}
          medicationId={editingMedication}
          onSuccess={handleMedicationUpdated}
        />
      )}

      {/* Confirmación de eliminación */}
      <Dialog open={!!deletingMedication} onOpenChange={(open) => !open && setDeletingMedication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                ¿Está seguro de eliminar el medicamento <strong>{deletingMedication?.name}</strong>?
              </p>
              {deletingMedication && deletingMedication.patientMedicationCount > 0 ? (
                <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                  <p className="font-medium">No se puede eliminar</p>
                  <p className="text-sm">
                    Este medicamento está siendo utilizado en {deletingMedication.patientMedicationCount} medicación(es) de paciente(s).
                    Use "Desactivar" en su lugar para ocultarlo sin eliminar los registros asociados.
                  </p>
                </div>
              ) : (
                <p className="text-destructive">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingMedication(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || (deletingMedication?.patientMedicationCount ?? 0) > 0}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

