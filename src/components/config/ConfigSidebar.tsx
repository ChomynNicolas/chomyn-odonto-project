"use client"

import React, { useCallback, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight, Menu, X } from "lucide-react"
import { configNavigation, type ConfigNavGroup } from "@/lib/config/navigation"

export default function ConfigSidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(configNavigation.map((g) => g.id))
  )

  const isActive = useCallback(
    (path: string) => {
      if (path === "/configuracion") return pathname === "/configuracion"
      return pathname === path || pathname.startsWith(path + "/")
    },
    [pathname]
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isMobileOpen])

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-md"
        aria-label="Toggle configuration menu"
        aria-expanded={isMobileOpen}
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          flex flex-col z-40
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        aria-label="Configuration navigation"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Volver al Dashboard</span>
          </Link>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configuración del Sistema
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Configuration sections">
          <div className="space-y-1">
            {configNavigation.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                isActive={isActive}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => toggleGroup(group.id)}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}

function NavGroup({
  group,
  isActive,
  isExpanded,
  onToggle,
}: {
  group: ConfigNavGroup
  isActive: (path: string) => boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onToggle()
          }
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded"
        aria-expanded={isExpanded}
        aria-controls={`nav-group-${group.id}`}
      >
        <span>{group.label}</span>
        {isExpanded ? (
          <ChevronDown size={14} className="transition-transform" />
        ) : (
          <ChevronRight size={14} className="transition-transform" />
        )}
      </button>
      <div
        id={`nav-group-${group.id}`}
        className={`overflow-hidden transition-all duration-200 ${
          isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <ul className="space-y-1 pl-2">
          {group.items.map((item) => {
            const active = isActive(item.path)
            return (
              <li key={item.id}>
                <Link
                  href={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                    ${
                      active
                        ? "bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={active ? "text-teal-600 dark:text-teal-400" : "text-gray-500 dark:text-gray-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

