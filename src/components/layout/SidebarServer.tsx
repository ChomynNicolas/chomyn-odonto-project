import { auth } from "@/auth"
import AppSidebar from "@/layout/AppSidebar"

export default async function SidebarServer() {
  const session = await auth()
  const role = (session?.user?.role ?? "RECEP") as "ADMIN" | "ODONT" | "RECEP"
  return <AppSidebar role={role} />
}
