// src/components/consulta-clinica/modules/diagnosticos/hooks/useDiagnosisCatalog.ts
/**
 * Custom hook for diagnosis catalog management
 * Handles fetching, caching, and searching diagnosis catalog items
 */

import { useState, useEffect, useCallback, useRef } from "react"
import * as diagnosisCatalogService from "../services/diagnosisCatalogService"
import type { DiagnosisCatalogItem } from "@/app/api/diagnosis-catalog/_schemas"

interface UseDiagnosisCatalogOptions {
  autoLoad?: boolean // Auto-load catalog on mount
  initialSearch?: string // Initial search query
  debounceMs?: number // Debounce delay for search
}

interface UseDiagnosisCatalogReturn {
  items: DiagnosisCatalogItem[]
  isLoading: boolean
  error: string | null
  search: (query: string) => Promise<void>
  clearSearch: () => void
  refetch: () => Promise<void>
  searchQuery: string
  hasMore: boolean
  loadMore: () => Promise<void>
}

/**
 * Hook for managing diagnosis catalog state and operations
 */
export function useDiagnosisCatalog(
  options: UseDiagnosisCatalogOptions = {}
): UseDiagnosisCatalogReturn {
  const { autoLoad = true, initialSearch = "", debounceMs = 300 } = options

  const [items, setItems] = useState<DiagnosisCatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Load catalog items
  const loadItems = useCallback(
    async (query: string = "", page: number = 1, append: boolean = false) => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await diagnosisCatalogService.fetchDiagnosisCatalog({
          search: query || undefined,
          isActive: "true",
          page,
          limit: 50,
          sortBy: "name",
          sortOrder: "asc",
        })

        if (append) {
          setItems((prev) => [...prev, ...result.data])
        } else {
          setItems(result.data)
        }

        setHasMore(result.meta.hasNext)
        setCurrentPage(page)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al cargar catálogo"
        setError(errorMessage)
        console.error("[useDiagnosisCatalog] Error loading catalog:", err)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Debounced search function
  const search = useCallback(
    (query: string) => {
      setSearchQuery(query)

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new timer
      return new Promise<void>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          await loadItems(query, 1, false)
          debounceTimerRef.current = null
          resolve()
        }, debounceMs)
      })
    },
    [debounceMs, loadItems]
  )

  // Clear search and reload all active items
  const clearSearch = useCallback(() => {
    setSearchQuery("")
    loadItems("", 1, false)
  }, [loadItems])

  // Refetch current items
  const refetch = useCallback(() => {
    return loadItems(searchQuery, 1, false)
  }, [searchQuery, loadItems])

  // Load more items (pagination)
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return Promise.resolve()
    return loadItems(searchQuery, currentPage + 1, true)
  }, [hasMore, isLoading, searchQuery, currentPage, loadItems])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadItems(initialSearch, 1, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    items,
    isLoading,
    error,
    search,
    clearSearch,
    refetch,
    searchQuery,
    hasMore,
    loadMore,
  }
}

