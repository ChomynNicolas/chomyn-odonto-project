// src/components/audit/AuditErrorBoundary.tsx
"use client"

import React, { Component, type ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AuditErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error("[AuditErrorBoundary] Error caught:", error, errorInfo)
    
    // TODO: Send to error monitoring service (e.g., Sentry)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: errorInfo } })
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error al cargar el registro de auditoría
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado al cargar el registro de auditoría. Por favor, intente
              nuevamente.
            </p>
            {this.state.error && (
              <details className="rounded-md border bg-muted/30 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Detalles del error
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

