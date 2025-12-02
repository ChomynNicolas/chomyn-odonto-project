// src/app/(dashboard)/audit/page.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { AuditLogFilters } from "@/components/audit/AuditLogFilters"
import { AuditLogTable } from "@/components/audit/AuditLogTable"
import { AuditLogDetail } from "@/components/audit/AuditLogDetail"
import { AuditErrorBoundary } from "@/components/audit/AuditErrorBoundary"
import type { AuditLogEntry, AuditLogFilters as AuditFilters, AuditLogResponse } from "@/lib/types/audit"
import { useRouter, useSearchParams } from "next/navigation"
import { DEFAULT_PAGE_SIZE, AUDIT_PAGE_SIZES } from "@/lib/constants/audit"

export default function AuditLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportCount, setExportCount] = useState<number | null>(null)
  const [showExportWarning, setShowExportWarning] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [filters, setFilters] = useState<AuditFilters>(() => {
    // Inicializar filtros desde URL
    const params: AuditFilters = {
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE)),
      sortBy: (searchParams.get("sortBy") as AuditFilters["sortBy"]) || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }
    
    if (searchParams.get("dateFrom")) params.dateFrom = searchParams.get("dateFrom")!
    if (searchParams.get("dateTo")) params.dateTo = searchParams.get("dateTo")!
    if (searchParams.get("actorId")) params.actorId = Number.parseInt(searchParams.get("actorId")!)
    
    // Support both single action and actions array
    const actionsParam = searchParams.get("actions")
    if (actionsParam) {
      params.actions = actionsParam.split(",")
    } else if (searchParams.get("action")) {
      params.action = searchParams.get("action")!
    }
    
    // Support both single entity and entities array
    const entitiesParam = searchParams.get("entities")
    if (entitiesParam) {
      params.entities = entitiesParam.split(",")
    } else if (searchParams.get("entity")) {
      params.entity = searchParams.get("entity")!
    }
    
    if (searchParams.get("entityId")) params.entityId = Number.parseInt(searchParams.get("entityId")!)
    if (searchParams.get("search")) params.search = searchParams.get("search")!
    if (searchParams.get("ip")) params.ip = searchParams.get("ip")!
    
    return params
  })
  const [pageInput, setPageInput] = useState("")

  const fetchData = useCallback(async () => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsLoading(true)
    setAccessDenied(false)
    try {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          // Handle arrays (actions, entities)
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(key, value.join(","))
            }
          } else {
            params.set(key, String(value))
          }
        }
      })

      const res = await fetch(`/api/audit/logs?${params.toString()}`, {
        signal: abortController.signal,
      })
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return
      }

      const result = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied(true)
          return
        }
        
        // Mejor manejo de errores de validación
        const errorMessage = result.error || result.message || "Error al cargar registros de auditoría"
        const isValidationError = res.status === 400 && (errorMessage.includes("Invalid input") || errorMessage.includes("validation"))
        
        if (isValidationError) {
          console.error("Error de validación en filtros:", result)
          toast.error("Error en los filtros aplicados. Por favor, verifica los valores e intenta nuevamente.")
          // Resetear a filtros por defecto si hay error de validación
          handleResetFilters()
          return
        }
        
        throw new Error(errorMessage)
      }

      if (result.ok) {
        setData(result.data)
        setPageInput("") // Reset page input when data loads
      } else {
        throw new Error(result.error || "Error al cargar registros de auditoría")
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      
      console.error("Error fetching audit logs:", error)
      if (error instanceof Error && error.message.includes("403")) {
        setAccessDenied(true)
      } else {
        toast.error(error instanceof Error ? error.message : "Error al cargar registros de auditoría")
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [filters])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Actualizar URL cuando cambian los filtros (solo cuando se aplican explícitamente)
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        // Handle arrays (actions, entities)
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(","))
          }
        } else {
          params.set(key, String(value))
        }
      }
    })
    router.replace(`/audit?${params.toString()}`, { scroll: false })
  }, [filters, router])

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/"
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
      
      // Close detail dialog on Escape
      if (e.key === "Escape" && isDetailOpen) {
        setIsDetailOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDetailOpen])

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: DEFAULT_PAGE_SIZE,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || (data && page > data.pagination.totalPages)) {
      return
    }
    setFilters((prev) => ({ ...prev, page }))
  }

  const handlePageSizeChange = (size: string) => {
    setFilters((prev) => ({ ...prev, limit: Number.parseInt(size), page: 1 }))
  }

  const handlePageInputChange = (value: string) => {
    setPageInput(value)
  }

  const handlePageInputSubmit = () => {
    const page = Number.parseInt(pageInput)
    if (!isNaN(page) && page >= 1) {
      handlePageChange(page)
    } else {
      setPageInput("")
    }
  }

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field as AuditFilters["sortBy"],
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }))
  }

  const handleRowClick = (entry: AuditLogEntry) => {
    setSelectedEntry(entry)
    setIsDetailOpen(true)
  }

  // Get export count preview
  const fetchExportCount = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(key, value.join(","))
            }
          } else {
            params.set(key, String(value))
          }
        }
      })
      params.set("limit", "1") // Just to get count
      params.delete("page") // Remove pagination

      const res = await fetch(`/api/audit/logs?${params.toString()}`)
      if (res.ok) {
        const result = await res.json()
        if (result.ok && result.data) {
          setExportCount(result.data.pagination.total)
          setShowExportWarning(result.data.pagination.total > 10000)
        } else {
          // Si hay error en la respuesta, resetear el conteo
          setExportCount(null)
          setShowExportWarning(false)
        }
      } else {
        // Si la petición falla, resetear el conteo
        setExportCount(null)
        setShowExportWarning(false)
      }
    } catch (error) {
      console.error("Error fetching export count:", error)
      // En caso de error, resetear el conteo
      setExportCount(null)
      setShowExportWarning(false)
    }
  }, [filters])

  // Update export count when filters change
  useEffect(() => {
    fetchExportCount()
  }, [fetchExportCount])

  const handleExport = async () => {
    if (exportCount !== null && exportCount > 10000) {
      const confirmed = window.confirm(
        `Advertencia: Se exportarán ${exportCount.toLocaleString()} registros, pero el límite máximo es 10,000. ` +
        `Solo se exportarán los primeros 10,000 registros. ¿Desea continuar?`
      )
      if (!confirmed) return
    }

    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.set(key, value.join(","))
            }
          } else {
            params.set(key, String(value))
          }
        }
      })

      const res = await fetch(`/api/audit/export?${params.toString()}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al exportar registros")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Generate filename with filter info
      const dateStr = new Date().toISOString().split("T")[0]
      const filterParts: string[] = []
      if (filters.dateFrom || filters.dateTo) filterParts.push("filtrado")
      if (filters.actions && filters.actions.length > 0) filterParts.push(`${filters.actions.length}-acciones`)
      if (filters.entities && filters.entities.length > 0) filterParts.push(`${filters.entities.length}-entidades`)
      if (filters.actorId) filterParts.push("por-usuario")
      
      const filename = filterParts.length > 0
        ? `audit-log-${dateStr}-${filterParts.join("-")}.csv`
        : `audit-log-${dateStr}.csv`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      const countMsg = exportCount !== null 
        ? ` (${Math.min(exportCount, 10000).toLocaleString()} registros)`
        : ""
      toast.success(`Registros exportados correctamente${countMsg}`)
    } catch (error) {
      console.error("Error exporting audit logs:", error)
      toast.error(error instanceof Error ? error.message : "Error al exportar registros")
    } finally {
      setIsExporting(false)
    }
  }

  // Calculate pagination range
  const getPaginationRange = () => {
    if (!data) return { start: 0, end: 0 }
    
    const totalPages = data.pagination.totalPages
    const currentPage = data.pagination.page
    const maxVisible = 7 // Show up to 7 page buttons
    
    if (totalPages <= maxVisible) {
      return { start: 1, end: totalPages }
    }
    
    // Show pages around current page
    let start = Math.max(1, currentPage - 3)
    const end = Math.min(totalPages, start + maxVisible - 1)
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    return { start, end }
  }

  // Mostrar mensaje de acceso denegado si no es ADMIN
  if (accessDenied) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-destructive/10 p-4 mb-4" role="img" aria-label="Error">
                <svg
                  className="h-12 w-12 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Acceso Denegado</h2>
              <p className="text-muted-foreground mb-4">
                Solo los administradores pueden acceder al registro de auditoría completo.
              </p>
              <p className="text-sm text-muted-foreground">
                Si necesita ver el historial de cambios, puede acceder al historial contextual desde
                la ficha del paciente o la consulta.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <AuditErrorBoundary>
      <div className="container mx-auto py-6 space-y-6" role="main" aria-label="Registro de auditoría">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registro de Auditoría</CardTitle>
                <CardDescription>
                  Visualiza y rastrea todos los cambios realizados en el sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={isLoading}
                  aria-label="Actualizar registros"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
                  Actualizar
                </Button>
                <div className="flex items-center gap-2">
                  {exportCount !== null && exportCount > 0 && (
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                      {exportCount.toLocaleString()} registro{exportCount !== 1 ? "s" : ""} para exportar
                      {showExportWarning && (
                        <span className="ml-2 text-orange-600 dark:text-orange-400" title="Límite máximo: 10,000 registros">
                          ⚠️
                        </span>
                      )}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isLoading || isExporting || !data || (exportCount !== null && exportCount === 0)}
                    aria-label={
                      exportCount !== null
                        ? `Exportar ${exportCount.toLocaleString()} registros a CSV`
                        : "Exportar registros a CSV"
                    }
                    title={
                      exportCount !== null && exportCount > 10000
                        ? `Advertencia: Se exportarán solo los primeros 10,000 de ${exportCount.toLocaleString()} registros`
                        : undefined
                    }
                  >
                    <Download className={`h-4 w-4 mr-2 ${isExporting ? "animate-pulse" : ""}`} aria-hidden="true" />
                    {isExporting
                      ? "Exportando..."
                      : exportCount !== null && exportCount > 0
                      ? `Exportar CSV (${exportCount > 10000 ? "10,000" : exportCount.toLocaleString()})`
                      : "Exportar CSV"}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Filtros */}
        <AuditLogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
          isLoading={isLoading}
        />

        {/* Tabla */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Eventos de Auditoría
              {data && (
                <span className="ml-2 text-sm font-normal text-muted-foreground" aria-live="polite">
                  ({data.pagination.total} registro{data.pagination.total !== 1 ? "s" : ""})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditLogTable
              data={data}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={handleSort}
              onClearFilters={handleResetFilters}
              onQuickFilter={(quickFilters) => {
                setFilters((prev) => ({ ...prev, ...quickFilters, page: 1 }))
                toast.success("Filtro aplicado")
              }}
            />

            {/* Paginación Mejorada */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground" aria-live="polite">
                    Mostrando {((data.pagination.page - 1) * data.pagination.limit) + 1} -{" "}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{" "}
                    {data.pagination.total} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pageSize" className="text-sm text-muted-foreground whitespace-nowrap">
                      Por página:
                    </Label>
                    <Select
                      value={String(data.pagination.limit)}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger id="pageSize" className="w-20" aria-label="Registros por página">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIT_PAGE_SIZES.map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={!data.pagination.hasPrev || isLoading}
                    aria-label="Primera página"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <ChevronLeft className="h-4 w-4 -ml-2" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page - 1)}
                    disabled={!data.pagination.hasPrev || isLoading}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {(() => {
                      const { start, end } = getPaginationRange()
                      const pages: (number | string)[] = []
                      
                      if (start > 1) {
                        pages.push(1)
                        if (start > 2) pages.push("...")
                      }
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(i)
                      }
                      
                      if (end < data.pagination.totalPages) {
                        if (end < data.pagination.totalPages - 1) pages.push("...")
                        pages.push(data.pagination.totalPages)
                      }
                      
                      return pages.map((page, idx) => {
                        if (page === "...") {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )
                        }
                        const pageNum = page as number
                        return (
                          <Button
                            key={pageNum}
                            variant={data.pagination.page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            aria-label={`Ir a página ${pageNum}`}
                            aria-current={data.pagination.page === pageNum ? "page" : undefined}
                          >
                            {pageNum}
                          </Button>
                        )
                      })
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page + 1)}
                    disabled={!data.pagination.hasNext || isLoading}
                    aria-label="Página siguiente"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.totalPages)}
                    disabled={!data.pagination.hasNext || isLoading}
                    aria-label="Última página"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    <ChevronRight className="h-4 w-4 -ml-2" aria-hidden="true" />
                  </Button>
                  
                  <div className="flex items-center gap-2 ml-2">
                    <Label htmlFor="goToPage" className="text-sm text-muted-foreground whitespace-nowrap">
                      Ir a:
                    </Label>
                    <Input
                      id="goToPage"
                      ref={searchInputRef}
                      type="number"
                      min={1}
                      max={data.pagination.totalPages}
                      value={pageInput}
                      onChange={(e) => handlePageInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePageInputSubmit()
                        }
                      }}
                      placeholder={String(data.pagination.page)}
                      className="w-20"
                      aria-label="Ir a página"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePageInputSubmit}
                      disabled={isLoading}
                      aria-label="Ir a la página especificada"
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de detalle */}
        <AuditLogDetail
          entry={selectedEntry}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />
      </div>
    </AuditErrorBoundary>
  )
}
