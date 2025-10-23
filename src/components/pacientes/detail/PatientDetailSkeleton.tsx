"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function PatientDetailSkeleton() {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-card p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 shrink-0" />
        ))}
      </nav>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </section>
  )
}

export function PatientNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="size-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-lg font-semibold">Paciente no encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El ID no coincide con un registro existente o el paciente ya no está activo.
      </p>
      <Button onClick={onBack} variant="outline" className="mt-6 bg-transparent">
        <ArrowLeft className="size-4" />
        Volver al listado
      </Button>
    </div>
  )
}

export function PatientError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <h3 className="font-medium text-destructive">Error al cargar el paciente</h3>
          <p className="mt-1 text-sm text-destructive/90">
            Ocurrió un problema al obtener la información del paciente.{" "}
            <button onClick={onRetry} className="font-medium underline underline-offset-4 hover:no-underline">
              Reintentar
            </button>
          </p>
          {process.env.NODE_ENV !== "production" && message && (
            <p className="mt-2 text-xs text-destructive/70">{message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
