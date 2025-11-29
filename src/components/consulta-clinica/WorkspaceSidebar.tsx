"use client"

import {
  FileText,
  Activity,
  ClipboardList,
  Pill,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ModuleId } from "./ConsultaClinicaWorkspace"

interface ModuleCounts {
  diagnosticos: number
  procedimientos: number
  medicacion: number
  adjuntos: number
}

interface ModuleStatus {
  anamnesis: "empty" | "complete" | "required"
  odontograma: "empty" | "complete" | "required"
  diagnosticos: "empty" | "complete" | "required"
  procedimientos: "empty" | "complete" | "required"
  medicacion: "empty" | "complete" | "required"
  "plan-tratamiento": "empty" | "complete" | "required"
  adjuntos: "empty" | "complete" | "required"
}

interface WorkspaceSidebarProps {
  activeModule: ModuleId
  onModuleChange: (moduleId: ModuleId) => void
  moduleCounts: ModuleCounts
  moduleStatus: ModuleStatus
  isCollapsed: boolean
  onToggleCollapse: () => void
  canEdit: boolean
  isFinalized: boolean
}

interface ModuleConfig {
  id: ModuleId
  label: string
  shortLabel: string
  icon: typeof FileText
  category: "historia" | "diagnostico" | "soporte"
}

const modules: ModuleConfig[] = [
  // Historia Clínica
  { id: "anamnesis", label: "Anamnesis", shortLabel: "HC", icon: FileText, category: "historia" },
  { id: "odontograma", label: "Odontograma", shortLabel: "Odont", icon: Activity, category: "historia" },
  // Diagnóstico y Tratamiento
  { id: "diagnosticos", label: "Diagnósticos", shortLabel: "Dx", icon: ClipboardList, category: "diagnostico" },
  { id: "procedimientos", label: "Procedimientos", shortLabel: "Proc", icon: Activity, category: "diagnostico" },
  {
    id: "plan-tratamiento",
    label: "Plan de Tratamiento",
    shortLabel: "Plan",
    icon: ClipboardList,
    category: "diagnostico",
  },
  // Soporte
  { id: "medicacion", label: "Medicación", shortLabel: "Med", icon: Pill, category: "soporte" },
  { id: "adjuntos", label: "Adjuntos", shortLabel: "Adj", icon: ImageIcon, category: "soporte" },
]

const categoryLabels = {
  historia: "Historia Clínica",
  diagnostico: "Diagnóstico y Tratamiento",
  soporte: "Soporte",
}

export function WorkspaceSidebar({
  activeModule,
  onModuleChange,
  moduleCounts,
  moduleStatus,
  isCollapsed,
  onToggleCollapse,
  canEdit,
  isFinalized,
}: WorkspaceSidebarProps) {
  const getStatusIcon = (status: "empty" | "complete" | "required") => {
    switch (status) {
      case "complete":
        return <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
      case "required":
        return <Circle className="h-3 w-3 text-destructive fill-destructive" />
      default:
        return <Circle className="h-3 w-3 text-muted-foreground/50" />
    }
  }

  const getModuleCount = (moduleId: ModuleId): number | undefined => {
    if (moduleId in moduleCounts) {
      return moduleCounts[moduleId as keyof ModuleCounts]
    }
    return undefined
  }

  const getShortcutKey = (moduleId: ModuleId): string => {
    const shortcuts: Record<ModuleId, string> = {
      anamnesis: "1",
      odontograma: "2",
      diagnosticos: "3",
      procedimientos: "4",
      "plan-tratamiento": "5",
      medicacion: "6",
      adjuntos: "7",
    }
    return shortcuts[moduleId]
  }

  // Group modules by category
  const groupedModules = modules.reduce(
    (acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = []
      }
      acc[module.category].push(module)
      return acc
    },
    {} as Record<string, ModuleConfig[]>,
  )

  return (
    <TooltipProvider>
      <aside
        id="workspace-nav"
        className={cn("bg-sidebar border-r flex flex-col transition-all duration-200", isCollapsed ? "w-16" : "w-64")}
        role="navigation"
        aria-label="Módulos de consulta"
      >
        {/* Collapse Toggle */}
        <div className="flex justify-end p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
            aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {Object.entries(groupedModules).map(([category, categoryModules]) => (
            <div key={category} className="mb-4" role="group" aria-labelledby={`category-${category}`}>
              {/* Category Header */}
              {!isCollapsed && (
                <h3
                  id={`category-${category}`}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
              )}

              {/* Module Items */}
              <ul className="space-y-1 px-2" role="list">
                {categoryModules.map((module) => {
                  const isActive = activeModule === module.id
                  const status = moduleStatus[module.id]
                  const count = getModuleCount(module.id)
                  const Icon = module.icon
                  const shortcutKey = getShortcutKey(module.id)

                  const buttonContent = (
                    <button
                      onClick={() => onModuleChange(module.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
                        isCollapsed && "justify-center px-2",
                      )}
                      aria-current={isActive ? "page" : undefined}
                      aria-keyshortcuts={`Alt+${shortcutKey}`}
                    >
                      {/* Status Indicator */}
                      {!isCollapsed && (
                        <span className="flex-shrink-0" aria-hidden="true">
                          {isFinalized ? <Lock className="h-3 w-3 text-muted-foreground" /> : getStatusIcon(status)}
                        </span>
                      )}

                      {/* Icon */}
                      <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-6 w-6")} aria-hidden="true" />

                      {/* Label and Count */}
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{module.label}</span>
                          <kbd className="hidden xl:inline-block text-xs text-muted-foreground bg-muted px-1 rounded">
                            {shortcutKey}
                          </kbd>
                          {count !== undefined && count > 0 && (
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-xs ml-1"
                              aria-label={`${count} registros`}
                            >
                              {count}
                            </Badge>
                          )}
                        </>
                      )}

                      {/* Collapsed Count Badge */}
                      {isCollapsed && count !== undefined && count > 0 && (
                        <span
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center"
                          aria-label={`${count} registros`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  )

                  // Wrap in tooltip when collapsed
                  if (isCollapsed) {
                    return (
                      <li key={module.id} className="relative">
                        <Tooltip>
                          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                          <TooltipContent side="right" className="flex items-center gap-2">
                            <span>{module.label}</span>
                            <kbd className="text-xs bg-muted px-1 rounded">Alt+{shortcutKey}</kbd>
                            {count !== undefined && count > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {count}
                              </Badge>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    )
                  }

                  return <li key={module.id}>{buttonContent}</li>
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Keyboard Shortcuts Hint - Updated */}
        {!isCollapsed && (
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Alt</kbd>
              {" + "}
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">1-7</kbd>
              {" navegar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd>
              {" + "}
              <kbd className="px-1 py-0.5 bg-muted rounded text-xs">S</kbd>
              {" guardar"}
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
