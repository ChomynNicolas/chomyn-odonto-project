"use client"
import { useRouter, useSearchParams } from "next/navigation"
import type { DashboardTab } from "@/lib/user-prefs"
import type { Rol } from "@/lib/rbac"
import { Activity, BarChart3, DollarSign, Calendar } from "lucide-react"
import { useState, useEffect, useRef } from "react"

const TABS: Array<{
  id: DashboardTab
  label: string
  icon: typeof Activity
  description: string
}> = [
  {
    id: "hoy",
    label: "Hoy",
    icon: Calendar,
    description: "Vista diaria",
  },
  {
    id: "clinico",
    label: "Clínico",
    icon: Activity,
    description: "Métricas clínicas",
  },
  {
    id: "gestion",
    label: "Gestión",
    icon: BarChart3,
    description: "Operaciones",
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: DollarSign,
    description: "Ingresos",
  },
]

export default function TabSwitcher({ role: _role, currentTab }: { role: Rol; currentTab: DashboardTab }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const tabsRef = useRef<Map<DashboardTab, HTMLButtonElement>>(new Map())

  useEffect(() => {
    const activeButton = tabsRef.current.get(currentTab)
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      })
    }
  }, [currentTab])

  function setTab(tab: DashboardTab) {
    const qs = new URLSearchParams(sp.toString())
    qs.set("tab", tab)
    document.cookie = `chomyn.dashboard.tab=${tab}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.replace(`/?${qs.toString()}`)
  }

  return (
    <nav
      aria-label="Contexto de dashboard"
      className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm"
    >
      <div className="px-6 py-4">
        {/* Header section with title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sistema de gestión clínica integral</p>
          </div>

          {/* Optional: Status indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Sistema operativo</span>
          </div>
        </div>

        <div className="relative">
          {/* Sliding background indicator */}
          <div
            className="absolute bottom-0 h-0.5 bg-gradient-to-r from-primary via-chart-1 to-primary rounded-full transition-all duration-300 ease-out"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />

          {/* Tabs container */}
          <div className="relative flex items-stretch gap-1 p-1 rounded-xl bg-muted/30">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabsRef.current.set(tab.id, el)
                  }}
                  onClick={() => setTab(tab.id)}
                  className={`
                    group relative flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg
                    transition-all duration-300 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${
                      isActive
                        ? "bg-background shadow-lg shadow-primary/10 scale-[1.02]"
                        : "hover:bg-background/50 hover:scale-[1.01]"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Glow effect for active tab */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 via-chart-1/5 to-primary/5 animate-pulse" />
                  )}

                  {/* Icon and label container */}
                  <div className="relative flex items-center gap-2">
                    <div
                      className={`
                        p-2 rounded-lg transition-all duration-300
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col items-start">
                      <span
                        className={`
                          text-sm font-semibold transition-colors duration-300
                          ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}
                        `}
                      >
                        {tab.label}
                      </span>
                      <span
                        className={`
                          text-xs transition-all duration-300
                          ${
                            isActive
                              ? "text-muted-foreground opacity-100"
                              : "text-muted-foreground/60 opacity-0 group-hover:opacity-100"
                          }
                        `}
                      >
                        {tab.description}
                      </span>
                    </div>
                  </div>

                  {/* Active indicator dot (mobile) */}
                  {isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary md:hidden animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="md:hidden mt-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = currentTab === tab.id

              return (
                <button
                  key={`mobile-${tab.id}`}
                  onClick={() => setTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                    transition-all duration-300 ease-out
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg scale-105"
                        : "bg-card text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
