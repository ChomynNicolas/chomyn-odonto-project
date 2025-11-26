import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ConfigLayout from "@/components/config/ConfigLayout"

export default async function ConfigRouteLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  if (session.user.role !== "ADMIN") redirect("/")

  return <ConfigLayout>{children}</ConfigLayout>
}

