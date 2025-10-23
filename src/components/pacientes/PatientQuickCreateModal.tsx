"use client"

import type React from "react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Edit3 } from "lucide-react"

interface PatientQuickCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (id: string) => void
  qForList: string
  soloActivos: boolean
  limit: number
}

export default function PatientQuickCreateModal({
  open,
  onClose,
  onCreated,
  qForList,
  soloActivos,
  limit,
}: PatientQuickCreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null)

  const [nombreCompleto, setNombreCompleto] = useState("")
  const [genero, setGenero] = useState<string>("NO_ESPECIFICADO")
  const [telefono, setTelefono] = useState("")
  const [tipoDocumento, setTipoDocumento] = useState<string>("CI")
  const [dni, setDni] = useState("")
  const [email, setEmail] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")

  const queryClient = useQueryClient()
  const router = useRouter()

  const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(fechaNacimiento)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/pacientes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreCompleto,
          genero,
          tipoDocumento,
          dni,
          telefono,
          email: email || undefined,
          fechaNacimiento: fechaNacimiento || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear paciente")
      }

      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({
        queryKey: ["pacientes", qForList, soloActivos, limit],
      })

      const patientId = String(data.data.idPaciente)
      setCreatedPatientId(patientId)
      onCreated(patientId)
    } catch (error) {
      console.error("Error creating patient:", error)
      setError(error instanceof Error ? error.message : "Error al crear el paciente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditFullDetails = () => {
    if (createdPatientId) {
      router.push(`/pacientes/${createdPatientId}/editar`)
      handleClose()
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      setCreatedPatientId(null)
      // Reset form
      setNombreCompleto("")
      setGenero("NO_ESPECIFICADO")
      setTelefono("")
      setTipoDocumento("CI")
      setDni("")
      setEmail("")
      setFechaNacimiento("")
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Alta rápida de paciente</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Crea un nuevo paciente con información básica. Podrás completar los detalles después.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {createdPatientId && !error ? (
          <div className="space-y-4 py-6">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center dark:border-green-900/30 dark:bg-green-950/20">
              <div className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">
                ✓ Paciente creado exitosamente
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                El paciente ha sido registrado con información básica
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Cerrar
              </Button>
              <Button type="button" onClick={handleEditFullDetails} className="flex-1 gap-2">
                <Edit3 className="h-4 w-4" />
                Completar datos
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombreCompleto" className="text-sm font-medium">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombreCompleto"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Ej: Juan Carlos González"
                  required
                  disabled={isSubmitting}
                  autoFocus
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genero" className="text-sm font-medium">
                    Género
                  </Label>
                  <Select value={genero} onValueChange={setGenero} disabled={isSubmitting}>
                    <SelectTrigger id="genero" className="text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCULINO">Masculino</SelectItem>
                      <SelectItem value="FEMENINO">Femenino</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                      <SelectItem value="NO_ESPECIFICADO">No especificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento" className="text-sm font-medium">
                    Fecha de nacimiento
                  </Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    disabled={isSubmitting}
                    max={new Date().toISOString().split("T")[0]}
                    className="text-sm"
                  />
                  {age !== null && <p className="text-xs text-muted-foreground">{age} años</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento" className="text-sm font-medium">
                    Tipo de documento <span className="text-destructive">*</span>
                  </Label>
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento} disabled={isSubmitting}>
                    <SelectTrigger id="tipoDocumento" className="text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CI">CI</SelectItem>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="PASAPORTE">Pasaporte</SelectItem>
                      <SelectItem value="RUC">RUC</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni" className="text-sm font-medium">
                    Número <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dni"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="12345678"
                    required
                    disabled={isSubmitting}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono" className="text-sm font-medium">
                  Teléfono <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+595 981 123456"
                  required
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email (opcional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  disabled={isSubmitting}
                  className="text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear paciente"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
