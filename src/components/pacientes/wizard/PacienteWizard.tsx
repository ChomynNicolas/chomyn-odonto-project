"use client"

import { useState } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Form } from "@/components/ui/form"
import { WizardHeader } from "./WizardHeader"
import { WizardFooter } from "./WizardFooter"
import { Step1Identificacion } from "./steps/Step1Identificacion"
import { Step2Contacto } from "./steps/Step2Contacto"
import { Step4Responsable } from "./steps/Step4Responsable"
import { Step5Adjuntos } from "./steps/Step5Adjuntos"
import { toast } from "sonner"
import {
  PacienteCreateSchemaClient,
  type PacienteCreateFormInput,
  type PacienteCreateFormOutput,
  normalizarTelefono,
  normalizarEmail,
} from "@/lib/schema/paciente.schema"
import { Step3Clinicos } from "./steps/Step3Clinicos"
import type { AdjuntoUI } from "@/lib/schema/paciente.schema"

const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Datos Clínicos", required: false },
  { id: 4, name: "Responsable de Pago", required: false },
  { id: 5, name: "Adjuntos", required: false },
] as const

type SaveIntent = "continue" | "open"

export function PacienteWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Map para guardar los File objects de los adjuntos (no se pueden serializar en el form)
  const [adjuntosFiles, setAdjuntosFiles] = useState<Map<string, File>>(new Map())

  const form = useForm<PacienteCreateFormInput>({
    resolver: zodResolver(PacienteCreateSchemaClient) as Resolver<PacienteCreateFormInput>,
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      nombreCompleto: "",
      genero: undefined,
      fechaNacimiento: undefined,
      tipoDocumento: "CI",
      numeroDocumento: "",
      ruc: undefined,
      paisEmision: "PY",
      direccion: "",
      ciudad: "",
      pais: "PY",
      codigoPaisTelefono: "+595",
      telefono: "",
      email: "",
      preferenciasContacto: [],
      preferenciasRecordatorio: [],
      preferenciasCobranza: [],
      alergias: [],
      medicacion: [],
      antecedentes: undefined,
      observaciones: undefined,
      responsablePago: undefined,
      vitals: undefined,
      adjuntos: [],
    },
  })

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate)

    if (!isValid) {
      const firstError = Object.keys(form.formState.errors)[0]
      if (firstError) {
        const element = document.getElementById(firstError)
        element?.scrollIntoView({ behavior: "smooth", block: "center" })
        element?.focus()
      }
      toast.error("Complete los campos requeridos antes de continuar")
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length))
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSave = async (intent: SaveIntent) => {
    setIsSubmitting(true)

    try {
      const requiredFields = [...getFieldsForStep(1), ...getFieldsForStep(2)]
      const isValid = await form.trigger(requiredFields)

      if (!isValid) {
        const firstError = Object.keys(form.formState.errors)[0]
        if (firstError) {
          const element = document.getElementById(firstError)
          element?.scrollIntoView({ behavior: "smooth", block: "center" })
          element?.focus()
        }
        toast.error("Complete los campos requeridos antes de guardar")
        setIsSubmitting(false)
        return
      }

      // Parsear los valores usando el schema para obtener el tipo de salida
      const inputValues = form.getValues()
      const values = PacienteCreateSchemaClient.parse(inputValues) as PacienteCreateFormOutput

      // Normalizar teléfono con código de país
      const codigoPais = inputValues.codigoPaisTelefono || "+595"
      const telefonoNormalizado = values.telefono
        ? normalizarTelefono(values.telefono, codigoPais)
        : values.telefono

      const payload = {
        nombreCompleto: values.nombreCompleto.trim(),
        genero: values.genero,
        fechaNacimiento: values.fechaNacimiento?.toISOString(),
        tipoDocumento: values.tipoDocumento,
        numeroDocumento: values.numeroDocumento,
        ruc: values.ruc,
        paisEmision: values.paisEmision,
        direccion: values.direccion,
        ciudad: values.ciudad,
        pais: values.pais,
        telefono: telefonoNormalizado,
        email: values.email && values.email.trim() ? normalizarEmail(values.email) : undefined,
        preferenciasContacto: {
          whatsapp: values.preferenciasContacto?.includes("WHATSAPP"),
          sms: values.preferenciasContacto?.includes("SMS"),
          llamada: values.preferenciasContacto?.includes("LLAMADA"),
          email: values.preferenciasContacto?.includes("EMAIL"),
        },
        preferenciasRecordatorio: {
          whatsapp: values.preferenciasRecordatorio?.includes("WHATSAPP"),
          sms: values.preferenciasRecordatorio?.includes("SMS"),
          email: values.preferenciasRecordatorio?.includes("EMAIL"),
        },
        preferenciasCobranza: {
          whatsapp: values.preferenciasCobranza?.includes("WHATSAPP"),
          sms: values.preferenciasCobranza?.includes("SMS"),
          email: values.preferenciasCobranza?.includes("EMAIL"),
        },
        alergias: values.alergias?.length ? values.alergias : undefined,
        medicacion: values.medicacion?.length ? values.medicacion : undefined,
        antecedentes: values.antecedentes?.trim() || undefined,
        observaciones: values.observaciones?.trim() || undefined,
        // Nota: La validación de que el responsable sea mayor de 18 años se realiza
        // en el componente ResponsablePagoSelector, que filtra y previene la selección de menores.
        responsablePago: values.responsablePago,
        // NO enviamos adjuntos aquí - se suben después de crear el paciente
        vitals: values.vitals,
      }

      console.log("[v0] Guardando paciente:", payload, "Intent:", intent)

      const idempotencyKey = `paciente-create-${Date.now()}-${Math.random().toString(36).substring(7)}`

      const response = await fetch("/api/pacientes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear paciente")
      }

      const result = await response.json()
      const pacienteId = result.data.idPaciente

      console.log("[v0] Paciente creado exitosamente:", pacienteId)

      // Subir adjuntos después de crear el paciente
      let adjuntosMensaje: string | undefined
      let adjuntosConErrores = false
      if (values.adjuntos && values.adjuntos.length > 0) {
        const uploadResults = await uploadAdjuntosPostCreate(
          pacienteId,
          values.adjuntos,
          adjuntosFiles,
        )
        const successful = uploadResults.filter((r) => r.success).length
        const failed = uploadResults.filter((r) => !r.success).length

        if (failed > 0) {
          adjuntosMensaje = `${successful} adjunto${successful !== 1 ? "s" : ""} guardado${successful !== 1 ? "s" : ""}, ${failed} falló${failed !== 1 ? "ron" : ""}`
          adjuntosConErrores = true
        } else if (successful > 0) {
          adjuntosMensaje = `${successful} adjunto${successful !== 1 ? "s" : ""} guardado${successful !== 1 ? "s" : ""} correctamente`
        }
      }

      // Mostrar mensaje de éxito específico según el intent
      switch (intent) {
        case "open":
          // Para "open", mostrar mensaje y navegar
          if (adjuntosConErrores) {
            toast.warning("Paciente creado correctamente", {
              description: `${values.nombreCompleto} (ID ${pacienteId}) - ${adjuntosMensaje}`,
            })
          } else {
            toast.success("Paciente creado correctamente", {
              description: adjuntosMensaje
                ? `${values.nombreCompleto} (ID ${pacienteId}) - ${adjuntosMensaje}`
                : `${values.nombreCompleto} (ID ${pacienteId})`,
            })
          }
          // Navegar a la ficha del paciente
          router.push(`/pacientes/${pacienteId}`)
          break
        case "continue":
          // Para "continue", mantener al usuario en el formulario
          // Mostrar mensaje de éxito o advertencia según el resultado de adjuntos
          if (adjuntosConErrores) {
            toast.warning("Paciente guardado correctamente", {
              description: `${values.nombreCompleto} (ID ${pacienteId}) - ${adjuntosMensaje}`,
            })
          } else if (adjuntosMensaje) {
            toast.success("Paciente guardado correctamente", {
              description: `${values.nombreCompleto} (ID ${pacienteId}) - ${adjuntosMensaje}`,
            })
          } else {
            toast.success("Paciente guardado correctamente", {
              description: `${values.nombreCompleto} (ID ${pacienteId}) - Puede continuar editando`,
            })
          }
          // Mantener el usuario en el formulario con los datos actuales
          // No resetear el formulario - mantener el estado actual
          // El usuario puede continuar editando si lo desea
          break
      }
    } catch (error) {
      console.error("[v0] Error al guardar paciente:", error)
      toast.error(error instanceof Error ? error.message : "Error al crear paciente. Intente nuevamente")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Identificacion form={form} />
      case 2:
        return <Step2Contacto form={form} />
      case 3:
        return <Step3Clinicos form={form} />
      case 4:
        return <Step4Responsable form={form} />
      case 5:
        return (
          <Step5Adjuntos
            form={form}
            onAdjuntosFilesChange={setAdjuntosFiles}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
        <WizardHeader currentStep={currentStep} steps={STEPS} errors={form.formState.errors} />

        <Form {...form}>
          <form className="mt-6 space-y-6">{renderStep()}</form>
        </Form>

        <WizardFooter
          currentStep={currentStep}
          totalSteps={STEPS.length}
          isSubmitting={isSubmitting}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSave={handleSave}
          onCancel={() => {
            router.push("/pacientes")
          }}
        />
      </div>
    </div>
  )
}

