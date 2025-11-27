"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Download, X, Loader2, FileText, History } from "lucide-react"
import Image from "next/image"
import type { Attachment } from "@/lib/types/patient"
import { getAttachmentTypeLabel, getConsentTypeLabel } from "@/lib/api/attachments-api"
import { downloadAttachment } from "@/lib/utils/attachment-download"
import { AttachmentAuditHistory } from "./AttachmentAuditHistory"

interface AttachmentPreviewModalProps {
  attachment: Attachment
  open: boolean
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  currentIndex: number
  totalCount: number
  canDownload: boolean
}

// Check if attachment is an image
const isImageType = (type: Attachment["type"], mimeType: string): boolean => {
  return (
    type === "XRAY" ||
    type === "INTRAORAL_PHOTO" ||
    type === "EXTRAORAL_PHOTO" ||
    type === "IMAGE" ||
    mimeType.startsWith("image/")
  )
}

// Check if attachment is a PDF
const isPDFType = (type: Attachment["type"], mimeType: string): boolean => {
  return type === "PDF" || mimeType === "application/pdf"
}

export function AttachmentPreviewModal({
  attachment,
  open,
  onClose,
  onPrevious,
  onNext,
  currentIndex,
  totalCount,
  canDownload,
}: AttachmentPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [auditHistoryOpen, setAuditHistoryOpen] = useState(false)

  // Check if this is a consent document
  const isConsent = attachment.source === "consentimiento"
  const consentMeta = attachment.consentimientoMetadata

  // Reset image error when attachment changes
  useEffect(() => {
    setImageError(false)
  }, [attachment.id])

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && onPrevious) {
        onPrevious()
      } else if (e.key === "ArrowRight" && onNext) {
        onNext()
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onPrevious, onNext, onClose])

  const handleDownload = async () => {
    if (!canDownload) return

    try {
      setIsDownloading(true)
      await downloadAttachment(attachment)
    } catch (error) {
      console.error("Error downloading attachment:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Generate proxy URL for authenticated images
  const getImageUrl = () => {
    if (attachment.secureUrl && attachment.secureUrl.includes("/api/adjuntos/")) {
      return attachment.secureUrl
    }
    // For authenticated images, use proxy endpoint
    if (attachment.secureUrl && !attachment.secureUrl.startsWith("http")) {
      return `/api/adjuntos/adjunto-${attachment.id}/image`
    }
    return attachment.secureUrl
  }

  // Generate PDF URL
  const getPDFUrl = () => {
    if (attachment.secureUrl && attachment.secureUrl.includes("/api/adjuntos/")) {
      return attachment.secureUrl
    }
    return `/api/adjuntos/adjunto-${attachment.id}/image`
  }

  const isImage = isImageType(attachment.type, attachment.mimeType)
  const isPDF = isPDFType(attachment.type, attachment.mimeType)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{attachment.fileName}</DialogTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isConsent && consentMeta ? (
                  <>
                    <Badge variant="default" className="bg-blue-600">
                      Consentimiento: {getConsentTypeLabel(consentMeta.tipo)}
                    </Badge>
                    <Badge 
                      variant={consentMeta.vigente ? "default" : "destructive"} 
                      className={consentMeta.vigente ? "bg-green-600" : ""}
                    >
                      {consentMeta.vigente ? "Vigente" : "Vencido"}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary">{getAttachmentTypeLabel(attachment.type)}</Badge>
                )}
                {attachment.description && (
                  <span className="text-sm text-muted-foreground truncate">{attachment.description}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Audit History Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAuditHistoryOpen(true)}
                title="Ver historial de auditoría"
              >
                <History className="h-4 w-4 mr-2" />
                Historial
              </Button>
              {canDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {isImage && !imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {getImageUrl().includes("/api/adjuntos/") ? (
                // Use regular img tag for proxy URLs
                <img
                  src={getImageUrl()}
                  alt={attachment.description || attachment.fileName}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Image
                  src={getImageUrl()}
                  alt={attachment.description || attachment.fileName}
                  width={attachment.width || 1200}
                  height={attachment.height || 800}
                  className="max-w-full max-h-full object-contain"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          ) : isPDF ? (
            <div className="w-full h-full">
              <iframe
                src={getPDFUrl()}
                className="w-full h-full border-0"
                title={attachment.fileName}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Vista previa no disponible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este tipo de archivo no se puede previsualizar
                  </p>
                </div>
                {canDownload && (
                  <Button onClick={handleDownload} disabled={isDownloading}>
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Descargando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar archivo
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation arrows */}
          {(onPrevious || onNext) && (
            <>
              {onPrevious && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                  onClick={onPrevious}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              {onNext && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                  onClick={onNext}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Footer with navigation info */}
        {(onPrevious || onNext) && (
          <div className="px-6 py-3 border-t bg-muted/50">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {currentIndex + 1} de {totalCount}
              </span>
              <div className="flex items-center gap-2">
                {onPrevious && (
                  <Button variant="ghost" size="sm" onClick={onPrevious}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
                {onNext && (
                  <Button variant="ghost" size="sm" onClick={onNext}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Audit History Drawer */}
      <AttachmentAuditHistory
        attachmentId={attachment.id}
        open={auditHistoryOpen}
        onClose={() => setAuditHistoryOpen(false)}
      />
    </Dialog>
  )
}

