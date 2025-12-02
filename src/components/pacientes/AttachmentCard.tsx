"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Clock,
  User,
  Trash2,
  Loader2,
  ScanLine,
  Camera,
  CameraOff,
  FileType,
  TestTube,
  MoreHorizontal,
  FileCheck,
  CalendarCheck,
} from "lucide-react"
import Image from "next/image"
import { formatDate } from "@/lib/utils/patient-helpers"
import { formatFileSize } from "@/lib/validation/file-validation"
import type { Attachment } from "@/lib/types/patient"
import { getAttachmentTypeLabel, getConsentTypeLabel } from "@/lib/api/attachments-api"
import { useDeleteAttachment } from "@/hooks/useAttachments"
import { downloadAttachment } from "@/lib/utils/attachment-download"
import { toast } from "sonner"
import Link from "next/link"

interface AttachmentCardProps {
  attachment: Attachment
  onPreview: (attachment: Attachment) => void
  canDelete: boolean
  pacienteId: string
}

// Get icon for attachment type
const getAttachmentIcon = (type: Attachment["type"]) => {
  const icons: Record<Attachment["type"], typeof FileText> = {
    XRAY: ScanLine,
    INTRAORAL_PHOTO: Camera,
    EXTRAORAL_PHOTO: CameraOff,
    IMAGE: ImageIcon,
    DOCUMENT: FileText,
    PDF: FileType,
    LAB_REPORT: TestTube,
    OTHER: MoreHorizontal,
  }
  return icons[type] || FileText
}

// Check if attachment is an image that can be previewed
const isImageType = (type: Attachment["type"], mimeType: string): boolean => {
  return (
    type === "XRAY" ||
    type === "INTRAORAL_PHOTO" ||
    type === "EXTRAORAL_PHOTO" ||
    type === "IMAGE" ||
    mimeType.startsWith("image/")
  )
}

// Check if attachment is a PDF that can be previewed
const isPDFType = (type: Attachment["type"], mimeType: string): boolean => {
  return type === "PDF" || mimeType === "application/pdf"
}

// Check if attachment can be previewed
const canPreview = (attachment: Attachment): boolean => {
  return isImageType(attachment.type, attachment.mimeType) || isPDFType(attachment.type, attachment.mimeType)
}

export function AttachmentCard({ attachment, onPreview, canDelete, pacienteId }: AttachmentCardProps) {
  const [imageError, setImageError] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const deleteMutation = useDeleteAttachment(pacienteId)

  // Check if this is a consent document
  const isConsent = attachment.source === "consentimiento"
  const consentMeta = attachment.consentimientoMetadata

  // Use FileCheck icon for consents, otherwise get type-specific icon
  const Icon = isConsent ? FileCheck : getAttachmentIcon(attachment.type)
  const canPreviewAttachment = canPreview(attachment)

  // Generate proxy URL for authenticated images
  const getImageUrl = () => {
    if (attachment.thumbnailUrl) {
      return attachment.thumbnailUrl
    }
    if (attachment.secureUrl && attachment.secureUrl.includes("/api/adjuntos/")) {
      return attachment.secureUrl
    }
    // For authenticated images, use proxy endpoint
    // attachment.id already contains the prefix (e.g., "adjunto-123" or "consentimiento-456")
    if (attachment.secureUrl && !attachment.secureUrl.startsWith("http")) {
      return `/api/adjuntos/${attachment.id}/image?w=400&h=300&crop=fill`
    }
    return attachment.secureUrl
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Está seguro de eliminar este adjunto? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      setIsDeleting(true)
      await deleteMutation.mutateAsync(attachment.id)
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast.error("Error al eliminar adjunto")
    } finally {
      setIsDeleting(false)
    }
  }

  const handlePreview = () => {
    if (canPreviewAttachment) {
      onPreview(attachment)
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setIsDownloading(true)
      await downloadAttachment(attachment)
    } catch (error) {
      console.error("Error downloading attachment:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Context badge
  const getContextBadge = () => {
    if (!attachment.context) return null

    if (attachment.context.type === "consultation" && attachment.context.info?.consultaId) {
      return (
        <Badge variant="outline" className="text-xs">
          <Link
            href={`/agenda/citas/${attachment.context.info.consultaId}/consulta`}
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            Consulta #{attachment.context.info.consultaId}
          </Link>
        </Badge>
      )
    }

    if (attachment.context.type === "procedure") {
      return (
        <Badge variant="outline" className="text-xs">
          Procedimiento
        </Badge>
      )
    }

    return null
  }

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer group"
      onClick={handlePreview}
    >
      <CardContent className="pt-6">
        <div className="relative">
          {/* Thumbnail/Preview */}
          {(() => {
            const imageUrl = getImageUrl()
            return isImageType(attachment.type, attachment.mimeType) && !imageError && imageUrl ? (
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
                <Image
                  src={imageUrl}
                  alt={attachment.description || attachment.fileName}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={imageUrl.includes("/api/adjuntos/")}
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center rounded-lg">
                <Icon className="h-12 w-12 text-muted-foreground" />
              </div>
            )
          })()}

          {/* Action buttons on hover */}
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canPreviewAttachment && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePreview()
                }}
                title="Ver"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {/* Download button */}
            <Button
              variant="secondary"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDownload}
              disabled={isDownloading}
              title="Descargar"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            {/* Don't show delete button for consentimientos - they have their own management */}
            {canDelete && !isConsent && (
              <Button
                variant="destructive"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Eliminar"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Consent indicator badge */}
          {isConsent && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="text-xs bg-blue-600/90">
                Consentimiento
              </Badge>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between flex-wrap gap-1">
            {isConsent && consentMeta ? (
              // Consent-specific badges - all consents are now per-appointment
              <>
                <Badge variant="default" className="text-xs bg-blue-600">
                  <FileCheck className="h-3 w-3 mr-1" />
                  {getConsentTypeLabel(consentMeta.tipo)}
                </Badge>
                <Badge variant="default" className="text-xs bg-purple-600">
                  <CalendarCheck className="h-3 w-3 mr-1" />
                  Por Cita
                </Badge>
              </>
            ) : (
              // Regular attachment badges
              <>
                <Badge variant="secondary" className="text-xs">
                  {getAttachmentTypeLabel(attachment.type)}
                </Badge>
                {attachment.format && (
                  <span className="text-xs text-muted-foreground">{attachment.format.toUpperCase()}</span>
                )}
              </>
            )}
          </div>

          {getContextBadge()}

          {/* For consents, show firma date */}
          {isConsent && consentMeta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarCheck className="h-3 w-3" />
              <span>Firmado: {formatDate(consentMeta.firmadoEn, false)}</span>
            </div>
          )}

          {/* For consents, show it's only valid for that specific appointment */}
          {isConsent && consentMeta && (
            <div className="flex items-center gap-2 text-xs text-purple-600">
              <CalendarCheck className="h-3 w-3" />
              <span>Válido solo para la cita #{consentMeta.citaId || "asociada"}</span>
            </div>
          )}

          {attachment.description && (
            <p className="text-sm font-medium line-clamp-2">{attachment.description}</p>
          )}

          <p className="text-xs text-muted-foreground truncate" title={attachment.fileName}>
            {attachment.fileName}
          </p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3" />
            <span>{formatDate(attachment.uploadedAt, true)}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{attachment.uploadedBy.fullName || `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`}</span>
          </div>

          {attachment.fileSize > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

