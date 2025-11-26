"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { configNavigation, DEFAULT_CONFIG_ROUTE } from "@/lib/config/navigation"

export default function ConfigHeader() {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav
      className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {index === 0 ? (
                <Link
                  href={crumb.path}
                  className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  aria-label="Inicio"
                >
                  <Home size={16} />
                </Link>
              ) : (
                <>
                  <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
                  {isLast ? (
                    <span className="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.path}
                      className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): Array<{ label: string; path: string }> {
  const breadcrumbs: Array<{ label: string; path: string }> = [
    { label: "Configuración", path: DEFAULT_CONFIG_ROUTE },
  ]

  if (pathname === "/configuracion" || pathname === DEFAULT_CONFIG_ROUTE) {
    return breadcrumbs
  }

  // Find the matching nav item
  for (const group of configNavigation) {
    for (const item of group.items) {
      if (pathname === item.path || pathname.startsWith(item.path + "/")) {
        breadcrumbs.push({ label: item.label, path: item.path })
        
        // If it's a nested route (e.g., /configuracion/profesionales/[id])
        const pathParts = pathname.split("/").filter(Boolean)
        if (pathParts.length > 2) {
          const lastPart = pathParts[pathParts.length - 1]
          // Don't add numeric IDs to breadcrumbs, but could add specific labels if needed
          if (lastPart !== "nuevo" && !/^\d+$/.test(lastPart)) {
            breadcrumbs.push({
              label: lastPart.charAt(0).toUpperCase() + lastPart.slice(1),
              path: pathname,
            })
          } else if (lastPart === "nuevo") {
            breadcrumbs.push({ label: "Nuevo", path: pathname })
          }
        }
        break
      }
    }
  }

  return breadcrumbs
}

