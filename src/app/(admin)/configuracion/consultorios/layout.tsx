import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ConsultoriosLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  
  const role = session.user.role
  // Allow ADMIN, RECEP, and ODONT to access consultorios (read-only for RECEP/ODONT)
  if (!role || !["ADMIN", "RECEP", "ODONT"].includes(role)) {
    redirect("/")
  }

  return <>{children}</>
}

