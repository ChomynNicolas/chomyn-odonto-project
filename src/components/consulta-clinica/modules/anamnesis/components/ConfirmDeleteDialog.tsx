// src/components/consulta-clinica/modules/anamnesis/components/ConfirmDeleteDialog.tsx
// Reusable confirmation dialog for deleting clinical items (allergies, medications, etc.)

"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type DeleteSeverity = "normal" | "warning" | "critical"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName: string
  itemType: string
  severity?: DeleteSeverity
  warningMessage?: string
  children?: React.ReactNode
}

const SEVERITY_STYLES: Record<DeleteSeverity, { border: string; icon: string; title: string }> = {
  normal: {
    border: "border-border",
    icon: "text-muted-foreground",
    title: "text-foreground",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100",
  },
  critical: {
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
  },
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  itemType,
  severity = "normal",
  warningMessage,
  children,
}: ConfirmDeleteDialogProps) {
  const styles = SEVERITY_STYLES[severity]

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("border-2", styles.border)}>
        <AlertDialogHeader>
          <AlertDialogTitle className={cn("flex items-center gap-2", styles.title)}>
            <AlertTriangle className={cn("h-5 w-5", styles.icon)} />
            Confirmar eliminación
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                ¿Está seguro que desea eliminar {itemType === "alergia" ? "la" : "el"}{" "}
                <strong className="text-foreground">{itemType}</strong>:{" "}
                <strong className="text-foreground">{itemName}</strong>?
              </p>
              {warningMessage && (
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    severity === "critical"
                      ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                      : severity === "warning"
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <AlertTriangle className="inline-block h-4 w-4 mr-2 -mt-0.5" />
                  {warningMessage}
                </div>
              )}
              {children}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              "gap-2",
              severity === "critical"
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-600"
                : "bg-destructive hover:bg-destructive/90"
            )}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

