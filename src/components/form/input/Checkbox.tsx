"use client"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export default function Checkbox({ checked, onChange, disabled, className }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-4 w-4 items-center justify-center rounded border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  )
}
