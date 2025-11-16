"use client"

import { useState, useMemo } from "react"
import type { PatientRecord, UserRole, AttachmentType } from "@/lib/types/patient"
import { AttachmentsGallery } from "@/components/pacientes/AttachmentsGallery"
import { AttachmentUploadDialog } from "@/components/pacientes/AttachmentUploadDialog"
import { useAttachments } from "@/hooks/useAttachments"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface AttachmentsTabProps {
  patient: PatientRecord
  userRole: UserRole
  onUpdate?: () => void
}

export function AttachmentsTab({ patient, userRole, onUpdate }: AttachmentsTabProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | AttachmentType>("all")
  const [search, setSearch] = useState("")

  // Fetch attachments with infinite scroll
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAttachments({
    pacienteId: patient.id,
    tipo: filter === "all" ? undefined : filter,
    search: search || undefined,
    limit: 20,
  })

  // Flatten all pages into a single array
  const attachmentsData = useMemo(() => {
    if (!data?.pages) return undefined

    const allAttachments = data.pages.flatMap((page) => page.adjuntos)
    const firstPage = data.pages[0]
    const total = firstPage?.pagination.total || 0
    const porTipo = firstPage?.porTipo || {
      xrays: 0,
      photos: 0,
      documents: 0,
      other: 0,
      consentimientos: 0,
    }

    return {
      adjuntos: allAttachments,
      pagination: {
        page: data.pages.length,
        limit: 20,
        total,
        totalPages: Math.ceil(total / 20),
      },
      porTipo,
    }
  }, [data])

  const handleUpload = () => {
    setUploadDialogOpen(true)
  }

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false)
    refetch()
    onUpdate?.()
  }

  const handleRefresh = () => {
    refetch()
    onUpdate?.()
  }

  // Handle filter change - the infinite query will automatically reset when the queryKey changes
  const handleFilterChange = (newFilter: "all" | AttachmentType) => {
    setFilter(newFilter)
  }

  // Handle search change - the infinite query will automatically reset when the queryKey changes
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch)
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Error al cargar adjuntos: {error.message}</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {isLoading && !attachmentsData ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando adjuntos...
            </div>
          </CardContent>
        </Card>
      ) : (
        <AttachmentsGallery
          attachments={attachmentsData?.adjuntos || patient.attachments || []}
          userRole={userRole}
          pacienteId={patient.id}
          onUpload={handleUpload}
          onRefresh={handleRefresh}
          showPagination={false}
          total={attachmentsData?.pagination.total || 0}
          onFilterChange={handleFilterChange}
          onSearchChange={handleSearchChange}
          currentFilter={filter}
          currentSearch={search}
          typeCounts={attachmentsData?.porTipo}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
        />
      )}

      <AttachmentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        pacienteId={patient.id}
        onSuccess={handleUploadSuccess}
      />
    </div>
  )
}
