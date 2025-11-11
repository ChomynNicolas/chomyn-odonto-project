"use client"

import { useState, useCallback, useEffect } from "react"
import type { Attachment, UserRole, AttachmentType } from "@/lib/types/patient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"
import {
  Upload,
  FileText,
  ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Trash2,
  Loader2,
  File,
  FileImage,
  ScanLine,
  Camera,
  CameraOff,
  FolderOpen,
  FileType,
  TestTube,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Shield,
} from "lucide-react"
import Image from "next/image"
import { getPermissions } from "@/lib/utils/rbac"
import { getAttachmentTypeLabel, getAttachmentTypeGroup } from "@/lib/api/attachments-api"
import { useDeleteAttachment } from "@/hooks/useAttachments"
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { InfiniteScrollTrigger } from "./InfiniteScrollTrigger"

// Check if URL is from our proxy endpoint (needs regular img tag, not Next.js Image)
const isProxyUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const urlObj = new URL(url)
      return urlObj.pathname.includes("/api/adjuntos/")
    }
    if (url.startsWith("/api/adjuntos/")) {
      return true
    }
    return url.includes("/api/adjuntos/")
  } catch {
    return url.includes("/api/adjuntos/")
  }
}

// Attachment type icons mapping
const getAttachmentTypeIcon = (type: AttachmentType) => {
  const icons: Record<AttachmentType, typeof FileText> = {
    XRAY: ScanLine,
    INTRAORAL_PHOTO: Camera,
    EXTRAORAL_PHOTO: CameraOff,
    IMAGE: FileImage,
    DOCUMENT: FileText,
    PDF: FileType,
    LAB_REPORT: TestTube,
    OTHER: MoreHorizontal,
  }
  return icons[type] || FileText
}

// Attachment type colors
const getAttachmentTypeColor = (type: AttachmentType): string => {
  const colors: Record<AttachmentType, string> = {
    XRAY: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300",
    INTRAORAL_PHOTO: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300",
    EXTRAORAL_PHOTO: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-300",
    IMAGE: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-300",
    DOCUMENT: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-300",
    PDF: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-300",
    LAB_REPORT: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-300",
    OTHER: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-300",
  }
  return colors[type] || colors.OTHER
}

// Category groups for tabs
type AttachmentCategory = "all" | "images" | "documents" | "consentimientos" | "other"
const categoryLabels: Record<AttachmentCategory, string> = {
  all: "Todos",
  images: "Imágenes",
  documents: "Documentos",
  consentimientos: "Consentimientos",
  other: "Otros",
}

const getCategoryFromType = (type: AttachmentType, source?: "adjunto" | "consentimiento"): AttachmentCategory => {
  // Consentimientos always go to consentimientos category
  if (source === "consentimiento") return "consentimientos"
  
  const group = getAttachmentTypeGroup(type)
  if (group === "xrays" || group === "photos") return "images"
  if (group === "documents") return "documents"
  return "other"
}

const getTypesInCategory = (category: AttachmentCategory): AttachmentType[] => {
  if (category === "images") return ["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE"]
  if (category === "documents") return ["DOCUMENT", "PDF", "LAB_REPORT"]
  if (category === "consentimientos") return [] // Consentimientos are filtered by source, not type
  if (category === "other") return ["OTHER"]
  return []
}

