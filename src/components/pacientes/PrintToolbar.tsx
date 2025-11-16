"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Download } from "lucide-react"
import { toast } from "sonner"

interface PrintToolbarProps {
  patientId: string
}

export function PrintToolbar({ patientId }: PrintToolbarProps) {
  const router = useRouter()

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    toast("Generando PDF", {
      description: "La descarga comenzará en breve...",
    })

    try {
      // Call API endpoint to generate PDF
      const response = await fetch(`/api/pacientes/${patientId}/pdf`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Error al generar PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ficha-paciente-${patientId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("PDF descargado", {
        description: "El archivo se ha descargado correctamente.",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Error", {
        description: "No se pudo generar el PDF. Intente nuevamente.",
      })
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-white print:hidden">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Descargar PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  )
}
