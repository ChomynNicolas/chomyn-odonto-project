"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const responsableSchema = z.object({
  nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  tipoDocumento: z.enum(["DNI", "CEDULA", "RUC", "PASAPORTE"]),
  numeroDocumento: z.string().min(5, "El número de documento es requerido"),
  tipoVinculo: z.enum(["PADRE", "MADRE", "TUTOR", "AUTORIZADO"]),
  telefono: z.string().optional(),
})

type ResponsableFormData = z.infer<typeof responsableSchema>

interface AddResponsableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pacienteId: number
  onSuccess: () => void
}

export function AddResponsableDialog({ open, onOpenChange, pacienteId, onSuccess }: AddResponsableDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResponsableFormData>({
    resolver: zodResolver(responsableSchema),
  })

  const tipoVinculo = watch("tipoVinculo")
  const tipoDocumento = watch("tipoDocumento")

  const onSubmit = async (data: ResponsableFormData) => {
    try {
      const response = await fetch(`/api/pacientes/${pacienteId}/responsables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al crear responsable")
      }

      toast.success("Responsable agregado", {
        description: "El responsable ha sido vinculado correctamente al paciente",
      })

      reset()
      onSuccess()
    } catch (error: any) {
      console.error("[v0] Error creating responsable:", error)
      toast.error("Error al agregar responsable", {
        description: error.message || "Ocurrió un error al procesar la solicitud",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar responsable</DialogTitle>
          <DialogDescription>
            Registra un responsable (padre, madre, tutor) para vincular al paciente menor de edad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombreCompleto">Nombre completo</Label>
            <Input id="nombreCompleto" {...register("nombreCompleto")} />
            {errors.nombreCompleto && <p className="text-sm text-destructive">{errors.nombreCompleto.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento">Tipo de documento</Label>
              <Select value={tipoDocumento} onValueChange={(v) => setValue("tipoDocumento", v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="CEDULA">Cédula</SelectItem>
                  <SelectItem value="RUC">RUC</SelectItem>
                  <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoDocumento && <p className="text-sm text-destructive">{errors.tipoDocumento.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroDocumento">Número</Label>
              <Input id="numeroDocumento" {...register("numeroDocumento")} />
              {errors.numeroDocumento && <p className="text-sm text-destructive">{errors.numeroDocumento.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoVinculo">Tipo de vínculo</Label>
            <Select value={tipoVinculo} onValueChange={(v) => setValue("tipoVinculo", v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PADRE">Padre</SelectItem>
                <SelectItem value="MADRE">Madre</SelectItem>
                <SelectItem value="TUTOR">Tutor legal</SelectItem>
                <SelectItem value="AUTORIZADO">Persona autorizada</SelectItem>
              </SelectContent>
            </Select>
            {errors.tipoVinculo && <p className="text-sm text-destructive">{errors.tipoVinculo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono (opcional)</Label>
            <Input id="telefono" type="tel" {...register("telefono")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Agregar responsable"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
