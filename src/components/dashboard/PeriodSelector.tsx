"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, ChevronDown } from "lucide-react"
import type { PeriodPreset } from "@/lib/kpis/period-utils"

interface PeriodOption {
  value: PeriodPreset
  label: string
  description: string
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "today", label: "Hoy", description: "Solo el día actual" },
  { value: "last7days", label: "Últimos 7 días", description: "Semana actual" },
  { value: "last30days", label: "Últimos 30 días", description: "Último mes" },
  { value: "currentMonth", label: "Mes Actual", description: "Del 1 al último día del mes" },
  { value: "lastMonth", label: "Mes Anterior", description: "Mes completo anterior" },
  { value: "last3Months", label: "Últimos 3 Meses", description: "Trimestre actual" },
]

export default function PeriodSelector({ currentPeriod }: { currentPeriod: PeriodPreset }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

  const currentOption = PERIOD_OPTIONS.find((opt) => opt.value === currentPeriod) || PERIOD_OPTIONS[3]

  function handlePeriodChange(period: PeriodPreset) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("period", period)
    router.push(`/?${params.toString()}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border hover:bg-accent transition-colors"
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{currentOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-2 right-0 z-20 w-64 rounded-lg border border-border bg-card shadow-lg p-2">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">
              Seleccionar Período
            </div>
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  currentPeriod === option.value
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className={`text-xs mt-0.5 ${currentPeriod === option.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

