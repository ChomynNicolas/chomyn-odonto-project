"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
import { Edit, Key, Plus, Search, UserCheck, UserX } from "lucide-react"
import type { UserListResponse } from "@/lib/api/admin/users"
import type { RoleListItem } from "@/lib/api/admin/roles"
import UserForm from "./UserForm"
import ResetPasswordDialog from "./ResetPasswordDialog"
import { toast } from "sonner"

interface UsersTableProps {
  initialData: UserListResponse
  roles: RoleListItem[]
}

export default function UsersTable({ initialData, roles }: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [editingUser, setEditingUser] = useState<number | null>(null)
  const [resettingPassword, setResettingPassword] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [filters, setFilters] = useState({
    rolId: searchParams.get("rolId") || "",
    estaActivo: searchParams.get("estaActivo") || "",
    search: searchParams.get("search") || "",
  })

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    const params = new URLSearchParams()
    if (newFilters.rolId) params.set("rolId", newFilters.rolId)
    if (newFilters.estaActivo) params.set("estaActivo", newFilters.estaActivo)
    if (newFilters.search) params.set("search", newFilters.search)
    
    startTransition(() => {
      router.push(`/configuracion/usuarios?${params.toString()}`)
    })
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/configuracion/usuarios?${params.toString()}`)
  }

  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      ODONT: "Odontólogo",
      RECEP: "Recepcionista",
    }
    return labels[rol] || rol
  }

  const handleUserUpdated = () => {
    setEditingUser(null)
    router.refresh()
    toast.success("Usuario actualizado correctamente")
  }

  const handleUserCreated = () => {
    setIsCreating(false)
    router.refresh()
    toast.success("Usuario creado correctamente")
  }

  const handlePasswordReset = () => {
    setResettingPassword(null)
    toast.success("Contraseña reseteada correctamente")
  }

  return (
    <div className="space-y-4">
      {/* Filtros y acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, usuario o email..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.rolId || "all"}
            onValueChange={(value) => handleFilterChange("rolId", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Todos los roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.idRol} value={role.idRol.toString()}>
                  {getRoleLabel(role.nombreRol)}
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
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              initialData.data.map((user) => (
                <TableRow key={user.idUsuario}>
                  <TableCell className="font-medium">{user.usuario}</TableCell>
                  <TableCell>{user.nombreApellido}</TableCell>
                  <TableCell>{user.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getRoleLabel(user.rol.nombreRol)}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.estaActivo ? (
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
                  <TableCell className="text-muted-foreground">
                    {user.ultimoLoginAt
                      ? format(new Date(user.ultimoLoginAt), "dd/MM/yyyy HH:mm", { locale: es })
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user.idUsuario)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResettingPassword(user.idUsuario)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Reset
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
            {initialData.meta.total} usuarios
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
        <UserForm
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={handleUserCreated}
          roles={roles}
        />
      )}
      {editingUser && (
        <UserForm
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          userId={editingUser}
          onSuccess={handleUserUpdated}
          roles={roles}
        />
      )}
      {resettingPassword && (
        <ResetPasswordDialog
          open={!!resettingPassword}
          onOpenChange={(open) => !open && setResettingPassword(null)}
          userId={resettingPassword}
          onSuccess={handlePasswordReset}
        />
      )}
    </div>
  )
}

