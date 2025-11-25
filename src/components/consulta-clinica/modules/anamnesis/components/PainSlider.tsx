// Pain intensity slider with visual indicators

"use client"

import { useState, useEffect } from "react"
import { Slider } from "@/components/ui/slider"
import { FormDescription } from "@/components/ui/form"

interface PainSliderProps {
  value: number | null | undefined
  onChange: (value: number | null) => void
  disabled?: boolean
}

const painEmojis = ["😊", "🙂", "😐", "😟", "😣", "😖", "😫", "😰", "😭", "😱"]
const painLabels = [
  "Sin dolor",
  "Muy leve",
  "Leve",
  "Moderado",
  "Molesto",
  "Fuerte",
  "Muy fuerte",
  "Intenso",
  "Muy intenso",
  "Insoportable",
]

export function PainSlider({ value, onChange, disabled }: PainSliderProps) {
  const [localValue, setLocalValue] = useState<number>(value || 5)

  useEffect(() => {
    if (value !== null && value !== undefined) {
      setLocalValue(value)
    }
  }, [value])

  const handleChange = (newValue: number[]) => {
    const val = newValue[0]
    setLocalValue(val)
    onChange(val)
  }

  const emojiIndex = Math.max(0, Math.min(9, localValue - 1))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-4xl">{painEmojis[emojiIndex]}</div>
        <div className="text-right">
          <div className="text-3xl font-bold text-foreground">{localValue}</div>
          <div className="text-xs text-muted-foreground">de 10</div>
        </div>
      </div>

      <Slider
        value={[localValue]}
        onValueChange={handleChange}
        min={1}
        max={10}
        step={1}
        disabled={disabled}
        className="py-4"
      />

      <FormDescription className="text-center font-medium">{painLabels[emojiIndex]}</FormDescription>
    </div>
  )
}
