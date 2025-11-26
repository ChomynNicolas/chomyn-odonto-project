"use client"

import { useState } from "react"
import { usePatientAnamnesis } from "@/lib/hooks/use-patient-anamnesis"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, FileText, History } from "lucide-react"
import type { RolNombre } from "@/types/patient"
import { AnamnesisDisplayView } from "./anamnesis-display-view"
import { AnamnesisHistoryView } from "./anamnesis-history-view"
import { AnamnesisEditModal } from "./anamnesis-edit-modal"

interface AnamnesisTabRedesignedProps {
  patientId: number
  currentRole: RolNombre
}

export function AnamnesisTabRedesigned({ patientId, currentRole }: AnamnesisTabRedesignedProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const { data: anamnesis, isLoading, error, refetch } = usePatientAnamnesis(patientId)

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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96 w-full" />
      </div>
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

  // No anamnesis exists yet
  if (!anamnesis) {
    const canEdit = currentRole === "ADMIN" || currentRole === "ODONT"

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Anamnesis
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">No hay anamnesis registrada para este paciente</p>
            </div>
            {canEdit && <Button onClick={() => setIsEditModalOpen(true)}>Crear Anamnesis</Button>}
          </div>
        </CardHeader>
        {isEditModalOpen && (
          <AnamnesisEditModal
            patientId={patientId}
            initialData={null}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={() => {
              refetch()
              setIsEditModalOpen(false)
            }}
          />
        )}
      </Card>
    )
  }

  // Determine if user can edit
  const canEdit = currentRole === "ADMIN" || currentRole === "ODONT"

  return (
    <div className="space-y-6">
      <Tabs defaultValue="display" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="display" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vista Actual
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="mt-6">
          <AnamnesisDisplayView anamnesis={anamnesis} canEdit={canEdit} onEdit={() => setIsEditModalOpen(true)} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <AnamnesisHistoryView patientId={patientId} />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <AnamnesisEditModal
          patientId={patientId}
          initialData={anamnesis}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={() => {
            refetch()
            setIsEditModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
