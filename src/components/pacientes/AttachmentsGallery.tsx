"use client"

import { useState, useCallback } from "react"
import type { Attachment, UserRole } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"
import { Upload, FileText, ImageIcon, X, ChevronLeft, ChevronRight, Download } from "lucide-react"
import Image from "next/image"
import { getPermissions } from "@/lib/utils/rbac"

interface AttachmentsGalleryProps {
  attachments: Attachment[]
  userRole: UserRole
  onUpload?: () => void
}

export function AttachmentsGallery({ attachments, userRole, onUpload }: AttachmentsGalleryProps) {
  const [filter, setFilter] = useState<"all" | Attachment["type"]>("all")
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const permissions = getPermissions(userRole)

  // Sort by upload date (most recent first)
  const sortedAttachments = [...attachments].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )

  // Filter attachments
  const filteredAttachments = filter === "all" ? sortedAttachments : sortedAttachments.filter((a) => a.type === filter)

  // Take first 12 for preview
  const displayedAttachments = filteredAttachments.slice(0, 12)

  const openViewer = (index: number) => {
    setCurrentIndex(index)
    setViewerOpen(true)
  }

  const navigateViewer = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredAttachments.length - 1))
      } else {
        setCurrentIndex((prev) => (prev < filteredAttachments.length - 1 ? prev + 1 : 0))
      }
    },
    [filteredAttachments.length],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!viewerOpen) return
      if (e.key === "ArrowLeft") navigateViewer("prev")
      if (e.key === "ArrowRight") navigateViewer("next")
      if (e.key === "Escape") setViewerOpen(false)
    },
    [viewerOpen, navigateViewer],
  )

  // Add keyboard listener
  useState(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown as any)
      return () => window.removeEventListener("keydown", handleKeyDown as any)
    }
  })

  const getTypeLabel = (type: Attachment["type"]) => {
    const labels: Record<Attachment["type"], string> = {
      XRAY: "Radiografía",
      PHOTO: "Foto",
      DOCUMENT: "Documento",
      CONSENT: "Consentimiento",
      LAB_RESULT: "Resultado Lab",
      OTHER: "Otro",
    }
    return labels[type]
  }

  const getTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return ImageIcon
    return FileText
  }

  const isImage = (mimeType: string) => mimeType.startsWith("image/")

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Adjuntos ({attachments.length})</CardTitle>
          {permissions.canUploadAttachments && (
            <Button onClick={onUpload} size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Subir
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="XRAY">Rayos X</TabsTrigger>
              <TabsTrigger value="PHOTO">Fotos</TabsTrigger>
              <TabsTrigger value="DOCUMENT">Docs</TabsTrigger>
              <TabsTrigger value="CONSENT" className="hidden lg:block">
                Consentimientos
              </TabsTrigger>
              <TabsTrigger value="LAB_RESULT" className="hidden lg:block">
                Lab
              </TabsTrigger>
              <TabsTrigger value="OTHER" className="hidden lg:block">
                Otros
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Gallery grid */}
          {displayedAttachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Upload className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No hay adjuntos {filter !== "all" && `de tipo ${getTypeLabel(filter as Attachment["type"])}`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {displayedAttachments.map((attachment, index) => {
                const Icon = getTypeIcon(attachment.mimeType)
                return (
                  <button
                    key={attachment.id}
                    onClick={() => openViewer(index)}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isImage(attachment.mimeType) && attachment.thumbnailUrl ? (
                      <Image
                        src={attachment.thumbnailUrl || "/placeholder.svg"}
                        alt={attachment.fileName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 text-left opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-xs font-medium text-white">{attachment.fileName}</p>
                      <p className="text-xs text-white/80">{formatRelativeTime(attachment.uploadedAt)}</p>
                    </div>
                    <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
                      {getTypeLabel(attachment.type)}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}

          {filteredAttachments.length > 12 && (
            <p className="text-center text-sm text-muted-foreground">
              Mostrando 12 de {filteredAttachments.length} adjuntos
            </p>
          )}
        </CardContent>
      </Card>

      {/* Viewer dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl p-0">
          {filteredAttachments[currentIndex] && (
            <AttachmentViewer
              attachment={filteredAttachments[currentIndex]}
              onClose={() => setViewerOpen(false)}
              onPrevious={() => navigateViewer("prev")}
              onNext={() => navigateViewer("next")}
              hasPrevious={filteredAttachments.length > 1}
              hasNext={filteredAttachments.length > 1}
              currentIndex={currentIndex + 1}
              totalCount={filteredAttachments.length}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

interface AttachmentViewerProps {
  attachment: Attachment
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
  currentIndex: number
  totalCount: number
}

function AttachmentViewer({
  attachment,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalCount,
}: AttachmentViewerProps) {
  const isImage = attachment.mimeType.startsWith("image/")
  const isPDF = attachment.mimeType === "application/pdf"

  const getTypeLabel = (type: Attachment["type"]) => {
    const labels: Record<Attachment["type"], string> = {
      XRAY: "Radiografía",
      PHOTO: "Foto",
      DOCUMENT: "Documento",
      CONSENT: "Consentimiento",
      LAB_RESULT: "Resultado Lab",
      OTHER: "Otro",
    }
    return labels[type]
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex h-[90vh] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex-1">
          <h3 className="font-semibold">{attachment.fileName}</h3>
          <p className="text-sm text-muted-foreground">
            {currentIndex} de {totalCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {attachment.secureUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={attachment.secureUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </a>
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 bg-muted/30">
        {isImage && attachment.secureUrl ? (
          <div className="relative h-full w-full">
            <Image
              src={attachment.secureUrl || "/placeholder.svg"}
              alt={attachment.fileName}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>
        ) : isPDF && attachment.secureUrl ? (
          <iframe src={attachment.secureUrl} className="h-full w-full" title={attachment.fileName} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Vista previa no disponible</p>
              {attachment.secureUrl && (
                <Button size="sm" variant="outline" className="mt-4 bg-transparent" asChild>
                  <a href={attachment.secureUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar archivo
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {hasPrevious && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-4 top-1/2 -translate-y-1/2"
            onClick={onPrevious}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        {hasNext && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-4 top-1/2 -translate-y-1/2"
            onClick={onNext}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Footer with metadata */}
      <div className="border-t p-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Tipo</p>
            <p className="font-medium">{getTypeLabel(attachment.type)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Tamaño</p>
            <p className="font-medium">{formatFileSize(attachment.fileSize)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Subido</p>
            <p className="font-medium">{formatDate(attachment.uploadedAt, true)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Por</p>
            <p className="font-medium">
              {attachment.uploadedBy.firstName} {attachment.uploadedBy.lastName}
            </p>
          </div>
        </div>
        {attachment.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Descripción</p>
            <p className="mt-1 text-sm">{attachment.description}</p>
          </div>
        )}
        <div className="mt-4 text-xs text-muted-foreground">
          Usa las flechas del teclado para navegar • Presiona Esc para cerrar
        </div>
      </div>
    </div>
  )
}
