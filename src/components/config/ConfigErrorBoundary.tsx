"use client"

import React from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfigErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ConfigErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ConfigErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ConfigErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Configuration error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Error en la Configuración
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ocurrió un error al cargar la página de configuración. Por favor, intenta recargar la página.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="text-xs text-gray-500 dark:text-gray-500 cursor-pointer mb-2">
                  Detalles del error
                </summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                variant="default"
              >
                Recargar página
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
              >
                Volver al Dashboard
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

