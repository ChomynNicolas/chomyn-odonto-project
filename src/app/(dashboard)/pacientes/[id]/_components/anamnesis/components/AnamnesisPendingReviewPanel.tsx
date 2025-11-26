// Component for reviewing pending anamnesis changes

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AnamnesisChangeSeverity } from "@/types/anamnesis-outside-consultation"

interface PendingReview {
  idAnamnesisPendingReview: number
  fieldPath: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  reason: string
  severity: AnamnesisChangeSeverity
  createdBy: {
    id: number
    nombreApellido: string
  }
  createdAt: string
  auditLog: {
    action: string
    performedAt: string
    reason: string | null
    severity: AnamnesisChangeSeverity | null
  }
}

interface AnamnesisPendingReviewPanelProps {
  patientId: number
  canReview: boolean
  onReviewComplete?: () => void
}

export function AnamnesisPendingReviewPanel({
  patientId,
  canReview,
  onReviewComplete,
}: AnamnesisPendingReviewPanelProps) {
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const queryClient = useQueryClient()

  // Fetch pending reviews
  const { data: pendingReviews, isLoading } = useQuery({
    queryKey: ["anamnesis", "pending-reviews", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/pacientes/${patientId}/anamnesis/pending-reviews`)
      if (!res.ok) {
        if (res.status === 403) return []
        throw new Error("Error al cargar revisiones pendientes")
      }
      const data = await res.json()
      return (data.data || []) as PendingReview[]
    },
    enabled: canReview,
  })

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ reviewId, isApproved, notes }: { reviewId: number; isApproved: boolean; notes?: string }) => {
      const res = await fetch(`/api/pacientes/${patientId}/anamnesis/review/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isApproved,
          reviewNotes: notes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al revisar cambio")
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anamnesis", "pending-reviews", patientId] })
      queryClient.invalidateQueries({ queryKey: ["patient", "anamnesis", patientId] })
      toast.success("Revisión completada")
      setSelectedReview(null)
      setReviewNotes("")
      onReviewComplete?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setIsApproving(false)
    },
  })

  const handleReview = async (isApproved: boolean) => {
    if (!selectedReview) return

    setIsApproving(true)
    await reviewMutation.mutateAsync({
      reviewId: selectedReview.idAnamnesisPendingReview,
      isApproved,
      notes: reviewNotes || undefined,
    })
    setIsApproving(false)
  }

  const getSeverityBadge = (severity: AnamnesisChangeSeverity) => {
    const config = {
      CRITICAL: { variant: "destructive" as const, label: "Crítico" },
      HIGH: { variant: "destructive" as const, label: "Alto" },
      MEDIUM: { variant: "secondary" as const, label: "Medio" },
      LOW: { variant: "outline" as const, label: "Bajo" },
    }
    const { variant, label } = config[severity]
    return <Badge variant={variant}>{label}</Badge>
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "N/A"
    if (typeof value === "boolean") return value ? "Sí" : "No"
    if (typeof value === "object") return JSON.stringify(value, null, 2)
    return String(value)
  }

  if (!canReview) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return null
  }

  return (
    <>
      <Card className="border-2 border-amber-200 dark:border-amber-900">
        <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <AlertCircle className="h-5 w-5" />
                Cambios Pendientes de Revisión
              </CardTitle>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                {pendingReviews.length} cambio{pendingReviews.length > 1 ? "s" : ""} realizado
                {pendingReviews.length > 1 ? "s" : ""} fuera de consulta requiere
                {pendingReviews.length > 1 ? "n" : ""} revisión
              </CardDescription>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              {pendingReviews.length} pendiente{pendingReviews.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {pendingReviews.map((review) => (
              <div
                key={review.idAnamnesisPendingReview}
                className="flex items-start justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{review.fieldLabel}</span>
                    {getSeverityBadge(review.severity)}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>Cambiado por: {review.createdBy.nombreApellido}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(review.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                    {review.reason && (
                      <div className="mt-2 p-2 bg-background rounded text-xs">
                        <strong>Razón:</strong> {review.reason}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="ml-4">
                  Revisar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Revisar Cambio en Anamnesis</DialogTitle>
            <DialogDescription>
              Verifique el cambio realizado fuera de consulta y confirme o rechace según corresponda.
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 max-h-[calc(90vh-12rem)] overflow-y-auto">
              {/* Change Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Campo Modificado</Label>
                    <p className="text-sm text-muted-foreground">{selectedReview.fieldLabel}</p>
                  </div>
                  {getSeverityBadge(selectedReview.severity)}
                </div>

                {/* Old vs New Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Valor Anterior</Label>
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <pre className="text-sm whitespace-pre-wrap break-words">
                        {formatValue(selectedReview.oldValue)}
                      </pre>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Valor Nuevo
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </Label>
                    <div className="p-3 rounded-lg border bg-primary/5 border-primary">
                      <pre className="text-sm whitespace-pre-wrap break-words">
                        {formatValue(selectedReview.newValue)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Change Info */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Información del Cambio</AlertTitle>
                  <AlertDescription className="space-y-1 mt-2">
                    <div>
                      <strong>Realizado por:</strong> {selectedReview.createdBy.nombreApellido}
                    </div>
                    <div>
                      <strong>Fecha:</strong>{" "}
                      {format(new Date(selectedReview.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </div>
                    {selectedReview.reason && (
                      <div>
                        <strong>Razón:</strong> {selectedReview.reason}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>

                {/* Review Notes */}
                <div className="space-y-2">
                  <Label htmlFor="reviewNotes">Notas de Revisión (Opcional)</Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder="Agregue notas sobre la revisión..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReview(null)
                setReviewNotes("")
              }}
              disabled={isApproving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReview(false)}
              disabled={isApproving}
            >
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Rechazar Cambio
                </>
              )}
            </Button>
            <Button onClick={() => handleReview(true)} disabled={isApproving}>
              {isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aprobando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Aprobar y Verificar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

