"use client"

import { ReactNode, useMemo } from "react"
import { useSidebar } from "@/context/SidebarContext"
import AppSidebar from "@/layout/AppSidebar"
import Backdrop from "@/layout/Backdrop"
import AppHeader from "@/layout/AppHeader"

type UserRole = "ADMIN" | "ODONT" | "RECEP"

export default function ClientDashboardShell({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar()

  const mainContentMargin = useMemo(() => {
    if (isMobileOpen) return "ml-0"
    return isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
  }, [isExpanded, isHovered, isMobileOpen])

  return (
    <div className="min-h-screen flex">
      <AppSidebar role={role} />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  )
}
