import { auth } from "@/auth"
import AppSidebar from "@/layout/AppSidebar"

export default async function SidebarServer() {
  const session = await auth()
  const role = (session?.user as any)?.role ?? "RECEP"
  return <AppSidebar role={role} />
}
