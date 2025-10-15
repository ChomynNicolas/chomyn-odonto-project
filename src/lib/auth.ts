import { auth } from "@/app/api/auth/[...nextauth]/route"

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}
