import { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/signin")
  if ((session.user).role !== "ADMIN") redirect("/")

  return <>{children}</>
}
