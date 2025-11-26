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
import { toast } from "sonner"
import {
  PacienteCreateSchemaClient,
  type PacienteCreateFormInput,
  type PacienteCreateFormOutput,
  normalizarTelefono,
  normalizarEmail,
} from "@/lib/schema/paciente.schema"

const STEPS = [
  { id: 1, name: "Identificación", required: true },
  { id: 2, name: "Contacto", required: true },
  { id: 3, name: "Responsable de Pago", required: false },
] as const

type SaveIntent = "continue" | "open"

export function PacienteWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      responsablePago: undefined,
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
        // Nota: La validación de que el responsable sea mayor de 18 años se realiza
        // en el componente ResponsablePagoSelector, que filtra y previene la selección de menores.
        responsablePago: values.responsablePago,
      }

      console.log("Guardando paciente:", payload, "Intent:", intent)

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

      // Mostrar mensaje de éxito específico según el intent
      switch (intent) {
        case "open":
          toast.success("Paciente creado correctamente")
          router.push(`/pacientes/${pacienteId}`)
          break
        case "continue":
          toast.success("Paciente guardado correctamente")
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
        return <Step4Responsable form={form} />
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
      return [] // Responsable es opcional
    default:
      return []
  }
}
