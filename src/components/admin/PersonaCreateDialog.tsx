"use client"

import { useState, useEffect } from "react"
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
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

// Función para dividir nombre completo en nombres y apellidos
function splitNombreCompleto(nombreCompleto: string): {
  nombres: string
  apellidos: string
  segundoApellido: string | null
} {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "", segundoApellido: null }
  }

  if (parts.length === 2) {
    return { nombres: parts[0], apellidos: parts[1], segundoApellido: null }
  }

  // Si hay 3+ palabras, las últimas 2 son apellidos
  const segundoApellido = parts[parts.length - 1]
  const apellidos = parts[parts.length - 2]
  const nombres = parts.slice(0, -2).join(" ")

  return { nombres, apellidos, segundoApellido }
}

const personaCreateSchema = z.object({
  nombres: z.string().min(1, "Los nombres son requeridos").max(100).trim(),
  apellidos: z.string().min(1, "Los apellidos son requeridos").max(100).trim(),
  segundoApellido: z.string().max(100).trim().optional().nullable(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  genero: z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]).optional().nullable(),
  direccion: z.string().max(500).trim().optional().nullable(),
  documento: z.object({
    tipo: z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"]),
    numero: z.string().min(1, "El número de documento es requerido").max(50).trim(),
    ruc: z.string().max(20).trim().optional().nullable(),
  }),
  email: z.string().email("Email inválido").max(255).trim().optional().nullable().or(z.literal("")),
  telefono: z.string().max(50).trim().optional().nullable().or(z.literal("")),
})

type PersonaCreateFormValues = z.infer<typeof personaCreateSchema>

interface PersonaCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (personaId: number) => void
  initialData?: {
    nombreCompleto?: string
    email?: string | null
  }
}

export default function PersonaCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: PersonaCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<PersonaCreateFormValues>({
    resolver: zodResolver(personaCreateSchema),
    defaultValues: {
      nombres: "",
      apellidos: "",
      segundoApellido: null,
      fechaNacimiento: null,
      genero: null,
      direccion: null,
      documento: {
        tipo: "CI",
        numero: "",
        ruc: null,
      },
      email: null,
      telefono: null,
    },
  })

  // Pre-llenar datos si se proporcionan datos iniciales
  useEffect(() => {
    if (open && initialData) {
      if (initialData.nombreCompleto) {
        const { nombres, apellidos, segundoApellido } = splitNombreCompleto(initialData.nombreCompleto)
        form.setValue("nombres", nombres)
        form.setValue("apellidos", apellidos)
        if (segundoApellido) {
          form.setValue("segundoApellido", segundoApellido)
        }
      }
      if (initialData.email) {
        form.setValue("email", initialData.email)
      }
    } else if (open && !initialData) {
      form.reset()
    }
  }, [open, initialData, form])

  const onSubmit = async (data: PersonaCreateFormValues) => {
    setIsLoading(true)
    try {
      const body = {
        nombres: data.nombres,
        apellidos: data.apellidos,
        segundoApellido: data.segundoApellido || null,
        fechaNacimiento: data.fechaNacimiento || null,
        genero: data.genero || null,
        direccion: data.direccion || null,
        documento: {
          tipo: data.documento.tipo,
          numero: data.documento.numero,
          ruc: data.documento.ruc || null,
          paisEmision: "PY",
        },
        contactos: [
          ...(data.email ? [{ tipo: "EMAIL" as const, valor: data.email }] : []),
          ...(data.telefono ? [{ tipo: "PHONE" as const, valor: data.telefono }] : []),
        ],
      }

      const response = await fetch("/api/personas/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || "Error al crear persona")
      }

      toast.success("Persona creada correctamente")
      onSuccess(result.data.idPersona)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear persona")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Persona</DialogTitle>
          <DialogDescription>
            Completa los datos para crear una nueva persona. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres *</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Carlos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos *</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="segundoApellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segundo Apellido</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="García"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fechaNacimiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MASCULINO">Masculino</SelectItem>
                        <SelectItem value="FEMENINO">Femenino</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                        <SelectItem value="NO_ESPECIFICADO">No especificado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Calle y número"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documento.tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Documento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CI">Cédula de Identidad</SelectItem>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                        <SelectItem value="RUC">RUC</SelectItem>
                        <SelectItem value="OTRO">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documento.numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Documento *</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="persona@ejemplo.com"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="0981 123456"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Persona
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

