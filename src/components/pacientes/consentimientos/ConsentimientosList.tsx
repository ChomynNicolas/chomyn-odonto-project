"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { FileText, Upload, Download, Eye, Shield, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils/patient-helpers"
import { isConsentimientoVigente } from "@/lib/utils/consent-helpers"
import type { UserRole } from "@/lib/types/patient"
import { getPermissions } from "@/lib/utils/rbac"
import { UploadConsentDialog } from "./UploadConsentDialog"

interface Consentimiento {
  id: number
  tipo: string
  firmadoEn: Date
  vigenteHasta: Date
  activo: boolean
  archivo: {
    secureUrl: string
    format: string
    bytes: number
  }
  responsable: {
    nombre: string
    tipoVinculo: string
  }
  registradoPor: {
    nombre: string
  }
  observaciones?: string
}

interface ConsentimientosListProps {
  pacienteId: number
  consentimientos: Consentimiento[]
  userRole: UserRole
  onRefresh: () => void
}

export function ConsentimientosList({ pacienteId, consentimientos, userRole, onRefresh }: ConsentimientosListProps) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedConsent, setSelectedConsent] = useState<Consentimiento | null>(null)
  const permissions = getPermissions(userRole)

  const consentimientosActivos = consentimientos.filter((c) => c.activo)
  const consentimientosVigentes = consentimientosActivos.filter((c) => isConsentimientoVigente(c.vigenteHasta))

  const openViewer = (consent: Consentimiento) => {
    if (!permissions.canViewConsentDetails) {
      return
    }
    setSelectedConsent(consent)
    setViewerOpen(true)
  }

  const getVinculoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      PADRE: "Padre",
      MADRE: "Madre",
      TUTOR: "Tutor",
      AUTORIZADO: "Autorizado",
    }
    return labels[tipo] || tipo
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Consentimientos Informados
              </CardTitle>
              <CardDescription>
                {consentimientosVigentes.length > 0
                  ? `${consentimientosVigentes.length} consentimiento(s) vigente(s)`
                  : "No hay consentimientos vigentes"}
              </CardDescription>
            </div>
            {permissions.canUploadConsentimientos && (
              <Button onClick={() => setUploadOpen(true)} size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Subir consentimiento
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {consentimientosActivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium">No hay consentimientos registrados</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {permissions.canUploadConsentimientos
                  ? "Sube un consentimiento firmado para habilitar la atención de menores"
                  : "Los consentimientos serán agregados por el personal autorizado"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {consentimientosActivos.map((consent) => {
                const vigente = isConsentimientoVigente(consent.vigenteHasta)
                return (
                  <div
                    key={consent.id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Consentimiento de atención menor</p>
                        <Badge variant={vigente ? "default" : "secondary"}>{vigente ? "Vigente" : "Vencido"}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Firmado por: {consent.responsable.nombre} ({getVinculoLabel(consent.responsable.tipoVinculo)})
                        </p>
                        <p>
                          Válido hasta: {formatDate(consent.vigenteHasta)} • Firmado: {formatDate(consent.firmadoEn)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {permissions.canViewConsentDetails ? (
                        <Button size="sm" variant="outline" onClick={() => openViewer(consent)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled title="Sin permisos para ver">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {permissions.canDownloadConsentimientos && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={consent.archivo.secureUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload dialog */}
      <UploadConsentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        pacienteId={pacienteId}
        onSuccess={() => {
          setUploadOpen(false)
          onRefresh()
        }}
      />

      {/* Viewer dialog */}
      {selectedConsent && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl">
            <ConsentimientoViewer consent={selectedConsent} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function ConsentimientoViewer({ consent }: { consent: Consentimiento }) {
  const isPDF = consent.archivo.format === "pdf"

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Consentimiento de atención menor</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Responsable</p>
            <p className="font-medium">{consent.responsable.nombre}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tipo de vínculo</p>
            <p className="font-medium">{consent.responsable.tipoVinculo}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha de firma</p>
            <p className="font-medium">{formatDate(consent.firmadoEn, true)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vigente hasta</p>
            <p className="font-medium">{formatDate(consent.vigenteHasta, true)}</p>
          </div>
        </div>
      </div>

      {/* Document preview */}
      <div className="h-[60vh] w-full overflow-hidden rounded-lg border bg-muted/30">
        {isPDF ? (
          <iframe src={consent.archivo.secureUrl} className="h-full w-full" title="Consentimiento" />
        ) : (
          <img
            src={consent.archivo.secureUrl || "/placeholder.svg"}
            alt="Consentimiento"
            className="h-full w-full object-contain"
          />
        )}
      </div>

      {consent.observaciones && (
        <div>
          <p className="text-sm font-medium">Observaciones</p>
          <p className="mt-1 text-sm text-muted-foreground">{consent.observaciones}</p>
        </div>
      )}
    </div>
  )
}
