// src/components/pacientes/ficha/components/TimestampDisplay.tsx
"use client"

import { formatDate, formatRelativeTime } from "@/lib/utils/patient-helpers"

interface TimestampDisplayProps {
  timestamp: string
  label?: string
  showRelative?: boolean
  className?: string
}

export function TimestampDisplay({ timestamp, label, showRelative = false, className = "" }: TimestampDisplayProps) {
  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      {label && <span className="font-semibold">{label}: </span>}
      <span>{formatDate(timestamp)}</span>
      {showRelative && (
        <span className="ml-2 text-muted-foreground/70">
          ({formatRelativeTime(timestamp)})
        </span>
      )}
    </div>
  )
}

