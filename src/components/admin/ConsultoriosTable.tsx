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
import { Edit, Plus, Search, Trash2, CheckCircle2, XCircle, Calendar } from "lucide-react"
import type { ConsultorioListResponse } from "@/lib/api/consultorios"
import ConsultorioForm from "./ConsultorioForm"
import { deleteConsultorio, toggleConsultorioActivo } from "@/lib/api/consultorios"
import { toast } from "sonner"

interface ConsultoriosTableProps {
  initialData: ConsultorioListResponse
  userRole: "ADMIN" | "RECEP" | "ODONT"
}

export default function ConsultoriosTable({ initialData, userRole }: ConsultoriosTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingConsultorio, setEditingConsultorio] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false)
  const [toggleConfirmData, setToggleConfirmData] = useState<{ id: number; activo: boolean; countFutureCitas: number } | null>(null)

  const isAdmin = userRole === "ADMIN"

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
      router.push(`/configuracion/consultorios?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/consultorios?${params.toString()}`)
  }

  const handleConsultorioUpdated = () => {
    setEditingConsultorio(null)
    router.refresh()
    toast.success("Consultorio actualizado correctamente")
  }

  const handleConsultorioCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Consultorio creado correctamente")
  }

  const handleToggleActiveClick = (id: number, currentActivo: boolean, countFutureCitas: number) => {
    // If trying to deactivate and there are future citas, show warning
    if (!currentActivo || countFutureCitas === 0) {
      // Safe to toggle - proceed directly
      handleToggleActive(id, !currentActivo)
    } else {
      // Show confirmation dialog
      setToggleConfirmData({ id, activo: currentActivo, countFutureCitas })
      setToggleConfirmOpen(true)
    }
  }

  const handleToggleActive = async (id: number, newActivo: boolean) => {
    setTogglingId(id)
    try {
      await toggleConsultorioActivo(id, newActivo)
      setToggleConfirmOpen(false)
      setToggleConfirmData(null)
      router.refresh()
      toast.success("Estado actualizado correctamente")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar estado"
      toast.error(errorMessage)
      if (errorMessage.includes("citas futuras")) {
        setToggleConfirmOpen(false)
        setToggleConfirmData(null)
      }
    } finally {
      setTogglingId(null)
    }
  }

  const handleDeleteClick = (id: number) => {
    setDeletingId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    setIsDeleting(true)
    try {
      await deleteConsultorio(deletingId)
      setDeletingId(null)
      router.refresh()
      toast.success("Consultorio eliminado correctamente")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar consultorio"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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
        {isAdmin && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo consultorio
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Citas futuras</TableHead>
              <TableHead>Fecha creación</TableHead>
              {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                  No se encontraron consultorios
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((consultorio) => (
                <TableRow key={consultorio.idConsultorio}>
                  <TableCell className="font-medium">{consultorio.nombre}</TableCell>
                  <TableCell>
                    {consultorio.colorHex ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border border-border"
                          style={{ backgroundColor: consultorio.colorHex }}
                        />
                        <span className="text-sm text-muted-foreground">{consultorio.colorHex}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {consultorio.activo ? (
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
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{consultorio.countFutureCitas}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Citas programadas en el futuro</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(consultorio.createdAt)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Actualizado: {formatDate(consultorio.updatedAt)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingConsultorio(consultorio.idConsultorio)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleActiveClick(
                              consultorio.idConsultorio,
                              consultorio.activo,
                              consultorio.countFutureCitas
                            )
                          }
                          disabled={togglingId === consultorio.idConsultorio}
                        >
                          {consultorio.activo ? (
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
                                  onClick={() => handleDeleteClick(consultorio.idConsultorio)}
                                  disabled={
                                    consultorio.countFutureCitas > 0 ||
                                    isDeleting ||
                                    deletingId === consultorio.idConsultorio
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {consultorio.countFutureCitas > 0 && (
                              <TooltipContent>
                                <p>No se puede eliminar porque tiene citas futuras programadas</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  )}
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
            {initialData.meta.total} consultorios
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
        <ConsultorioForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleConsultorioCreated}
        />
      )}
      {editingConsultorio && (
        <ConsultorioForm
          open={!!editingConsultorio}
          onOpenChange={(open) => !open && setEditingConsultorio(null)}
          consultorioId={editingConsultorio}
          onSuccess={handleConsultorioUpdated}
        />
      )}

      {/* Confirmación de desactivación */}
      <Dialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar desactivación</DialogTitle>
            <DialogDescription>
              {toggleConfirmData && toggleConfirmData.countFutureCitas > 0 ? (
                <>
                  Este consultorio tiene <strong>{toggleConfirmData.countFutureCitas}</strong>{" "}
                  {toggleConfirmData.countFutureCitas === 1 ? "cita futura" : "citas futuras"} programada
                  {toggleConfirmData.countFutureCitas === 1 ? "" : "s"}. ¿Desea continuar con la
                  desactivación?
                  <br />
                  <br />
                  <strong>Nota:</strong> No se podrán crear nuevas citas en este consultorio después de
                  desactivarlo.
                </>
              ) : (
                "¿Está seguro de desactivar este consultorio?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleConfirmOpen(false)} disabled={!!togglingId}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toggleConfirmData) {
                  handleToggleActive(toggleConfirmData.id, false)
                }
              }}
              disabled={!!togglingId}
            >
              {togglingId ? "Desactivando..." : "Desactivar"}
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
              ¿Está seguro de eliminar este consultorio? Esta acción no se puede deshacer.
              <br />
              <br />
              <strong>Nota:</strong> Solo se puede eliminar un consultorio si no tiene citas ni bloqueos
              asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

