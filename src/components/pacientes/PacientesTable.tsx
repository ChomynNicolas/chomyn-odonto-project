"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { usePacientesQuery } from "@/hooks/usePacientesQuery"
import type { PacienteListFilters, SortPacientes } from "@/lib/api/pacientes.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Filter, Plus, Phone, Mail, MessageCircle, Copy, Eye, EyeOff, ChevronDown, Loader2 } from "lucide-react"
import { PatientQuickCreateModal } from "./PatientQuickCreateModal"
import { formatPhoneForWhatsApp } from "@/lib/normalize"
import { toast } from "sonner"
import { formatDateInTZ } from "@/lib/date-utils"
import Link from "next/link"

export default function PacientesTable() {
  const [filters, setFilters] = useState<PacienteListFilters>({
    sort: "createdAt_desc",
    limit: 20,
  })

  const [sessionId, setSessionId] = useState(() => Date.now())
  const [allItems, setAllItems] = useState<any[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [privacyMode, setPrivacyMode] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, error } = usePacientesQuery(filters)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const isInitialLoadRef = useRef(true)

  // Load privacy mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pacientes-privacy-mode")
    if (saved) setPrivacyMode(saved === "true")
  }, [])

  // Save privacy mode to localStorage
  useEffect(() => {
    localStorage.setItem("pacientes-privacy-mode", String(privacyMode))
  }, [privacyMode])

  useEffect(() => {
    // Generate new session ID when filters change (excluding cursor)
    setSessionId(Date.now())
    setAllItems([])
    setNextCursor(null)
    isInitialLoadRef.current = true
  }, [filters.q, filters.createdFrom, filters.createdTo, filters.estaActivo, filters.sort])

  useEffect(() => {
    if (!data) return

    // If this is a cursor-based pagination request
    if (filters.cursor && !isInitialLoadRef.current) {
      setAllItems((prev) => {
        // Prevent duplicates by checking if items already exist
        const existingIds = new Set(prev.map((item) => item.idPaciente))
        const newItems = data.items.filter((item) => !existingIds.has(item.idPaciente))
        return [...prev, ...newItems]
      })
    } else {
      // Fresh data load (initial or after filter change)
      setAllItems(data.items)
      isInitialLoadRef.current = false
    }

    setNextCursor(data.nextCursor)
  }, [data, filters.cursor])

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !nextCursor || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          loadMore()
        }
      },
      { rootMargin: "600px" },
    )

    observer.observe(sentinelRef.current)

    return () => observer.disconnect()
  }, [nextCursor, isLoadingMore])

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    setFilters((prev) => ({ ...prev, cursor: nextCursor }))
    setTimeout(() => setIsLoadingMore(false), 500)
  }, [nextCursor, isLoadingMore])

  const handleSearch = (q: string) => {
    setFilters((prev) => ({ ...prev, q, cursor: undefined }))
  }

  const handleSort = (sort: SortPacientes) => {
    setFilters((prev) => ({ ...prev, sort, cursor: undefined }))
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

  const maskDocument = (doc: string) => {
    if (doc.length <= 4) return "****"
    return `****${doc.slice(-4)}`
  }

  const maskPhone = (phone: string) => {
    if (phone.length <= 4) return "****"
    return `****${phone.slice(-4)}`
  }

  const shouldShowLoading = isLoading && allItems.length === 0
  const shouldShowEmpty = !isLoading && allItems.length === 0 && !error

  return (
    <div className="space-y-4">
      {/* Toolbar - Sticky on desktop */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento o contacto..."
              className="pl-9"
              value={filters.q ?? ""}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Buscar pacientes"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Privacy Mode Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrivacyMode(!privacyMode)}
                    aria-label={privacyMode ? "Desactivar modo privacidad" : "Activar modo privacidad"}
                    aria-pressed={privacyMode}
                  >
                    {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {privacyMode ? "Desactivar modo privacidad" : "Activar modo privacidad"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Filters - Mobile Sheet */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden bg-transparent">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={filters.sort}
                      onChange={(e) => handleSort(e.target.value as SortPacientes)}
                    >
                      <option value="createdAt_desc">Más recientes</option>
                      <option value="createdAt_asc">Más antiguos</option>
                      <option value="nombre_asc">Nombre A-Z</option>
                      <option value="nombre_desc">Nombre Z-A</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Estado</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={filters.estaActivo === undefined ? "all" : String(filters.estaActivo)}
                      onChange={(e) => {
                        const val = e.target.value
                        setFilters((prev) => ({
                          ...prev,
                          estaActivo: val === "all" ? undefined : val === "true",
                          cursor: undefined,
                        }))
                      }}
                    >
                      <option value="all">Todos</option>
                      <option value="true">Activos</option>
                      <option value="false">Inactivos</option>
                    </select>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={filters.sort}
                onChange={(e) => handleSort(e.target.value as SortPacientes)}
                aria-label="Ordenar pacientes"
              >
                <option value="createdAt_desc">Más recientes</option>
                <option value="createdAt_asc">Más antiguos</option>
                <option value="nombre_asc">Nombre A-Z</option>
                <option value="nombre_desc">Nombre Z-A</option>
              </select>
            </div>

            {/* Create Button */}
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4" role="alert" aria-live="polite">
          <p className="text-sm text-destructive">Error al cargar pacientes. Por favor, intenta nuevamente.</p>
        </div>
      )}

      {/* Loading State */}
      {shouldShowLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {shouldShowEmpty && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No se encontraron pacientes</p>
        </div>
      )}

      {/* Table */}
      {allItems.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
                    Paciente
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium hidden md:table-cell">
                    Documento
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium hidden lg:table-cell">
                    Contacto
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium hidden xl:table-cell">
                    Próxima Cita
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allItems.map((paciente) => (
                  <tr
                    key={`${sessionId}-${paciente.idPaciente}`}
                    className={`hover:bg-muted/50 transition-colors ${
                      paciente.proximaCita?.esHoy ? "border-l-4 border-l-chart-1" : ""
                    }`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        window.location.href = `/pacientes/${paciente.idPaciente}`
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{paciente.nombreCompleto}</p>
                        <p className="text-sm text-muted-foreground">
                          {paciente.edad ? `${paciente.edad} años` : "Edad no especificada"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {paciente.documento ? (
                        <div className="text-sm">
                          <p className="font-medium">{paciente.documento.tipo}</p>
                          <p className="text-muted-foreground">
                            {privacyMode ? maskDocument(paciente.documento.numero) : paciente.documento.numero}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {paciente.contactoPrincipal ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {privacyMode && paciente.contactoPrincipal.tipo === "PHONE"
                              ? maskPhone(paciente.contactoPrincipal.valor)
                              : paciente.contactoPrincipal.valor}
                          </span>
                          {!privacyMode && (
                            <div className="flex gap-1">
                              {paciente.contactoPrincipal.tipo === "PHONE" && (
                                <>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                          <a href={`tel:${paciente.contactoPrincipal.valor}`} aria-label="Llamar">
                                            <Phone className="h-3 w-3" />
                                          </a>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Llamar</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {paciente.contactoPrincipal.whatsappCapaz && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                            <a
                                              href={`https://wa.me/${formatPhoneForWhatsApp(paciente.contactoPrincipal.valor)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              aria-label="WhatsApp"
                                            >
                                              <MessageCircle className="h-3 w-3" />
                                            </a>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>WhatsApp</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </>
                              )}

                              {paciente.contactoPrincipal.tipo === "EMAIL" && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild>
                                        <a
                                          href={`mailto:${paciente.contactoPrincipal.valor}`}
                                          aria-label="Enviar email"
                                        >
                                          <Mail className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Enviar email</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(paciente.contactoPrincipal.valor, "Contacto")}
                                      aria-label="Copiar contacto"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copiar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {paciente.proximaCita ? (
                        <div className="flex items-center gap-2">
                          <div className="text-sm">
                            <p className="font-medium">
                              {formatDateInTZ(paciente.proximaCita.inicio, {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-muted-foreground">{paciente.proximaCita.profesional}</p>
                          </div>
                          {paciente.proximaCita.esHoy && (
                            <Badge variant="default" className="text-xs">
                              HOY
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin citas</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={paciente.estaActivo ? "default" : "secondary"}>
                        {paciente.estaActivo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/pacientes/${paciente.idPaciente}`}>
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {nextCursor && (
        <div ref={sentinelRef} className="py-4 text-center">
          {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />}
        </div>
      )}

      {/* Fallback Load More Button */}
      {nextCursor && !isLoadingMore && (
        <div className="text-center py-4">
          <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            Cargar más
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <PatientQuickCreateModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  )
}
