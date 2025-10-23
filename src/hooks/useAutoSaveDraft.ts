// src/components/pacientes/useAutosaveDraft.ts
"use client"

import { useEffect, useRef } from "react"

export function useAutosaveDraft<T>({
  key,
  value,
  delay = 800,
  enabled = true,
}: { key: string; value: T; delay?: number; enabled?: boolean }) {
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {}
    }, delay)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [key, value, delay, enabled])
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
