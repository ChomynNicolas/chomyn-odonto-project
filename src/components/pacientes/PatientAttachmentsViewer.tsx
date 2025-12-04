"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Filter, Image as ImageIcon, Loader2, FileCheck } from "lucide-react"
import { useAttachments } from "@/hooks/useAttachments"
import { AttachmentCard } from "./AttachmentCard"
import { AttachmentPreviewModal } from "./AttachmentPreviewModal"
import type { Attachment, AttachmentFilterType } from "@/lib/types/patient"
import type { RBACPermissions } from "@/lib/utils/rbac"
import { getAttachmentTypeLabel, getConsentTypeLabel } from "@/lib/api/attachments-api"
import Link from "next/link"

interface PatientAttachmentsViewerProps {
  patientId: number
  patientName: string
  permissions: RBACPermissions
  userRole: "ADMIN" | "ODONT" | "RECEP"
}

export function PatientAttachmentsViewer({
  patientId,
  patientName,
  permissions,
}: PatientAttachmentsViewerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<AttachmentFilterType>("all")
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Fetch attachments with infinite scroll
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAttachments({
    pacienteId: String(patientId),
    tipo: filterType,
    search: searchQuery.trim() || undefined,
    limit: 20,
  })

  // Flatten all pages into a single array
  const attachments = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.adjuntos)
  }, [data])

  // Get type counts from first page
  const typeCounts = useMemo(() => {
    if (!data?.pages?.[0]) {
      return {
        xrays: 0,
        photos: 0,
        documents: 0,
        other: 0,
        consentimientos: 0,
      }
    }
    return data.pages[0].porTipo
  }, [data])

  // Filter attachments by search query (client-side for instant feedback)
  const filteredAttachments = useMemo(() => {
    if (!searchQuery.trim()) return attachments
    const query = searchQuery.toLowerCase()
    return attachments.filter(
      (a) =>
        a.fileName.toLowerCase().includes(query) ||
        a.description?.toLowerCase().includes(query) ||
        getAttachmentTypeLabel(a.type).toLowerCase().includes(query) ||
        a.uploadedBy.fullName?.toLowerCase().includes(query) ||
        // Also search in consent type label if this is a consent document
        (a.source === "consentimiento" && a.consentimientoMetadata?.tipo && 
          getConsentTypeLabel(a.consentimientoMetadata.tipo).toLowerCase().includes(query))
    )
  }, [attachments, searchQuery])

  // Get current attachment index for navigation
  const currentIndex = useMemo(() => {
    if (!selectedAttachment) return -1
    return filteredAttachments.findIndex((a) => a.id === selectedAttachment.id)
  }, [selectedAttachment, filteredAttachments])

  const handlePreview = (attachment: Attachment) => {
    setSelectedAttachment(attachment)
    setPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setPreviewOpen(false)
    setSelectedAttachment(null)
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedAttachment(filteredAttachments[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (currentIndex < filteredAttachments.length - 1) {
      setSelectedAttachment(filteredAttachments[currentIndex + 1])
    }
    // Load more if needed
    if (currentIndex === filteredAttachments.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  // Helper to get count for a filter type
  const getTypeCount = (value: AttachmentFilterType): number | null => {
    if (value === "all") return null
    if (value === "CONSENT") return typeCounts.consentimientos
    if (value === "XRAY") return typeCounts.xrays
    if (value === "INTRAORAL_PHOTO" || value === "EXTRAORAL_PHOTO" || value === "IMAGE") return typeCounts.photos
    if (value === "PDF" || value === "DOCUMENT" || value === "LAB_REPORT") return typeCounts.documents
    return typeCounts.other
  }

  // Attachment type options (including CONSENT for consentimientos)
  const typeOptions: Array<{ value: AttachmentFilterType; label: string; icon?: React.ReactNode }> = [
    { value: "all", label: "Todos" },
    { value: "CONSENT", label: "Consentimientos", icon: <FileCheck className="h-4 w-4 mr-1 inline-block" /> },
    { value: "XRAY", label: "Radiografías" },
    { value: "INTRAORAL_PHOTO", label: "Fotos Intraorales" },
    { value: "EXTRAORAL_PHOTO", label: "Fotos Extraorales" },
    { value: "IMAGE", label: "Imágenes" },
    { value: "PDF", label: "PDFs" },
    { value: "DOCUMENT", label: "Documentos" },
    { value: "LAB_REPORT", label: "Informes de Laboratorio" },
    { value: "OTHER", label: "Otros" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href={`/pacientes/${patientId}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Adjuntos del Paciente</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {patientName} • {attachments.length} {attachments.length === 1 ? "archivo" : "archivos"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, descripción, tipo o autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as AttachmentFilterType)}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => {
              const count = getTypeCount(option.value)
              return (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center">
                    {option.icon}
                    {option.label}
                    {count !== null && (
                      <Badge variant="secondary" className="ml-2">
                        {count}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading && attachments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando adjuntos...
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-sm text-destructive mb-4">
                Error al cargar adjuntos: {error instanceof Error ? error.message : "Error desconocido"}
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredAttachments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground py-12">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">No se encontraron adjuntos</p>
            <p className="text-sm mt-1">
              {searchQuery || filterType !== "all"
                ? "Intente con otros términos de búsqueda o filtros"
                : "Este paciente no tiene adjuntos registrados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id}
                attachment={attachment}
                onPreview={handlePreview}
                canDelete={permissions.canDeleteAttachments}
                pacienteId={String(patientId)}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "Cargar más"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      {selectedAttachment && (
        <AttachmentPreviewModal
          attachment={selectedAttachment}
          open={previewOpen}
          onClose={handleClosePreview}
          onPrevious={currentIndex > 0 ? handlePrevious : undefined}
          onNext={currentIndex < filteredAttachments.length - 1 ? handleNext : undefined}
          currentIndex={currentIndex}
          totalCount={filteredAttachments.length}
          canDownload={permissions.canViewAttachments}
        />
      )}
    </div>
  )
}

