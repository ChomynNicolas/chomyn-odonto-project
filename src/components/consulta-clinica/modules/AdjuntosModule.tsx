// src/components/consulta-clinica/modules/AdjuntosModule.tsx
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Image, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import type { ConsultaClinicaDTO, AdjuntoDTO } from "@/app/api/agenda/citas/[id]/consulta/_dto"

interface AdjuntosModuleProps {
  citaId: number
  consulta: ConsultaClinicaDTO
  canEdit: boolean
  onUpdate: () => void
}

export function AdjuntosModule({ citaId, consulta, canEdit, onUpdate }: AdjuntosModuleProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este adjunto?")) return

    try {
      const res = await fetch(`/api/agenda/citas/${citaId}/consulta/adjuntos/${id}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar adjunto")

      toast.success("Adjunto eliminado")
      onUpdate()
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast.error("Error al eliminar adjunto")
    }
  }

  // Nota: La subida de archivos debería integrarse con el sistema de upload existente
  // Por ahora solo mostramos los adjuntos existentes

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Adjuntos (RX, Fotos)</h3>
        {canEdit && (
          <Button size="sm" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivo
          </Button>
        )}
      </div>

      {consulta.adjuntos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay adjuntos registrados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consulta.adjuntos.map((adj) => (
            <Card key={adj.id}>
              <CardContent className="pt-6">
                <div className="relative">
                  {adj.tipo === "XRAY" || adj.tipo === "IMAGE" || adj.tipo === "INTRAORAL_PHOTO" ? (
                    <img
                      src={adj.secureUrl}
                      alt={adj.descripcion || "Adjunto"}
                      className="w-full h-48 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center rounded">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {canEdit && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleDelete(adj.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {adj.descripcion && (
                  <p className="text-sm text-muted-foreground mt-2">{adj.descripcion}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(adj.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

