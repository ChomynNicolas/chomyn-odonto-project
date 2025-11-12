"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import PacienteForm from "@/components/pacientes/PacienteForm"
import type { PacienteInput } from "@/components/pacientes/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function EditarPacientePage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [patientData, setPatientData] = useState<Partial<PacienteInput> | null>(null)

  useEffect(() => {
    async function fetchPatient() {
      try {
        const response = await fetch(`/api/pacientes/${patientId}`)
        if (!response.ok) {
          throw new Error("No se pudo cargar el paciente")
        }
        const result = await response.json()

        if (!result.ok || !result.data) {
          throw new Error(result.error || "No se encontró el paciente")
        }

        const data = result.data

        const nombres = data.persona?.nombres || ""
        const apellidos = data.persona?.apellidos || ""
        const nombreCompleto = `${nombres} ${apellidos}`.trim()

        // Parse notas JSON safely
        let notasData = {}
        try {
          if (data.notas && typeof data.notas === "string") {
            notasData = JSON.parse(data.notas)
          }
        } catch (e) {
          console.warn("Could not parse notas JSON:", e)
        }

        // Transform API data to form format
        type Contacto = { tipo: "PHONE" | "EMAIL"; valorNorm?: string | null }
        const contactos = (data.persona?.contactos ?? []) as Contacto[]
        
        setPatientData({
          nombreCompleto: nombreCompleto || "Sin nombre",
          genero: data.persona?.genero || "NO_DECLARA",
          fechaNacimiento: data.persona?.fechaNacimiento || undefined,
          dni: data.persona?.documento?.numero || "",
          ruc: data.persona?.documento?.ruc || "",
          telefono: contactos.find((c) => c.tipo === "PHONE")?.valorNorm || "",
          email: contactos.find((c) => c.tipo === "EMAIL")?.valorNorm || "",
          domicilio: data.persona?.direccion || "",
          ...notasData,
        })
      } catch (err) {
        console.error("[Edit Page] Error fetching patient:", err)
        setError(err instanceof Error ? err.message : "Error al cargar paciente")
      } finally {
        setLoading(false)
      }
    }

    fetchPatient()
  }, [patientId])

  const handleSubmit = async (values: PacienteInput) => {
    try {
      const response = await fetch(`/api/pacientes/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "No se pudo actualizar el paciente")
      }

      router.push(`/pacientes/${patientId}`)
    } catch (err) {
      console.error("[Edit Page] Error updating patient:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar")
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    )
  }

  if (error || !patientData) {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "No se encontró el paciente"}</AlertDescription>
        </Alert>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Editar paciente</h1>
        <p className="text-sm text-muted-foreground">Actualiza la información completa del paciente</p>
      </header>
      <PacienteForm defaultValues={patientData} onSubmit={handleSubmit} submitLabel="Guardar cambios" />
    </main>
  )
}
