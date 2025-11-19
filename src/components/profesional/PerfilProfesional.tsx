"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save } from "lucide-react"
import { fetchProfesional, updateProfesionalAvailability } from "@/lib/api/admin/profesionales"
import DisponibilidadEditor from "@/components/admin/DisponibilidadEditor"
import { toast } from "sonner"
import type { ProfesionalDetail } from "@/lib/api/admin/profesionales"
import type { Disponibilidad } from "@/app/api/profesionales/_schemas"

export default function PerfilProfesional() {
  const [profesional, setProfesional] = useState<ProfesionalDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null)

  useEffect(() => {
    const loadProfesional = async () => {
      try {
        // Obtener el ID del profesional desde la sesión del usuario
        // Por ahora, asumimos que hay un endpoint para obtener el profesional del usuario actual
        // O podemos obtenerlo desde el contexto de autenticación
        const response = await fetch("/api/profesionales/me")
        if (!response.ok) {
          throw new Error("No se pudo cargar el perfil")
        }
        const data = await response.json()
        if (data.ok && data.data) {
          setProfesional(data.data)
          setDisponibilidad(data.data.disponibilidad as Disponibilidad | null)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar perfil")
      } finally {
        setIsLoading(false)
      }
    }

    loadProfesional()
  }, [])

  const handleSaveDisponibilidad = async () => {
    if (!profesional || !disponibilidad) return

    setIsSaving(true)
    try {
      await updateProfesionalAvailability(profesional.idProfesional, {
        disponibilidad,
      })
      toast.success("Disponibilidad actualizada correctamente")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar disponibilidad")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profesional) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No se encontró información del profesional</p>
        </CardContent>
      </Card>
    )
  }

  const nombreCompleto = [
    profesional.persona.nombres,
    profesional.persona.apellidos,
    profesional.persona.segundoApellido,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="space-y-6">
      {/* Información del Profesional */}
      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>Datos básicos del profesional (solo lectura)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
            <p className="text-lg font-semibold">{nombreCompleto}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Usuario</Label>
            <p className="text-lg">{profesional.usuario.usuario}</p>
          </div>
          {profesional.usuario.email && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-lg">{profesional.usuario.email}</p>
            </div>
          )}
          {profesional.numeroLicencia && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Número de Licencia</Label>
              <p className="text-lg">{profesional.numeroLicencia}</p>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Especialidades</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {profesional.especialidades.length > 0 ? (
                profesional.especialidades.map((esp) => (
                  <Badge key={esp.idEspecialidad} variant="outline">
                    {esp.nombre}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Sin especialidades asignadas</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disponibilidad */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidad</CardTitle>
          <CardDescription>
            Configura tus horarios de disponibilidad semanal. Solo puedes editar tu propia disponibilidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DisponibilidadEditor value={disponibilidad} onChange={setDisponibilidad} />
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleSaveDisponibilidad} disabled={isSaving || !disponibilidad}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Disponibilidad
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas</CardTitle>
          <CardDescription>Resumen de actividad</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Citas</Label>
              <p className="text-2xl font-bold">{profesional.counts.citas}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Bloqueos</Label>
              <p className="text-2xl font-bold">{profesional.counts.bloqueosAgenda}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Consultas</Label>
              <p className="text-2xl font-bold">{profesional.counts.consultas}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

