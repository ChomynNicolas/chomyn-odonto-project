// src/components/consulta-clinica/modules/diagnosticos/components/DiagnosisSelector.tsx
/**
 * DiagnosisSelector Component
 * 
 * A searchable, filterable selector for choosing diagnoses from the catalog.
 * Optimized for clinical workflow with keyboard navigation and quick selection.
 */

"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, Check, Loader2, AlertCircle } from "lucide-react"
import { useDiagnosisCatalog } from "../hooks/useDiagnosisCatalog"
import type { DiagnosisCatalogItem } from "@/app/api/diagnosis-catalog/_schemas"
import { cn } from "@/lib/utils"

interface DiagnosisSelectorProps {
  onSelect: (diagnosis: DiagnosisCatalogItem) => void
  onCancel?: () => void
  excludeIds?: number[] // IDs to exclude from selection
  className?: string
  placeholder?: string
  showDescription?: boolean
}

/**
 * Searchable diagnosis selector with keyboard navigation
 */
export function DiagnosisSelector({
  onSelect,
  onCancel,
  excludeIds = [],
  className,
  placeholder = "Buscar diagnóstico por nombre o código...",
  showDescription = true,
}: DiagnosisSelectorProps) {
  const [localSearch, setLocalSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const { items, isLoading, error, search, searchQuery } = useDiagnosisCatalog({
    autoLoad: true,
    debounceMs: 300,
  })

  // Filter out excluded items
  const filteredItems = useMemo(() => {
    return items.filter((item) => !excludeIds.includes(item.idDiagnosisCatalog))
  }, [items, excludeIds])

  // Filter items by local search (client-side filtering for instant feedback)
  const displayItems = useMemo(() => {
    if (!localSearch.trim()) return filteredItems

    const query = localSearch.toLowerCase()
    return filteredItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    )
  }, [filteredItems, localSearch])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    setSelectedIndex(-1)
    // Trigger debounced API search only if value changed significantly
    if (value.trim().length >= 2 || value.trim().length === 0) {
      search(value).catch((err) => {
        console.error("[DiagnosisSelector] Search error:", err)
      })
    }
  }

  // Handle selection
  const handleSelect = (diagnosis: DiagnosisCatalogItem) => {
    onSelect(diagnosis)
    setLocalSearch("")
    setSelectedIndex(-1)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < displayItems.length - 1 ? prev + 1 : prev))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === "Enter" && selectedIndex >= 0 && displayItems[selectedIndex]) {
        e.preventDefault()
        handleSelect(displayItems[selectedIndex])
      } else if (e.key === "Escape") {
        onCancel?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIndex, displayItems, onCancel])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && scrollAreaRef.current) {
      const selectedElement = scrollAreaRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      selectedElement?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
  }, [selectedIndex])

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
          autoFocus
        />
        {localSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => handleSearchChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Buscando diagnósticos...</span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Results List */}
      {!isLoading && !error && (
        <ScrollArea className="h-[300px] rounded-md border" ref={scrollAreaRef}>
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground opacity-50 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {localSearch.trim()
                  ? "No se encontraron diagnósticos"
                  : "No hay diagnósticos disponibles"}
              </p>
              {localSearch.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  Intente con otros términos de búsqueda
                </p>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {displayItems.map((item, index) => (
                <button
                  key={item.idDiagnosisCatalog}
                  data-index={index}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    selectedIndex === index && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{item.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.code}
                        </Badge>
                      </div>
                      {showDescription && item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {selectedIndex === index && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Footer Info */}
      {!isLoading && !error && displayItems.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {displayItems.length} {displayItems.length === 1 ? "diagnóstico" : "diagnósticos"}
          {localSearch.trim() && ` encontrado${displayItems.length === 1 ? "" : "s"}`}
          {" • "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
            ↑↓
          </kbd>{" "}
          navegar{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
            Enter
          </kbd>{" "}
          seleccionar{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded">
            Esc
          </kbd>{" "}
          cancelar
        </div>
      )}
    </div>
  )
}

