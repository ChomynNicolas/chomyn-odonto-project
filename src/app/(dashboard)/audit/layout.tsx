import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canAccessGlobalAuditLog } from "@/lib/audit/rbac"

/**
 * Layout for audit page with RBAC protection
 * Only ADMIN users can access the global audit log page
 */
export default async function AuditLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/signin")
  }

  const role = (session.user.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
  
  // Check if user has permission to access global audit log
  if (!canAccessGlobalAuditLog(role)) {
    redirect("/")
  }

  return <>{children}</>
}

