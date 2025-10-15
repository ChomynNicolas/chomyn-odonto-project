import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ClientDashboardShell from "@/components/layout/ClientDashboardShell"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")

  const role = (session.user)?.role ?? "RECEP"

  // Pasa solo datos serializables al cliente (p. ej., role)
  return <ClientDashboardShell role={role}>{children}</ClientDashboardShell>
}
