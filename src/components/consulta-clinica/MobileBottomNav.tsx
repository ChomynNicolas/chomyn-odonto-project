"use client"

import { FileText, Activity, ClipboardList, Pill, ImageIcon, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { ModuleId } from "./ConsultaClinicaWorkspace"

interface ModuleCounts {
  diagnosticos: number
  procedimientos: number
  medicacion: number
  adjuntos: number
}

interface MobileBottomNavProps {
  activeModule: ModuleId
  onModuleChange: (moduleId: ModuleId) => void
  moduleCounts: ModuleCounts
  canEdit: boolean
}

interface NavItem {
  id: ModuleId
  label: string
  shortLabel: string
  icon: typeof FileText
}

const primaryNavItems: NavItem[] = [
  { id: "anamnesis", label: "Anamnesis", shortLabel: "HC", icon: FileText },
  { id: "odontograma", label: "Odontograma", shortLabel: "Odont", icon: Activity },
  { id: "diagnosticos", label: "Diagnósticos", shortLabel: "Dx", icon: ClipboardList },
  { id: "procedimientos", label: "Procedimientos", shortLabel: "Proc", icon: Activity },
]

const secondaryNavItems: NavItem[] = [
  { id: "plan-tratamiento", label: "Plan de Tratamiento", shortLabel: "Plan", icon: ClipboardList },
  { id: "medicacion", label: "Medicación", shortLabel: "Med", icon: Pill },
  { id: "adjuntos", label: "Adjuntos", shortLabel: "Adj", icon: ImageIcon },
]

export function MobileBottomNav({ activeModule, onModuleChange, moduleCounts, canEdit }: MobileBottomNavProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const getCount = (moduleId: ModuleId): number | undefined => {
    if (moduleId in moduleCounts) {
      return moduleCounts[moduleId as keyof ModuleCounts]
    }
    return undefined
  }

  const isSecondaryActive = secondaryNavItems.some((item) => item.id === activeModule)

  const handleModuleSelect = (moduleId: ModuleId) => {
    onModuleChange(moduleId)
    setIsMoreOpen(false)
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-bottom"
      role="navigation"
      aria-label="Navegación principal móvil"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeModule === item.id
          const count = getCount(item.id)

          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-[60px] relative",
                "transition-colors",
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">{item.shortLabel}</span>

              {count !== undefined && count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          )
        })}

        {/* More Menu */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg min-w-[60px] relative",
                "transition-colors",
                isSecondaryActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              aria-label="Más opciones"
              aria-expanded={isMoreOpen}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">Más</span>

              {isSecondaryActive && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />}
            </button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-auto max-h-[50vh]">
            <SheetHeader className="pb-4">
              <SheetTitle>Más módulos</SheetTitle>
            </SheetHeader>

            <div className="grid gap-2">
              {secondaryNavItems.map((item) => {
                // Filter out plan-tratamiento if user can't edit
                if (item.id === "plan-tratamiento" && !canEdit) return null

                const Icon = item.icon
                const isActive = activeModule === item.id
                const count = getCount(item.id)

                return (
                  <button
                    key={item.id}
                    onClick={() => handleModuleSelect(item.id)}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-lg text-left",
                      "transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "hover:bg-accent",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                        {count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
