"use client"

import { useEffect, useCallback } from "react"
import type { ModuleId } from "@/components/consulta-clinica/ConsultaClinicaWorkspace"

interface UseKeyboardShortcutsProps {
  onModuleChange: (moduleId: ModuleId) => void
  onSave?: () => void
  onFinalize?: () => void
  isEnabled?: boolean
}

const moduleKeys: Record<string, ModuleId> = {
  "1": "anamnesis",
  "2": "odontograma",
  "3": "diagnosticos",
  "4": "procedimientos",
  "5": "plan-tratamiento",
  "6": "medicacion",
  "7": "adjuntos",
}

export function useKeyboardShortcuts({
  onModuleChange,
  onSave,
  onFinalize,
  isEnabled = true,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isEnabled) return

      // Ignore if user is typing in an input
      const target = event.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return
      }

      // Alt + number for module navigation
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const moduleId = moduleKeys[event.key]
        if (moduleId) {
          event.preventDefault()
          onModuleChange(moduleId)
        }
      }

      // Ctrl/Cmd + S for save
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault()
        onSave?.()
      }

      // Ctrl/Cmd + Shift + F for finalize (with confirmation)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "f") {
        event.preventDefault()
        onFinalize?.()
      }
    },
    [isEnabled, onModuleChange, onSave, onFinalize],
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
