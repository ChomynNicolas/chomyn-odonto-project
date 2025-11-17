// src/app/(dashboard)/audit/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, Download, FileDown } from "lucide-react"
import { toast } from "sonner"
import { AuditLogFilters } from "@/components/audit/AuditLogFilters"
import { AuditLogTable } from "@/components/audit/AuditLogTable"
import { AuditLogDetail } from "@/components/audit/AuditLogDetail"
import type { AuditLogEntry, AuditLogFilters as AuditFilters, AuditLogResponse } from "@/lib/types/audit"
import { useRouter, useSearchParams } from "next/navigation"

export default function AuditLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [filters, setFilters] = useState<AuditFilters>(() => {
    // Inicializar filtros desde URL
    const params: AuditFilters = {
      page: Number.parseInt(searchParams.get("page") || "1"),
      limit: Number.parseInt(searchParams.get("limit") || "20"),
      sortBy: (searchParams.get("sortBy") as any) || "createdAt",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    }
    
    if (searchParams.get("dateFrom")) params.dateFrom = searchParams.get("dateFrom")!
    if (searchParams.get("dateTo")) params.dateTo = searchParams.get("dateTo")!
    if (searchParams.get("actorId")) params.actorId = Number.parseInt(searchParams.get("actorId")!)
    if (searchParams.get("action")) params.action = searchParams.get("action")!
    if (searchParams.get("entity")) params.entity = searchParams.get("entity")!
    if (searchParams.get("entityId")) params.entityId = Number.parseInt(searchParams.get("entityId")!)
    if (searchParams.get("search")) params.search = searchParams.get("search")!
    if (searchParams.get("ip")) params.ip = searchParams.get("ip")!
    
    return params
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setAccessDenied(false)
    try {
      const params = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.set(key, String(value))
        }
      })

      const res = await fetch(`/api/audit/logs?${params.toString()}`)
      const result = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied(true)
          return
        }
        throw new Error(result.error || "Error al cargar registros de auditoría")
      }

      if (result.ok) {
        setData(result.data)
      } else {
        throw new Error(result.error || "Error al cargar registros de auditoría")
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error)
      if (error instanceof Error && error.message.includes("403")) {
        setAccessDenied(true)
      } else {
        toast.error(error instanceof Error ? error.message : "Error al cargar registros de auditoría")
      }
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  // Actualizar URL cuando cambian los filtros
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.set(key, String(value))
      }
    })
    router.replace(`/audit?${params.toString()}`, { scroll: false })
  }, [filters, router])

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFiltersChange = (newFilters: AuditFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field as any,
      sortOrder: prev.sortBy === field && prev.sortOrder === "desc" ? "asc" : "desc",
      page: 1,
    }))
  }

  const handleRowClick = (entry: AuditLogEntry) => {
    setSelectedEntry(entry)
    setIsDetailOpen(true)
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          params.set(key, String(value))
        }
      })

      const res = await fetch(`/api/audit/export?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Error al exportar registros")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Registros exportados correctamente")
    } catch (error) {
      console.error("Error exporting audit logs:", error)
      toast.error("Error al exportar registros")
    }
  }

  // Mostrar mensaje de acceso denegado si no es ADMIN
  if (accessDenied) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <svg
                  className="h-12 w-12 text-destructive"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
    <div className="container mx-auto py-6 space-y-6">
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
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || !data}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <AuditLogFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onReset={handleResetFilters}
      />

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Eventos de Auditoría
            {data && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
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
          />

          {/* Paginación */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((data.pagination.page - 1) * data.pagination.limit) + 1} -{" "}
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} de{" "}
                {data.pagination.total} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={data.pagination.page === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  Siguiente
                </Button>
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
  )
}