interface AttachmentsGalleryProps {
  attachments: Attachment[]
  userRole: UserRole
  pacienteId: string
  onUpload?: () => void
  onRefresh?: () => void
  showPagination?: boolean
  page?: number
  limit?: number
  total?: number
  onPageChange?: (page: number) => void
  onFilterChange?: (filter: "all" | AttachmentType) => void
  onSearchChange?: (search: string) => void
  currentFilter?: "all" | AttachmentType
  currentSearch?: string
  typeCounts?: {
    xrays: number
    photos: number
    documents: number
    other: number
    consentimientos?: number
  }
  // Infinite scroll props
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

export function AttachmentsGallery({
  attachments,
  userRole,
  pacienteId,
  onUpload,
  onRefresh,
  showPagination = false,
  page = 1,
  limit = 20,
  total = 0,
  onPageChange,
  onFilterChange,
  onSearchChange,
  currentFilter,
  currentSearch,
  typeCounts: serverTypeCounts,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: AttachmentsGalleryProps) {
  const [category, setCategory] = useState<AttachmentCategory>("all")
  const [localTypeFilter, setLocalTypeFilter] = useState<"all" | AttachmentType | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState(currentSearch || "")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null)
  const permissions = getPermissions(userRole)
  const deleteAttachment = useDeleteAttachment(pacienteId)
  
  // Determine the effective filter: use localTypeFilter when in a specific category, otherwise use currentFilter
  const effectiveFilter = (() => {
    // If we're in a specific category (not "all" and not "consentimientos"), use local filter for type
    if (category !== "all" && category !== "consentimientos" && localTypeFilter !== null) {
      return localTypeFilter
    }
    // Otherwise, use the server filter (currentFilter)
    return currentFilter || "all"
  })()

  // Don't auto-update category based on filter - let user control category selection
  // This allows users to navigate between categories and types independently
  // Category is controlled by the Tabs component, not by the filter

  // Update search when prop changes
  useEffect(() => {
    if (currentSearch !== undefined) {
      setSearchQuery(currentSearch)
    }
  }, [currentSearch])

  // Handle category change
  const handleCategoryChange = (newCategory: AttachmentCategory) => {
    setCategory(newCategory)
    
    // Reset local type filter when changing categories
    setLocalTypeFilter("all")
    
    // When changing to/from "all" category, update server filter
    // When in a specific category, we'll do client-side filtering
    if (newCategory === "all") {
      // For "all" category, use server-side filtering
      onFilterChange?.("all")
    } else if (newCategory === "consentimientos") {
      // For consentimientos, set server filter to "all" (filtered by source on client)
      onFilterChange?.("all")
    } else {
      // For other categories (images, documents, other), fetch all items in category from server
      // We'll filter by type on the client side
      onFilterChange?.("all")
    }
    
    // Reset to first page when category changes
    if (onPageChange) {
      onPageChange(1)
    }
  }
  
  // Handle type filter change within a category
  const handleTypeFilterChange = (type: "all" | AttachmentType) => {
    // If we're in a specific category, use local filter (client-side)
    if (category !== "all" && category !== "consentimientos") {
      setLocalTypeFilter(type)
    } else {
      // If we're in "all" category, use server filter
      onFilterChange?.(type)
    }
  }

  // Handle search change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange?.(searchQuery)
      if (onPageChange && searchQuery !== currentSearch) {
        onPageChange(1)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, onSearchChange, onPageChange, currentSearch])

  // Filter attachments - apply category, type, and search filters
  // When server-side filtering is enabled (onFilterChange exists), attachments are pre-filtered by API
  // But we still need to apply category filter on client for consentimientos and category separation
  const filteredAttachments = (() => {
    // First, apply category filter
    let categoryFiltered = attachments.filter((a) => {
      // Handle consentimientos category separately
      if (category === "consentimientos") {
        return a.source === "consentimiento"
      }
      
      // For non-all categories, exclude consentimientos (they have their own category)
      if (category !== "all" && a.source === "consentimiento") {
        return false
      }
      
      // If category is "all", show everything (except we handle consentimientos above)
      if (category === "all") {
        return true
      }
      
      // Otherwise, filter by category types
      return getTypesInCategory(category).includes(a.type)
    })
    
    // Apply type filter if a specific type is selected (not "all")
    // Use effectiveFilter which handles both server-side and client-side filtering
    if (effectiveFilter && effectiveFilter !== "all" && category !== "all" && category !== "consentimientos") {
      categoryFiltered = categoryFiltered.filter((a) => a.type === effectiveFilter)
    }
    
    // Then apply search filter if search query exists
    if (searchQuery) {
      categoryFiltered = categoryFiltered.filter((a) => {
        return (
          a.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })
    }
    
    return categoryFiltered
  })()

  // Sort by upload date (most recent first)
  const sortedAttachments = [...filteredAttachments].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )

