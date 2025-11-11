"use client"

import { useEffect, useRef } from "react"

interface InfiniteScrollTriggerProps {
  onIntersect: () => void
  disabled?: boolean
  rootMargin?: string
}

/**
 * Component that triggers infinite scroll when it comes into view
 * Uses IntersectionObserver API for efficient scroll detection
 */
export function InfiniteScrollTrigger({
  onIntersect,
  disabled = false,
  rootMargin = "400px",
}: InfiniteScrollTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger || disabled) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !disabled) {
          onIntersect()
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      },
    )

    observer.observe(trigger)

    return () => {
      observer.disconnect()
    }
  }, [onIntersect, disabled, rootMargin])

  return <div ref={triggerRef} className="h-1 w-full" aria-hidden="true" />
}

