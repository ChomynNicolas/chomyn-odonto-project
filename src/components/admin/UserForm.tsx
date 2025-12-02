"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { fetchUser, createUser, updateUser, type UserCreateInput, type UserUpdateInput } from "@/lib/api/admin/users"
import type { RoleListItem } from "@/lib/api/admin/roles"
import { toast } from "sonner"

const userFormSchema = z.object({
  usuario: z.string().min(1, "El nombre de usuario es requerido").max(100),
  email: z.string().email("Email inválido").max(255).optional().nullable(),
  nombreApellido: z.string().min(1, "El nombre es requerido").max(255),
  rolId: z.number().int().positive("Debe seleccionar un rol"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
  estaActivo: z.boolean().default(true),
})

type UserFormValues = z.input<typeof userFormSchema>

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: number
  onSuccess: () => void
  roles: RoleListItem[]
}

export default function UserForm({ open, onOpenChange, userId, onSuccess, roles }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const isEditing = !!userId

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      usuario: "",
      email: null,
      nombreApellido: "",
      rolId: roles[0]?.idRol || 0,
      password: undefined,
      estaActivo: true,
    },
  })

  // Cargar datos del usuario si está editando
  useEffect(() => {
    if (open && userId && isEditing) {
      setIsLoadingUser(true)
      fetchUser(userId)
        .then((user) => {
          form.reset({
            usuario: user.usuario,
            email: user.email,
            nombreApellido: user.nombreApellido,
            rolId: user.rolId,
            password: undefined, // No cargar password
            estaActivo: user.estaActivo,
          })
        })
        .catch((error) => {
          toast.error(error.message || "Error al cargar usuario")
          onOpenChange(false)
        })
        .finally(() => {
          setIsLoadingUser(false)
        })
    } else if (open && !isEditing) {
      form.reset({
        usuario: "",
        email: null,
        nombreApellido: "",
        rolId: roles[0]?.idRol || 0,
        password: undefined,
        estaActivo: true,
      })
    }
  }, [open, userId, isEditing, form, roles, onOpenChange])

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true)
    try {
      if (isEditing) {
        const updateData: UserUpdateInput = {
          usuario: data.usuario,
          email: data.email,
          nombreApellido: data.nombreApellido,
          rolId: data.rolId,
          estaActivo: data.estaActivo ?? true,
        }
        await updateUser(userId!, updateData)
      } else {
        if (!data.password) {
          toast.error("La contraseña es requerida para nuevos usuarios")
          setIsLoading(false)
          return
        }
        const createData: UserCreateInput = {
          usuario: data.usuario,
          email: data.email || null,
          nombreApellido: data.nombreApellido,
          rolId: data.rolId,
          password: data.password,
        }
        await createUser(createData)
      }
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar usuario")
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (rol: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      ODONT: "Odontólogo",
      RECEP: "Recepcionista",
    }
    return labels[rol] || rol
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica la información del usuario"
              : "Completa los datos para crear un nuevo usuario"}
          </DialogDescription>
        </DialogHeader>
        {isLoadingUser ? (
          <div className="py-8 text-center text-muted-foreground">Cargando usuario...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="usuario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de usuario *</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormDescription>Opcional. Debe ser único si se proporciona.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nombreApellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.idRol} value={role.idRol.toString()}>
                            {getRoleLabel(role.nombreRol)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isEditing && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña *</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mínimo 8 caracteres" {...field} />
                      </FormControl>
                      <FormDescription>Mínimo 8 caracteres</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isEditing && (
                <FormField
                  control={form.control}
                  name="estaActivo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Usuario activo</FormLabel>
                        <FormDescription>
                          Los usuarios inactivos no pueden iniciar sesión
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear usuario"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

