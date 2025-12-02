// src/components/consulta-clinica/modules/anamnesis/hooks/useUnsavedChanges.ts
// Custom hook to warn users about unsaved changes when navigating away

"use client"

import { useEffect, useCallback, useState } from "react"

interface UseUnsavedChangesOptions {
  /** Whether the form has unsaved changes (typically from formState.isDirty) */
  isDirty: boolean
  /** Custom warning message (optional) */
  warningMessage?: string
  /** Whether to show the warning (can be used to temporarily disable) */
  enabled?: boolean
}

interface UseUnsavedChangesReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Manually set whether there are unsaved changes (useful for arrays/complex state) */
  setHasUnsavedChanges: (value: boolean) => void
  /** Reset the unsaved changes state */
  resetUnsavedChanges: () => void
  /** Confirm navigation with a callback (useful for programmatic navigation) */
  confirmNavigation: (onConfirm: () => void) => void
}

const DEFAULT_WARNING_MESSAGE =
  "Tiene cambios sin guardar. ¿Está seguro que desea salir? Los cambios se perderán."

export function useUnsavedChanges({
  isDirty,
  warningMessage = DEFAULT_WARNING_MESSAGE,
  enabled = true,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [manualDirty, setManualDirty] = useState(false)
  

  // Combined dirty state
  const hasUnsavedChanges = enabled && (isDirty || manualDirty)

  // Handle browser navigation (back button, refresh, close tab)
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Modern browsers require returnValue to be set
      event.returnValue = warningMessage
      return warningMessage
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasUnsavedChanges, warningMessage])

  // Handle Next.js router navigation
  // Note: Next.js App Router doesn't have router.events like Pages Router
  // We use a combination of beforeunload and manual confirmation for critical actions
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Intercept link clicks within the app
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest("a")
      
      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href)
        const currentUrl = new URL(window.location.href)
        
        // Only intercept internal navigation (same origin, different path)
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          const confirmed = window.confirm(warningMessage)
          if (!confirmed) {
            event.preventDefault()
            event.stopPropagation()
          }
        }
      }
    }

    // Use capture phase to intercept before the link is followed
    document.addEventListener("click", handleLinkClick, true)

    return () => {
      document.removeEventListener("click", handleLinkClick, true)
    }
  }, [hasUnsavedChanges, warningMessage])

  // Manual control for unsaved changes
  const setHasUnsavedChanges = useCallback((value: boolean) => {
    setManualDirty(value)
  }, [])

  // Reset unsaved changes
  const resetUnsavedChanges = useCallback(() => {
    setManualDirty(false)
  }, [])

  // Confirm navigation programmatically
  const confirmNavigation = useCallback(
    (onConfirm: () => void) => {
      if (hasUnsavedChanges) {
        const confirmed = window.confirm(warningMessage)
        if (confirmed) {
          setManualDirty(false)
          onConfirm()
        }
      } else {
        onConfirm()
      }
    },
    [hasUnsavedChanges, warningMessage]
  )

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    resetUnsavedChanges,
    confirmNavigation,
  }
}

