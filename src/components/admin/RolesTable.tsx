"use client"

import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import type { RoleListItem } from "@/lib/api/admin/roles"
import { Users } from "lucide-react"

interface RolesTableProps {
  roles: RoleListItem[]
}

export default function RolesTable({ roles }: RolesTableProps) {
  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      ODONT: "Odontólogo",
      RECEP: "Recepcionista",
    }
    return labels[rol] || rol
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rol</TableHead>
            <TableHead>Usuarios</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                No hay roles disponibles
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.idRol}>
                <TableCell className="font-medium">{getRoleLabel(role.nombreRol)}</TableCell>
                <TableCell>{role.userCount} usuario{role.userCount !== 1 ? "s" : ""}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/configuracion/usuarios?rolId=${role.idRol}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Ver usuarios
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

