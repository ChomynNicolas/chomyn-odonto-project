import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ConsultoriosLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  
  const role = session.user.role
  // Note: Parent (config) layout already checks for ADMIN, but consultorios
  // should also be accessible to RECEP and ODONT. However, since we're in the
  // (config) route group which is ADMIN-only, we'll keep the ADMIN check here.
  // If RECEP/ODONT need access, they should access consultorios from the main dashboard.
  // For now, this layout just passes through since parent already checked for ADMIN.
  if (!role || role !== "ADMIN") {
    redirect("/")
  }

  return <>{children}</>
}

