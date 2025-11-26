"use client"

import { useState, useMemo } from "react"
import { usePatientAnamnesis } from "@/lib/hooks/use-patient-anamnesis"
import { usePatientOverview } from "@/lib/hooks/use-patient-overview"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, AlertCircle, History, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { RolNombre } from "@/types/patient"
import { AnamnesisDisplayView } from "../anamnesis/anamnesis-display-view"
import { AnamnesisEditModal } from "../anamnesis/anamnesis-edit-modal"
import { AnamnesisHistoryView } from "../anamnesis/anamnesis-history-view"
import { AnamnesisStatusBadge } from "../anamnesis/components/AnamnesisStatusBadge"
import { AnamnesisPendingReviewPanel } from "../anamnesis/components/AnamnesisPendingReviewPanel"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AnamnesisStatus } from "@/types/anamnesis-outside-consultation"

interface AnamnesisTabProps {
  patientId: number
  currentRole: RolNombre
}

export function AnamnesisTab({ patientId, currentRole }: AnamnesisTabProps) {
  const { data: anamnesis, isLoading, error, refetch } = usePatientAnamnesis(patientId)
  const { data: patientOverview } = usePatientOverview(patientId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeView, setActiveView] = useState<"display" | "history">("display")

  // Get patient gender from overview or from anamnesis metadata
  const patientGender = useMemo(() => {
    if (patientOverview?.patient.gender) {
      return patientOverview.patient.gender as "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
    }
    // Try to get from anamnesis metadata
    if (anamnesis?.payload && typeof anamnesis.payload === "object" && "_metadata" in anamnesis.payload) {
      const metadata = (anamnesis.payload as any)._metadata
      if (metadata?.patientGender) {
        return metadata.patientGender as "MASCULINO" | "FEMENINO" | "OTRO" | "NO_ESPECIFICADO"
      }
    }
    return "NO_ESPECIFICADO" as const
  }, [patientOverview?.patient.gender, anamnesis?.payload])

  // Calculate anamnesis status
  const anamnesisStatus = useMemo((): AnamnesisStatus => {
    if (!anamnesis) return "NO_ANAMNESIS"
    
    // Check if expired (> 12 months)
    const updatedAt = new Date(anamnesis.updatedAt)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const isExpired = updatedAt < oneYearAgo

    // Check for pending reviews (we'll fetch this separately)
    // For now, we'll use a simple calculation
    // In a real implementation, you'd check the pendingReviews count
    return isExpired ? "EXPIRED" : "VALID"
  }, [anamnesis])

  // Fetch pending reviews if anamnesis exists
  const { data: pendingReviews } = useQuery({
    queryKey: ["anamnesis", "pending-reviews", patientId],
    queryFn: async () => {
      if (!anamnesis) return []
      const res = await fetch(`/api/pacientes/${patientId}/anamnesis/pending-reviews`)
      if (!res.ok) return []
      const data = await res.json()
      return data.data || []
    },
    enabled: !!anamnesis && (currentRole === "ADMIN" || currentRole === "ODONT"),
  })

  // Update status if there are pending reviews
  const finalStatus = useMemo((): AnamnesisStatus => {
    if (pendingReviews && pendingReviews.length > 0) {
      return "PENDING_REVIEW"
    }
    return anamnesisStatus
  }, [anamnesisStatus, pendingReviews])

  // Don't show for receptionists
  if (currentRole === "RECEP") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No tiene permisos para ver esta información.</AlertDescription>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar anamnesis: {error.message}
          <Button variant="outline" size="sm" className="ml-4 bg-transparent" onClick={() => refetch()}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!anamnesis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No hay anamnesis registrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este paciente aún no tiene una anamnesis completa en el sistema.
          </p>
          {(currentRole === "ADMIN" || currentRole === "ODONT") && (
            <Button onClick={() => setIsEditModalOpen(true)}>Crear Anamnesis</Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Determine if user can edit (ADMIN and ODONT can edit)
  const canEdit = currentRole === "ADMIN" || currentRole === "ODONT"

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AnamnesisStatusBadge status={finalStatus} />
              {anamnesis && (
                <div className="text-sm text-muted-foreground">
                  <span>Última actualización: {format(new Date(anamnesis.updatedAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</span>
                  {anamnesis.actualizadoPor && (
                    <span className="ml-1">por {anamnesis.actualizadoPor.nombreApellido}</span>
                  )}
                </div>
              )}
            </div>
            {pendingReviews && pendingReviews.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingReviews.length} revisión{pendingReviews.length > 1 ? "es" : ""} pendiente{pendingReviews.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Reviews Panel */}
      {canEdit && (
        <AnamnesisPendingReviewPanel
          patientId={patientId}
          canReview={canEdit}
          onReviewComplete={() => {
            refetch()
          }}
        />
      )}

      {/* Header Card with View Switcher */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Anamnesis del Paciente
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Información clínica completa y actualizada</p>
            </div>
            {!canEdit && (
              <Badge variant="secondary" className="shrink-0">
                Solo lectura
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "display" | "history")} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista Actual
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="display" className="mt-6">
              <AnamnesisDisplayView
                anamnesis={anamnesis}
                canEdit={canEdit}
                onEdit={() => setIsEditModalOpen(true)}
                patientGender={patientGender}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <AnamnesisHistoryView patientId={patientId} currentAnamnesis={anamnesis} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {canEdit && (
        <AnamnesisEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          patientId={patientId}
          initialData={anamnesis}
          onSave={() => {
            refetch()
            setIsEditModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
