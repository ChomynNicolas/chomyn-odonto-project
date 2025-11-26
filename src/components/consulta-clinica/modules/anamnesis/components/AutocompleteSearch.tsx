// src/components/consulta-clinica/modules/anamnesis/components/AutocompleteSearch.tsx
// Reusable autocomplete search component for catalog/patient record search

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Loader2, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchResult {
  id: number | string
  label: string
  description?: string
  metadata?: Record<string, unknown>
}

interface AutocompleteSearchProps {
  items: SearchResult[]
  onSelect: (item: SearchResult) => void
  onCustomEntry?: (query: string) => void
  placeholder?: string
  searchFn?: (query: string) => Promise<SearchResult[]>
  isLoading?: boolean
  disabled?: boolean
  emptyMessage?: string
  showCustomOption?: boolean
  customOptionLabel?: string
  className?: string
  triggerClassName?: string
}

export function AutocompleteSearch({
  items,
  onSelect,
  onCustomEntry,
  placeholder = "Buscar...",
  searchFn,
  isLoading = false,
  disabled = false,
  emptyMessage = "No se encontraron resultados",
  showCustomOption = true,
  customOptionLabel = "Agregar como entrada personalizada",
  className,
  triggerClassName,
}: AutocompleteSearchProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredItems, setFilteredItems] = useState<SearchResult[]>(items)
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadRef = useRef(false) // Track if initial load has been done

  // Filter local items when search query changes (only if not using external searchFn)
  useEffect(() => {
    // Skip local filtering if using external search function
    if (searchFn) return

    if (!searchQuery.trim()) {
      setFilteredItems(items)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
    )
    setFilteredItems(filtered)
  }, [items, searchQuery, searchFn])

  // Handle external search function with debouncing
  const handleSearch = useCallback(
    async (query: string) => {
      if (!searchFn) return

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await searchFn(query)
          setFilteredItems(results)
        } catch (error) {
          console.error("Search error:", error)
        } finally {
          setIsSearching(false)
        }
      }, 300) // 300ms debounce
    },
    [searchFn]
  )

  // Reset initial load flag when popover closes
  useEffect(() => {
    if (!open) {
      initialLoadRef.current = false
      setSearchQuery("")
    }
  }, [open])

  // Load initial results when popover opens (only once when it opens)
  useEffect(() => {
    if (open && searchFn && !initialLoadRef.current) {
      initialLoadRef.current = true
      // Load initial results when popover opens (empty query)
      // Use a small delay to ensure popover is fully rendered
      const timer = setTimeout(() => {
        if (searchFn) {
          searchFn("").then((results) => {
            setFilteredItems(results)
          }).catch((error) => {
            console.error("Search error:", error)
          })
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [open, searchFn]) // Only depend on open and searchFn to prevent loops

  // Handle search when query changes (but not on initial open)
  useEffect(() => {
    if (!searchFn || !open) return

    // Skip if this is the initial load (handled by the other useEffect)
    if (!initialLoadRef.current) return

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Search with current query (empty string is valid for initial load)
    handleSearch(searchQuery)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchFn, handleSearch, open])

  const handleSelect = (item: SearchResult) => {
    onSelect(item)
    setOpen(false)
    setSearchQuery("")
  }

  const handleCustomEntry = () => {
    if (onCustomEntry && searchQuery.trim()) {
      onCustomEntry(searchQuery.trim())
      setOpen(false)
      setSearchQuery("")
    }
  }

  // When using searchFn, always use filteredItems (from external search)
  // When not using searchFn, use filteredItems (from local filtering)
  const displayItems = filteredItems

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start", triggerClassName)}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[400px] p-0", className)} align="start">
        <Command shouldFilter={searchFn ? false : undefined}>
          <CommandInput
            placeholder={placeholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
            aria-label="Buscar"
          />
          <CommandList>
            {(isLoading || isSearching) && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
              </div>
            )}
            {!isLoading && !isSearching && displayItems.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {!isLoading && !isSearching && displayItems.length > 0 && (
              <CommandGroup>
                {displayItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground">{item.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCustomOption && onCustomEntry && searchQuery.trim() && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCustomEntry}
                  className="cursor-pointer text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {customOptionLabel}: &quot;{searchQuery}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