  const openViewer = (index: number) => {
    setCurrentIndex(index)
    setViewerOpen(true)
  }

  const navigateViewer = useCallback(
    (direction: "prev" | "next") => {
      if (direction === "prev") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedAttachments.length - 1))
      } else {
        setCurrentIndex((prev) => (prev < sortedAttachments.length - 1 ? prev + 1 : 0))
      }
    },
    [sortedAttachments.length],
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewerOpen) return
      if (e.key === "ArrowLeft") navigateViewer("prev")
      if (e.key === "ArrowRight") navigateViewer("next")
      if (e.key === "Escape") setViewerOpen(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [viewerOpen, navigateViewer])

  const handleDelete = async () => {
    if (!attachmentToDelete) return

    try {
      await deleteAttachment.mutateAsync(attachmentToDelete.id)
      setDeleteDialogOpen(false)
      setAttachmentToDelete(null)
      onRefresh?.()
    } catch {
      // Error is handled by the hook
    }
  }

  const isImage = (mimeType: string) => mimeType.startsWith("image/")

  // Get attachment counts by category with accurate counting
  const getCategoryCounts = () => {
    if (serverTypeCounts) {
      return {
        all: total > 0 ? total : attachments.length,
        images: serverTypeCounts.xrays + serverTypeCounts.photos,
        documents: serverTypeCounts.documents,
        consentimientos: serverTypeCounts.consentimientos || 0,
        other: serverTypeCounts.other,
      }
    }

    // Calculate from current attachments
    const counts = {
      all: attachments.length,
      images: 0,
      documents: 0,
      consentimientos: 0,
      other: 0,
    }

    attachments.forEach((a) => {
      if (a.source === "consentimiento") {
        counts.consentimientos++
      } else {
        const cat = getCategoryFromType(a.type, a.source)
        if (cat === "images") counts.images++
        else if (cat === "documents") counts.documents++
        else if (cat === "other") counts.other++
      }
    })

    return counts
  }
  
  // Get type counts for subtabs - count all attachments in the category (not filtered by search)
  // This shows the total count of each type in the category, which is more useful for navigation
  const getTypeCountsInCategory = (cat: AttachmentCategory): Record<AttachmentType, number> => {
    const typeCounts: Record<string, number> = {}
    
    // Count from all attachments that belong to this category (excluding consentimientos)
    attachments
      .filter((a) => {
        // Exclude consentimientos from type counts in subtabs
        if (a.source === "consentimiento") return false
        
        // Only count attachments that belong to this category
        if (cat === "all") return true
        const categoryTypes = getTypesInCategory(cat)
        return categoryTypes.includes(a.type)
      })
      .forEach((a) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1
      })
    
    return typeCounts as Record<AttachmentType, number>
  }

  const categoryCounts = getCategoryCounts()
  const totalCount = total > 0 ? total : attachments.length

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b bg-muted/30 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Adjuntos del Paciente</CardTitle>
              <p className="text-sm text-muted-foreground">
                {totalCount} {totalCount === 1 ? "archivo" : "archivos"} en total
              </p>
            </div>
          </div>
          {permissions.canUploadAttachments && (
            <Button onClick={onUpload} size="sm" className="shrink-0">
              <Upload className="mr-2 h-4 w-4" />
              Subir Archivo
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-4"
            />
          </div>

          {/* Category tabs - improved responsive design with consentimientos */}
          <Tabs value={category} onValueChange={(v) => handleCategoryChange(v as AttachmentCategory)}>
            <ScrollArea className="w-full whitespace-nowrap">
              <TabsList className="inline-flex h-10 w-full justify-start gap-1 bg-muted/50 p-1">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <span className="whitespace-nowrap">{categoryLabels.all}</span>
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs font-medium">
                    {categoryCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <FileImage className="mr-1.5 h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{categoryLabels.images}</span>
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs font-medium">
                    {categoryCounts.images}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{categoryLabels.documents}</span>
                  <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1.5 text-xs font-medium">
                    {categoryCounts.documents}
                  </Badge>
                </TabsTrigger>
                {/* Always show consentimientos tab, but disable if no items */}
                <TabsTrigger
                  value="consentimientos"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  disabled={categoryCounts.consentimientos === 0}
                >
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{categoryLabels.consentimientos}</span>
                  <Badge 
                    variant={categoryCounts.consentimientos > 0 ? "secondary" : "outline"} 
                    className={cn(
                      "ml-2 h-5 min-w-[20px] px-1.5 text-xs font-medium",
                      categoryCounts.consentimientos === 0 && "opacity-50"
                    )}
                  >
                    {categoryCounts.consentimientos}
                  </Badge>
                </TabsTrigger>
                {/* Always show other tab, but disable if no items */}
                <TabsTrigger
                  value="other"
                  className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  disabled={categoryCounts.other === 0}
                >
                  <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">{categoryLabels.other}</span>
                  <Badge 
                    variant={categoryCounts.other > 0 ? "secondary" : "outline"} 
                    className={cn(
                      "ml-2 h-5 min-w-[20px] px-1.5 text-xs font-medium",
                      categoryCounts.other === 0 && "opacity-50"
                    )}
                  >
                    {categoryCounts.other}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </ScrollArea>

            {/* Sub-tabs for types within category - always show all types for navigation */}
            {category !== "all" && category !== "consentimientos" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Show "Todos" button to view all types in category */}
                <Button
                  variant={effectiveFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeFilterChange("all")}
                  className="h-8 text-xs"
                >
                  Todos
                  {(() => {
                    const totalInCategory = getTypesInCategory(category).reduce((sum, type) => {
                      const typeCounts = getTypeCountsInCategory(category)
                      return sum + (typeCounts[type] || 0)
                    }, 0)
                    return totalInCategory > 0 ? (
                      <Badge
                        variant={effectiveFilter === "all" ? "secondary" : "outline"}
                        className="ml-1.5 h-4 min-w-[20px] px-1.5 text-xs font-medium"
                      >
                        {totalInCategory}
                      </Badge>
                    ) : null
                  })()}
                </Button>
                
                {/* Show all types in category, even if count is 0 (for better UX) */}
                {getTypesInCategory(category).map((type) => {
                  const typeCounts = getTypeCountsInCategory(category)
                  const count = typeCounts[type] || 0
                  const isActive = effectiveFilter === type
                  
                  return (
                    <Button
                      key={type}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTypeFilterChange(type)}
                      className="h-8 text-xs"
                      disabled={count === 0 && !isActive}
                    >
                      {getAttachmentTypeLabel(type)}
                      <Badge
                        variant={isActive ? "secondary" : count > 0 ? "outline" : "secondary"}
                        className={cn(
                          "ml-1.5 h-4 min-w-[20px] px-1.5 text-xs font-medium",
                          count === 0 && !isActive && "opacity-50"
                        )}
                      >
                        {count}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            )}
            
            {/* Show message for consentimientos category */}
            {category === "consentimientos" && (
              <div className="mt-3 rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/20">
                <div className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Consentimientos Informados
                    </p>
                    <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                      Los consentimientos informados se muestran aquí. Estos documentos tienen información adicional
                      sobre firma, vigencia y responsable.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Tabs>

          {/* Gallery grid - improved responsive design */}
          {sortedAttachments.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">
                {searchQuery
                  ? "No se encontraron archivos"
                  : category !== "all"
                    ? `No hay archivos en la categoría "${categoryLabels[category]}"`
                    : "No hay archivos adjuntos"}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? "Intenta con otros términos de búsqueda"
                  : permissions.canUploadAttachments
                    ? "Comienza subiendo tu primer archivo"
                    : "No hay archivos disponibles"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {sortedAttachments.map((attachment, index) => {
                const TypeIcon = getAttachmentTypeIcon(attachment.type)
                const typeColor = getAttachmentTypeColor(attachment.type)
                const attachmentIsProxyUrl = isProxyUrl(attachment.thumbnailUrl)

                return (
                  <div
                    key={attachment.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-background transition-all hover:border-primary hover:shadow-md"
                  >
                    <button
                      onClick={() => openViewer(index)}
                      className="absolute inset-0 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`Ver ${attachment.fileName}`}
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-1 overflow-hidden bg-muted/30">
                        {isImage(attachment.mimeType) && attachment.thumbnailUrl ? (
                          attachmentIsProxyUrl ? (
                            <img
                              src={attachment.thumbnailUrl}
                              alt={attachment.fileName}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />
                          ) : (
                            <Image
                              src={attachment.thumbnailUrl || "/placeholder.svg"}
                              alt={attachment.fileName}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-110"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                            />
                          )
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                            <TypeIcon className="h-8 w-8 text-muted-foreground/60" />
                          </div>
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>

                      {/* Info overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-xs font-medium text-white drop-shadow-lg">
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-white/80 drop-shadow-md">
                          {formatRelativeTime(attachment.uploadedAt)}
                        </p>
                      </div>

                      {/* Badge */}
                      <div className="absolute left-2 top-2">
                        <Badge
                          variant="secondary"
                          className={cn("text-xs font-medium shadow-sm", typeColor)}
                        >
                          <TypeIcon className="mr-1 h-3 w-3" />
                          {getAttachmentTypeLabel(attachment.type)}
                        </Badge>
                      </div>

                      {/* Source badges */}
                      <div className="absolute right-2 top-2 flex flex-col gap-1">
                        {attachment.source === "consentimiento" && (
                          <Badge
                            variant="outline"
                            className="h-5 bg-blue-500/90 text-xs text-white backdrop-blur-sm"
                          >
                            Consentimiento
                          </Badge>
                        )}
                        {attachment.context && attachment.context.type !== "patient" && (
                          <Badge variant="outline" className="h-5 bg-background/90 text-xs backdrop-blur-sm">
                            {attachment.context.type === "consultation" ? "Consulta" : "Procedimiento"}
                          </Badge>
                        )}
                      </div>

                      {/* Delete button */}
                      {permissions.canDeleteAttachments && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-12 h-7 w-7 opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAttachmentToDelete(attachment)
                            setDeleteDialogOpen(true)
                          }}
                          aria-label="Eliminar archivo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Infinite scroll - auto-load when scrolling near bottom, plus manual load button */}
          {!showPagination && sortedAttachments.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-4 border-t pt-6">
              {/* Intersection observer trigger for auto-loading */}
              {hasNextPage && !isFetchingNextPage && (
                <InfiniteScrollTrigger
                  onIntersect={() => onLoadMore?.()}
                  disabled={isFetchingNextPage}
                  rootMargin="600px"
                />
              )}
              
              {/* Manual load more button */}
              {hasNextPage && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => onLoadMore?.()}
                  disabled={isFetchingNextPage}
                  className="w-full max-w-xs"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cargando más archivos...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Cargar más archivos
                    </>
                  )}
                </Button>
              )}
              
              {/* Status message */}
              <p className="text-xs text-muted-foreground">
                {hasNextPage
                  ? `Mostrando ${sortedAttachments.length} de ${total} archivos`
                  : `Se mostraron todos los archivos (${sortedAttachments.length} de ${total})`}
              </p>
            </div>
          )}

          {/* Pagination (legacy support) */}
          {showPagination && total > (limit || 20) && (
            <div className="flex flex-col items-center justify-between gap-4 border-t pt-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">
                Mostrando {Math.min((page - 1) * (limit || 20) + 1, total)} - {Math.min(page * (limit || 20), total)} de {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(page + 1)}
                  disabled={page * (limit || 20) >= total}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Viewer dialog - improved */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[95vw] p-0 sm:max-w-6xl">
          {sortedAttachments[currentIndex] && (
            <AttachmentViewer
              attachment={sortedAttachments[currentIndex]}
              onClose={() => setViewerOpen(false)}
              onPrevious={() => navigateViewer("prev")}
              onNext={() => navigateViewer("next")}
              hasPrevious={sortedAttachments.length > 1}
              hasNext={sortedAttachments.length > 1}
              currentIndex={currentIndex + 1}
              totalCount={sortedAttachments.length}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar adjunto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El archivo se eliminará permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setAttachmentToDelete(null)
              }}
              disabled={deleteAttachment.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={deleteAttachment.isPending} variant="destructive">
              {deleteAttachment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
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
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const isImageType = attachment.mimeType.startsWith("image/")
  const isPDF = attachment.mimeType === "application/pdf"
  const attachmentIsProxyUrl = isProxyUrl(attachment.secureUrl)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Generate download URL
  const getDownloadUrl = () => {
    if (!attachment.secureUrl) return "#"

    try {
      let url: URL
      if (attachment.secureUrl.startsWith("http://") || attachment.secureUrl.startsWith("https://")) {
        url = new URL(attachment.secureUrl)
      } else {
        url = new URL(attachment.secureUrl, window.location.origin)
      }

      if (url.pathname.includes("/api/adjuntos/")) {
        url.searchParams.set("download", "true")
        return url.toString()
      }
    } catch (error) {
      console.error("Error parsing URL:", error)
    }

    return attachment.secureUrl
  }

  const downloadUrl = getDownloadUrl()

  // Reset zoom and rotation when attachment changes
  useEffect(() => {
    setScale(1)
    setRotation(0)
    setImageLoaded(false)
    setImageError(false)
  }, [attachment.id])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault()
        setScale((prev) => Math.min(prev + 0.1, 3))
      } else if (e.key === "-") {
        e.preventDefault()
        setScale((prev) => Math.max(prev - 0.1, 0.5))
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        setRotation((prev) => (prev + 90) % 360)
      } else if (e.key === "0") {
        e.preventDefault()
        setScale(1)
        setRotation(0)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const TypeIcon = getAttachmentTypeIcon(attachment.type)
  const typeColor = getAttachmentTypeColor(attachment.type)

  return (
    <div className="flex h-[90vh] max-h-[90vh] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background p-4 shadow-sm">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{attachment.fileName}</h3>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {currentIndex} de {totalCount}
              </p>
              <span className="text-muted-foreground">•</span>
              <Badge variant="secondary" className={cn("text-xs", typeColor)}>
                {getAttachmentTypeLabel(attachment.type)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Image controls */}
          {isImageType && (
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
                disabled={scale <= 0.5}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setScale((prev) => Math.min(prev + 0.1, 3))}
                disabled={scale >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                aria-label="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          )}
          {attachment.secureUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Descargar</span>
              </a>
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-muted/20 to-muted/40">
        {isImageType && attachment.secureUrl ? (
          <div className="flex h-full w-full items-center justify-center p-4">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-center">
                <FileImage className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Error al cargar la imagen</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setImageError(false)
                    setImageLoaded(false)
                  }}
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <div
                className="relative max-h-full max-w-full transition-transform duration-200"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  cursor: scale > 1 ? "grab" : "default",
                }}
              >
                {attachmentIsProxyUrl ? (
                  <img
                    src={attachment.secureUrl}
                    alt={attachment.fileName}
                    className="max-h-full max-w-full object-contain shadow-2xl"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                      setImageError(true)
                      setImageLoaded(true)
                    }}
                    style={{ display: imageLoaded ? "block" : "none" }}
                  />
                ) : (
                  <Image
                    src={attachment.secureUrl || "/placeholder.svg"}
                    alt={attachment.fileName}
                    width={attachment.width || 1200}
                    height={attachment.height || 800}
                    className="max-h-full max-w-full object-contain shadow-2xl"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                      setImageError(true)
                      setImageLoaded(true)
                    }}
                    style={{ display: imageLoaded ? "block" : "none" }}
                    priority
                  />
                )}
              </div>
            )}
          </div>
        ) : isPDF && attachment.secureUrl ? (
          <div className="h-full w-full">
            <iframe
              src={attachment.secureUrl}
              className="h-full w-full border-0"
              title={attachment.fileName}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <TypeIcon className="h-10 w-10 text-muted-foreground/50" />
                </div>
              </div>
              <p className="mb-2 text-sm font-medium">Vista previa no disponible</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Este tipo de archivo no se puede visualizar en el navegador
              </p>
              {attachment.secureUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={downloadUrl} download target="_blank" rel="noopener noreferrer">
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
            className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 shadow-lg hover:scale-110"
            onClick={onPrevious}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {hasNext && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 shadow-lg hover:scale-110"
            onClick={onNext}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Footer with metadata */}
      <ScrollArea className="max-h-[200px] border-t bg-background">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tamaño</p>
              <p className="mt-0.5 font-medium">{formatFileSize(attachment.fileSize)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subido</p>
              <p className="mt-0.5 font-medium">{formatDate(attachment.uploadedAt, true)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Por</p>
              <p className="mt-0.5 font-medium">
                {attachment.uploadedBy.fullName ||
                  `${attachment.uploadedBy.firstName} ${attachment.uploadedBy.lastName}`}
              </p>
            </div>
            {attachment.width && attachment.height && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Dimensiones</p>
                <p className="mt-0.5 font-medium">
                  {attachment.width} × {attachment.height}
                </p>
              </div>
            )}
          </div>

          {attachment.description && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground">Descripción</p>
              <p className="mt-1 text-sm">{attachment.description}</p>
            </div>
          )}

          {attachment.source === "consentimiento" && attachment.consentimientoMetadata && (
            <div className="mt-4 rounded-lg border bg-blue-50 p-3 dark:bg-blue-950/20">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Consentimiento Informado
              </p>
              <div className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300">
                <p>Tipo: {attachment.consentimientoMetadata.tipo}</p>
                <p>Firmado: {formatDate(attachment.consentimientoMetadata.firmadoEn, true)}</p>
                <p>Vigente hasta: {formatDate(attachment.consentimientoMetadata.vigenteHasta, true)}</p>
              </div>
              <Badge
                variant={attachment.consentimientoMetadata.vigente ? "default" : "destructive"}
                className="mt-2 text-xs"
              >
                {attachment.consentimientoMetadata.vigente ? "Vigente" : "Vencido"}
              </Badge>
            </div>
          )}

          {attachment.context && attachment.context.type !== "patient" && (
            <div className="mt-4 rounded-lg border bg-muted/50 p-3">
              <p className="text-sm font-medium text-muted-foreground">
                {attachment.context.type === "consultation" ? "Adjunto de Consulta" : "Adjunto de Procedimiento"}
              </p>
              {attachment.context.info?.consultaFecha && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Fecha: {formatDate(attachment.context.info.consultaFecha, true)}
                </p>
              )}
              {attachment.context.info?.consultaTipo && (
                <p className="text-xs text-muted-foreground">Tipo: {attachment.context.info.consultaTipo}</p>
              )}
            </div>
          )}

          <div className="mt-4 text-xs text-muted-foreground">
            <p>Usa las flechas del teclado para navegar • Presiona Esc para cerrar</p>
            {isImageType && (
              <p className="mt-1">
                Zoom: + / - • Rotar: R • Restablecer: 0
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
