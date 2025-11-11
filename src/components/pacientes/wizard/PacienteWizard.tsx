"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
import { PacienteCreateDTOClient, PacienteCreateSchemaClient } from "@/lib/schema/paciente.schema"
import { Step3Clinicos } from "./steps/Step3Clinicos"

const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Datos Clínicos", required: false },
  { id: 4, name: "Responsable de Pago", required: false },
  { id: 5, name: "Adjuntos", required: false },
] as const

type SaveIntent = "continue" | "open" | "schedule"

export function PacienteWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PacienteCreateDTOClient>({
    resolver: zodResolver(PacienteCreateSchemaClient),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
  nombreCompleto: "",
  genero: undefined,
  fechaNacimiento: undefined,
  tipoDocumento: "CI",
  numeroDocumento: "",
  ruc: "",
  paisEmision: "PY",
  direccion: "",
  ciudad: "",
  pais: "PY",
  telefono: "",
  email: "",
  preferenciasContacto: [],
  preferenciasRecordatorio: [],
  preferenciasCobranza: [],
  alergias: [],         // ← arrays, no string
  medicacion: [],
  antecedentes: "",
  observaciones: "",
  responsablePago: undefined,
  adjuntos: [],
}
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
        return
      }

      const values = form.getValues()

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
        telefono: values.telefono,
        email: values.email,
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

  responsablePago: values.responsablePago,
  adjuntos: values.adjuntos,

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

      if (values.adjuntos && values.adjuntos.length > 0) {
        const uploadResults = await uploadAdjuntosPostCreate(pacienteId, values.adjuntos)
        const successful = uploadResults.filter((r) => r.success).length
        const failed = uploadResults.filter((r) => !r.success).length

        if (failed > 0) {
          toast.warning(
            `Paciente creado. ${successful} adjunto${successful !== 1 ? "s" : ""} guardado${successful !== 1 ? "s" : ""}, ${failed} falló${failed !== 1 ? "ron" : ""}`,
          )
        } else if (successful > 0) {
          toast.success(`${successful} adjunto${successful !== 1 ? "s" : ""} guardado${successful !== 1 ? "s" : ""} correctamente`)
        }
      }

      toast.success("Paciente creado correctamente", {
        description: `${values.nombreCompleto} (ID ${pacienteId})`,
      })

      switch (intent) {
        case "open":
          router.push(`/pacientes/${pacienteId}`)
          break
        case "schedule":
          router.push(`/agenda?pacienteId=${pacienteId}`)
          break
        case "continue":
          form.reset()
          setCurrentStep(1)
          toast.info("Formulario listo para nuevo paciente")
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
        return <Step5Adjuntos form={form} />
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

function getFieldsForStep(step: number): (keyof PacienteCreateDTOClient)[] {
  switch (step) {
    case 1:
      return  [
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

async function uploadAdjuntosPostCreate(pacienteId: number, adjuntos: any[]) {
  const results = []
  for (const adjunto of adjuntos) {
    if (adjunto._cloud) {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}/adjuntos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicId: adjunto._cloud.publicId,
            secureUrl: adjunto._cloud.secureUrl,
            bytes: adjunto._cloud.bytes,
            format: adjunto._cloud.format,
            width: adjunto._cloud.width,
            height: adjunto._cloud.height,
            duration: adjunto._cloud.duration,
            resourceType: adjunto._cloud.resourceType,
            folder: adjunto._cloud.folder,
            originalFilename: adjunto._cloud.originalFilename || adjunto.nombre,
            version: adjunto._cloud.version,
            accessMode: adjunto._cloud.accessMode || "AUTHENTICATED",
            tipo: adjunto.tipoAdj || "OTHER",
            descripcion: adjunto.nombre || undefined,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Error desconocido" }))
          throw new Error(errorData.error || "Error al persistir adjunto")
        }

        const result = await response.json()
        if (!result.ok) {
          throw new Error(result.error || "Error al persistir adjunto")
        }

        results.push({ success: true, nombre: adjunto.nombre })
      } catch (error) {
        console.error(`[Wizard] Error persistiendo adjunto ${adjunto.nombre}:`, error)
        results.push({
          success: false,
          nombre: adjunto.nombre,
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }
  }
  return results
}
