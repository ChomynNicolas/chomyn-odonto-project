// src/hooks/useAnamnesisConfig.ts
// Hook to load and manage anamnesis configuration

import { useState, useEffect } from "react"
import { AnamnesisConfigValue } from "@/app/api/pacientes/[id]/anamnesis/_schemas"

interface AnamnesisConfig {
  MANDATORY_FIRST_CONSULTATION: boolean
  ALLOW_EDIT_SUBSEQUENT: "FULL" | "PARTIAL" | "LOCKED"
  EDITABLE_SECTIONS?: string[]
}

const defaultConfig: AnamnesisConfig = {
  MANDATORY_FIRST_CONSULTATION: true,
  ALLOW_EDIT_SUBSEQUENT: "FULL",
  EDITABLE_SECTIONS: [],
}

export function useAnamnesisConfig() {
  const [config, setConfig] = useState<AnamnesisConfig>(defaultConfig)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    
    // Set a timeout to ensure we don't wait forever
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn("Anamnesis config load timeout, using defaults")
        setIsLoading(false)
      }
    }, 5000) // 5 second timeout
    
    fetch("/api/anamnesis/config")
      .then((res) => {
        if (cancelled) return null
        
        clearTimeout(timeoutId)
        
        if (!res.ok) {
          console.warn("Failed to load anamnesis config, using defaults")
          setIsLoading(false)
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        
        clearTimeout(timeoutId)
        
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          // Find the main config entry (usually keyed as "MAIN" or similar)
          const mainConfig = data.data.find((c: { key: string; value?: AnamnesisConfig }) => c.key === "MAIN") || data.data[0]
          if (mainConfig?.value) {
            setConfig({
              MANDATORY_FIRST_CONSULTATION: mainConfig.value.MANDATORY_FIRST_CONSULTATION ?? defaultConfig.MANDATORY_FIRST_CONSULTATION,
              ALLOW_EDIT_SUBSEQUENT: mainConfig.value.ALLOW_EDIT_SUBSEQUENT ?? defaultConfig.ALLOW_EDIT_SUBSEQUENT,
              EDITABLE_SECTIONS: mainConfig.value.EDITABLE_SECTIONS ?? defaultConfig.EDITABLE_SECTIONS,
            })
          }
        }
        setIsLoading(false)
      })
      .catch((error) => {
        if (cancelled) return
        
        clearTimeout(timeoutId)
        console.error("Error loading anamnesis config:", error)
        setIsLoading(false)
      })
    
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [])

  return { config, isLoading }
}