function getFieldsForStep(step: number): (keyof PacienteCreateFormInput)[] {
  switch (step) {
    case 1:
      return [
        "nombreCompleto",
        "genero",
        "fechaNacimiento",
        "tipoDocumento",
        "numeroDocumento",
        "paisEmision",
        "direccion",
        "ciudad",
        "pais",
      ]
    case 2:
      return ["telefono", "email", "preferenciasContacto"]
    case 3:
      return []
    case 4:
      return []
    case 5:
      return []
    default:
      return []
  }
}

type UploadResult = {
  success: boolean
  nombre: string
  publicId?: string
  error?: string
}

/**
 * Sube adjuntos después de crear el paciente.
 * Si falla alguna subida, hace cleanup de los archivos ya subidos.
 */
async function uploadAdjuntosPostCreate(
  pacienteId: number,
  adjuntos: AdjuntoUI[],
  adjuntosFiles: Map<string, File>,
): Promise<UploadResult[]> {
  const results: UploadResult[] = []
  const publicIdsSubidos: string[] = []

  // Filtrar solo adjuntos pendientes (que tienen File)
  const adjuntosPendientes = adjuntos.filter(
    (a) => a.estado === "pendiente" && adjuntosFiles.has(a.id),
  )

  if (adjuntosPendientes.length === 0) {
    return results
  }

  // Subir cada adjunto
  for (const adjunto of adjuntosPendientes) {
    const file = adjuntosFiles.get(adjunto.id)
    if (!file) {
      results.push({
        success: false,
        nombre: adjunto.nombre,
        error: "Archivo no encontrado",
      })
      continue
    }

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("tipo", adjunto.tipoAdj || "OTHER")
      formData.append("descripcion", adjunto.nombre)

      const response = await fetch(`/api/pacientes/${pacienteId}/adjuntos/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(errorData.error || "Error al subir adjunto")
      }

      const result = await response.json()
      if (!result.ok) {
        throw new Error(result.error || "Error al subir adjunto")
      }

      const publicId = result.data.publicId
      if (publicId) {
        publicIdsSubidos.push(publicId)
      }

      results.push({
        success: true,
        nombre: adjunto.nombre,
        publicId,
      })
    } catch (error) {
      console.error(`[Wizard] Error subiendo adjunto ${adjunto.nombre}:`, error)
      results.push({
        success: false,
        nombre: adjunto.nombre,
        error: error instanceof Error ? error.message : "Error desconocido",
      })

      // Si falla, hacer cleanup de los archivos ya subidos
      if (publicIdsSubidos.length > 0) {
        try {
          await fetch("/api/adjuntos/cleanup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicIds: publicIdsSubidos }),
          })
          console.log(`[Wizard] Cleanup realizado para ${publicIdsSubidos.length} archivos`)
        } catch (cleanupError) {
          console.error("[Wizard] Error en cleanup:", cleanupError)
        }
      }

      // No continuar subiendo si falla uno (opcional: podrías continuar)
      break
    }
  }

  return results
}
